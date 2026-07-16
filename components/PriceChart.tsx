"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  LineStyle,
  SeriesMarker,
  Time,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import { getMarketHistory } from "@/lib/data/markets";
import { fmt, fmtCompact } from "@/lib/format";
import { TKey, useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";

interface ApiCandle {
  t: number; // bucket start (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // Fan$ traded
}

type ChartMode = "line" | "candles";
type PriceSeries = ISeriesApi<"Candlestick"> | ISeriesApi<"Area">;

const CHART_MODE_KEY = "bias-market-chart-mode";

// ── 시간 간격 (정리된 6개) ─────────────────────────────
const TIMEFRAMES: { labelKey: TKey; minutes: number }[] = [
  { labelKey: "tf.1m", minutes: 1 },
  { labelKey: "tf.5m", minutes: 5 },
  { labelKey: "tf.15m", minutes: 15 },
  { labelKey: "tf.1h", minutes: 60 },
  { labelKey: "tf.1d", minutes: 1440 },
  { labelKey: "tf.7d", minutes: 10080 },
];

const POLL_MS = 10_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function tooltipTime(ms: number, minutes: number): string {
  const d = new Date(ms);
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (minutes >= 1440) return date;
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PriceChart({
  groupId,
  price,
}: {
  groupId: string;
  price: number;
}) {
  const { state } = useStore();
  const { t } = useLang();
  const [tf, setTf] = useState(3); // default 1시간
  const [demo, setDemo] = useState(false);
  // 차트 표시 모드 — 기본은 선 차트, 선택은 localStorage에 저장
  const [mode, setMode] = useState<ChartMode>("line");
  const tRef = useRef(t);
  tRef.current = t;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<PriceSeries | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const avgLineRef = useRef<IPriceLine | null>(null);
  const dataMapRef = useRef<Map<number, ApiCandle>>(new Map());
  const lastCandlesRef = useRef<ApiCandle[]>([]);
  const fitRef = useRef(true);
  const modeRef = useRef<ChartMode>(mode);
  modeRef.current = mode;
  // 라인/시리즈 재생성 시 가격선·평균선 effect를 다시 돌리기 위한 버전
  const [seriesVersion, setSeriesVersion] = useState(0);

  // 저장된 차트 모드 복원 (마운트 후 — SSR 불일치 방지)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CHART_MODE_KEY);
      if (saved === "line" || saved === "candles") setMode(saved);
    } catch {
      // ignore
    }
  }, []);

  const pickMode = (m: ChartMode) => {
    setMode(m);
    try {
      window.localStorage.setItem(CHART_MODE_KEY, m);
    } catch {
      // ignore
    }
  };

  // 최신 유저 거래를 load 클로저에서 안전하게 읽기 위한 ref
  const tradesRef = useRef(state.trades);
  tradesRef.current = state.trades;

  const holding = state.holdings[groupId];
  const avgBuyPrice =
    holding && holding.shares > 0 ? holding.cost / holding.shares : null;

  const tzOffSec = new Date().getTimezoneOffset() * 60;
  const toTime = useCallback(
    (ms: number) => (Math.floor(ms / 1000) - tzOffSec) as UTCTimestamp,
    [tzOffSec]
  );

  // ── 가격 시리즈 생성 (모드별) ─────────────────────────
  const createPriceSeries = useCallback(
    (chart: IChartApi, m: ChartMode): PriceSeries => {
      const precise = price < 5;
      const priceFormat = {
        type: "price" as const,
        precision: precise ? 4 : 2,
        minMove: precise ? 0.0001 : 0.01,
      };
      if (m === "candles") {
        return chart.addCandlestickSeries({
          upColor: "#0ea06c",
          downColor: "#e5484d",
          borderUpColor: "#0ea06c",
          borderDownColor: "#e5484d",
          wickUpColor: "#0ea06c",
          wickDownColor: "#e5484d",
          lastValueVisible: false,
          priceLineVisible: false,
          priceFormat,
        });
      }
      // 선 차트: 약간 두꺼운 선 + 아래로 아주 옅은 그라데이션
      return chart.addAreaSeries({
        lineColor: "#7c3aed",
        lineWidth: 2,
        topColor: "rgba(124, 58, 246, 0.14)",
        bottomColor: "rgba(124, 58, 246, 0)",
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerRadius: 4,
        priceFormat,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupId]
  );

  // ── 데이터 → 시리즈 반영 (모드별 변환 + 마커) ──────────
  const applyData = useCallback(
    (candles: ApiCandle[]) => {
      const series = priceSeriesRef.current;
      const volume = volumeRef.current;
      if (!series || !volume) return;

      if (modeRef.current === "candles") {
        (series as ISeriesApi<"Candlestick">).setData(
          candles.map((c) => ({
            time: toTime(c.t),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );
      } else {
        // 선 차트: 각 캔들의 종가(close)만 사용
        (series as ISeriesApi<"Area">).setData(
          candles.map((c) => ({ time: toTime(c.t), value: c.close }))
        );
      }

      volume.setData(
        candles.map((c) => ({
          time: toTime(c.t),
          value: c.volume,
          color:
            c.close >= c.open ? "rgba(14,160,108,0.35)" : "rgba(229,72,77,0.35)",
        }))
      );

      // 매수/매도 마커 — 내 거래를 캔들 버킷에 스냅
      const minutes = TIMEFRAMES[tf].minutes;
      const bucketMs = minutes * 60_000;
      const rangeStart = candles[0]?.t ?? 0;
      const rangeEnd = (candles[candles.length - 1]?.t ?? 0) + bucketMs;
      const markers: SeriesMarker<Time>[] = tradesRef.current
        .filter((tr) => tr.groupId === groupId)
        .map((tr) => ({ ...tr, ms: new Date(tr.time).getTime() }))
        .filter((tr) => tr.ms >= rangeStart && tr.ms < rangeEnd)
        .slice(0, 60)
        .map((tr) => ({
          time: toTime(Math.floor(tr.ms / bucketMs) * bucketMs),
          position: tr.side === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
          color: tr.side === "buy" ? "#0ea06c" : "#e5484d",
          shape: tr.side === "buy" ? ("arrowUp" as const) : ("arrowDown" as const),
          text: tr.side === "buy" ? tRef.current("buy") : tRef.current("sell"),
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));
      series.setMarkers(markers);
    },
    [groupId, tf, toTime]
  );

  // ── 차트 생성 (그룹당 1회) — 차트 설정은 여기 ──────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontSize: 11,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "#f3f4f6" },
        horzLines: { color: "#f3f4f6" },
      },
      rightPriceScale: { borderColor: "#e5e7eb" },
      timeScale: {
        borderColor: "#e5e7eb",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "#c7cdd6", labelBackgroundColor: "#111827" },
        horzLine: { color: "#c7cdd6", labelBackgroundColor: "#111827" },
      },
    });

    const series = createPriceSeries(chart, modeRef.current);

    const volume = chart.addHistogramSeries({
      priceScaleId: "",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    priceSeriesRef.current = series;
    volumeRef.current = volume;
    priceLineRef.current = null;
    avgLineRef.current = null;
    fitRef.current = true;
    setSeriesVersion((v) => v + 1);

    const onCrosshair = (param: {
      time?: unknown;
      point?: { x: number; y: number };
    }) => {
      const tooltip = tooltipRef.current;
      const wrap = wrapRef.current;
      if (!tooltip || !wrap) return;
      const time = typeof param.time === "number" ? param.time : null;
      const c = time !== null ? dataMapRef.current.get(time) : undefined;
      if (!c || !param.point) {
        tooltip.style.display = "none";
        return;
      }
      const up = c.close >= c.open;
      const tt = tRef.current;
      tooltip.innerHTML = `
        <p style="font-weight:700;color:#374151;margin-bottom:4px">${tooltipTime(c.t, TIMEFRAMES[tfRef.current].minutes)}</p>
        <p><span style="color:#9ca3af">${tt("chart.open")}</span> <b>${fmt(c.open)}</b></p>
        <p><span style="color:#9ca3af">${tt("chart.high")}</span> <b style="color:#0ea06c">${fmt(c.high)}</b></p>
        <p><span style="color:#9ca3af">${tt("chart.low")}</span> <b style="color:#e5484d">${fmt(c.low)}</b></p>
        <p><span style="color:#9ca3af">${tt("chart.close")}</span> <b style="color:${up ? "#0ea06c" : "#e5484d"}">${fmt(c.close)}</b></p>
        <p><span style="color:#9ca3af">${tt("chart.volume")}</span> <b>${fmtCompact(c.volume)} Fan$</b></p>`;
      tooltip.style.display = "block";
      const wrapW = wrap.clientWidth;
      const ttW = tooltip.offsetWidth || 130;
      let left = param.point.x + 16;
      if (left + ttW > wrapW - 8) left = param.point.x - ttW - 16;
      tooltip.style.left = `${Math.max(4, left)}px`;
      tooltip.style.top = "8px";
    };
    chart.subscribeCrosshairMove(onCrosshair);

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshair);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      volumeRef.current = null;
      priceLineRef.current = null;
      avgLineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const tfRef = useRef(tf);
  tfRef.current = tf;

  // ── 모드 전환: 데이터 재요청 없이 시리즈만 교체 ─────────
  useEffect(() => {
    const chart = chartRef.current;
    const old = priceSeriesRef.current;
    if (!chart || !old) return;

    // 보고 있던 시간 범위 보존
    const range = chart.timeScale().getVisibleLogicalRange();

    priceLineRef.current = null;
    avgLineRef.current = null;
    chart.removeSeries(old);
    priceSeriesRef.current = createPriceSeries(chart, mode);
    applyData(lastCandlesRef.current);
    if (range) chart.timeScale().setVisibleLogicalRange(range);
    setSeriesVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── OHLCV 데이터 로드 ────────────────────────────────
  const load = useCallback(async () => {
    try {
      const minutes = TIMEFRAMES[tf].minutes;
      const data = await getMarketHistory(groupId, minutes);
      if (!Array.isArray(data.candles) || !priceSeriesRef.current) return;

      const apiCandles = data.candles as ApiCandle[];
      lastCandlesRef.current = apiCandles;
      dataMapRef.current = new Map(
        apiCandles.map((c) => [toTime(c.t) as number, c])
      );

      applyData(apiCandles);
      setDemo(!!data.demo);

      if (fitRef.current) {
        chartRef.current?.timeScale().fitContent();
        fitRef.current = false;
      }
    } catch {
      // keep last data on network hiccups
    }
  }, [groupId, tf, toTime, applyData]);

  useEffect(() => {
    fitRef.current = true;
    load();
  }, [load]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, state.trades.length]);

  useEffect(() => {
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // ── 현재가 라인 (항상 최신 가격 반영) ─────────────────
  useEffect(() => {
    const s = priceSeriesRef.current;
    if (!s) return;
    if (priceLineRef.current) s.removePriceLine(priceLineRef.current);
    priceLineRef.current = s.createPriceLine({
      price,
      color: "#0ea06c",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: t("chart.currentLine"),
    });
  }, [price, groupId, tf, t, seriesVersion]);

  // ── 평균 매입가 라인 (보유 중일 때만) ─────────────────
  useEffect(() => {
    const s = priceSeriesRef.current;
    if (!s) return;
    if (avgLineRef.current) {
      s.removePriceLine(avgLineRef.current);
      avgLineRef.current = null;
    }
    if (avgBuyPrice !== null) {
      avgLineRef.current = s.createPriceLine({
        price: avgBuyPrice,
        color: "#8b5cf6",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: t("chart.avgLine", { n: fmt(avgBuyPrice) }),
      });
    }
  }, [avgBuyPrice, groupId, tf, t, seriesVersion]);

  return (
    <div>
      {/* Interval tabs + mode toggle + indicators */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TIMEFRAMES.map((tfItem, i) => (
            <button
              key={tfItem.labelKey}
              onClick={() => setTf(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tf === i
                  ? "bg-violet-600 text-white"
                  : "text-gray-500 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {t(tfItem.labelKey)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* 차트 모드 토글 */}
          <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => pickMode("line")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === "line"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t("chart.line")}
            </button>
            <button
              onClick={() => pickMode("candles")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                mode === "candles"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t("chart.candles")}
            </button>
          </div>
          {demo && (
            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-semibold text-gray-400">
              {t("chart.demo")}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
            </span>
            {t("chart.live")}
          </span>
        </div>
      </div>

      {/* Chart + custom tooltip */}
      <div ref={wrapRef} className="relative">
        <div ref={containerRef} className="w-full" style={{ height: 320 }} />
        <div
          ref={tooltipRef}
          className="absolute z-10 hidden pointer-events-none rounded-lg border border-gray-200 bg-white/95 shadow-lg px-3 py-2 text-[11px] leading-relaxed"
          style={{ display: "none", minWidth: 120 }}
        />
      </div>

      <p className="text-[10px] text-gray-300 text-right mt-1">
        {t("chart.note")}{" "}
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-400"
        >
          TradingView
        </a>{" "}
        Lightweight Charts™
      </p>
    </div>
  );
}
