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
import { useStore } from "@/lib/store";

interface ApiCandle {
  t: number; // bucket start (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // Fan$ traded
}

// ── 시간 간격 (정리된 6개) ─────────────────────────────
const TIMEFRAMES = [
  { label: "1분", minutes: 1 },
  { label: "5분", minutes: 5 },
  { label: "15분", minutes: 15 },
  { label: "1시간", minutes: 60 },
  { label: "1일", minutes: 1440 },
  { label: "7일", minutes: 10080 },
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
  const [tf, setTf] = useState(3); // default 1시간
  const [demo, setDemo] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const avgLineRef = useRef<IPriceLine | null>(null);
  const dataMapRef = useRef<Map<number, ApiCandle>>(new Map());
  const fitRef = useRef(true);

  // 최신 유저 거래를 load 클로저에서 안전하게 읽기 위한 ref
  const tradesRef = useRef(state.trades);
  tradesRef.current = state.trades;

  const holding = state.holdings[groupId];
  const avgBuyPrice =
    holding && holding.shares > 0 ? holding.cost / holding.shares : null;

  const tzOffSec = new Date().getTimezoneOffset() * 60;

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
        attributionLogo: true, // TradingView 어트리뷰션 유지
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

    const precise = price < 5;
    const candles = chart.addCandlestickSeries({
      upColor: "#0ea06c",
      downColor: "#e5484d",
      borderUpColor: "#0ea06c",
      borderDownColor: "#e5484d",
      wickUpColor: "#0ea06c",
      wickDownColor: "#e5484d",
      // 현재가 표시는 아래의 커스텀 price line으로만
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: {
        type: "price",
        precision: precise ? 4 : 2,
        minMove: precise ? 0.0001 : 0.01,
      },
    });

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
    candleRef.current = candles;
    volumeRef.current = volume;
    priceLineRef.current = null;
    avgLineRef.current = null;
    fitRef.current = true;

    // ── 크로스헤어 툴팁 ──────────────────────────────
    const onCrosshair = (param: {
      time?: unknown;
      point?: { x: number; y: number };
    }) => {
      const tooltip = tooltipRef.current;
      const wrap = wrapRef.current;
      if (!tooltip || !wrap) return;
      const t = typeof param.time === "number" ? param.time : null;
      const c = t !== null ? dataMapRef.current.get(t) : undefined;
      if (!c || !param.point) {
        tooltip.style.display = "none";
        return;
      }
      const up = c.close >= c.open;
      tooltip.innerHTML = `
        <p style="font-weight:700;color:#374151;margin-bottom:4px">${tooltipTime(c.t, TIMEFRAMES[tfRef.current].minutes)}</p>
        <p><span style="color:#9ca3af">시가</span> <b>${fmt(c.open)}</b></p>
        <p><span style="color:#9ca3af">고가</span> <b style="color:#0ea06c">${fmt(c.high)}</b></p>
        <p><span style="color:#9ca3af">저가</span> <b style="color:#e5484d">${fmt(c.low)}</b></p>
        <p><span style="color:#9ca3af">종가</span> <b style="color:${up ? "#0ea06c" : "#e5484d"}">${fmt(c.close)}</b></p>
        <p><span style="color:#9ca3af">거래량</span> <b>${fmtCompact(c.volume)} Fan$</b></p>`;
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
      candleRef.current = null;
      volumeRef.current = null;
      priceLineRef.current = null;
      avgLineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // 툴팁에서 현재 선택된 간격을 읽기 위한 ref
  const tfRef = useRef(tf);
  tfRef.current = tf;

  // ── OHLCV 데이터 로드 + 매수/매도 마커 ────────────────
  const load = useCallback(async () => {
    try {
      const minutes = TIMEFRAMES[tf].minutes;
      const data = await getMarketHistory(groupId, minutes);
      if (!Array.isArray(data.candles) || !candleRef.current || !volumeRef.current) return;

      const apiCandles = data.candles as ApiCandle[];
      const toTime = (ms: number) =>
        (Math.floor(ms / 1000) - tzOffSec) as UTCTimestamp;

      dataMapRef.current = new Map(
        apiCandles.map((c) => [toTime(c.t) as number, c])
      );

      candleRef.current.setData(
        apiCandles.map((c) => ({
          time: toTime(c.t),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      volumeRef.current.setData(
        apiCandles.map((c) => ({
          time: toTime(c.t),
          value: c.volume,
          color: c.close >= c.open ? "rgba(14,160,108,0.35)" : "rgba(229,72,77,0.35)",
        }))
      );

      // 매수/매도 마커 — 내 거래 내역을 캔들 버킷에 스냅
      const bucketMs = minutes * 60_000;
      const rangeStart = apiCandles[0]?.t ?? 0;
      const rangeEnd = (apiCandles[apiCandles.length - 1]?.t ?? 0) + bucketMs;
      const markers: SeriesMarker<Time>[] = tradesRef.current
        .filter((t) => t.groupId === groupId)
        .map((t) => ({ ...t, ms: new Date(t.time).getTime() }))
        .filter((t) => t.ms >= rangeStart && t.ms < rangeEnd)
        .slice(0, 60)
        .map((t) => ({
          time: toTime(Math.floor(t.ms / bucketMs) * bucketMs),
          position: t.side === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
          color: t.side === "buy" ? "#0ea06c" : "#e5484d",
          shape: t.side === "buy" ? ("arrowUp" as const) : ("arrowDown" as const),
          text: t.side === "buy" ? "매수" : "매도",
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));
      candleRef.current.setMarkers(markers);

      setDemo(!!data.demo);
      if (fitRef.current) {
        chartRef.current?.timeScale().fitContent();
        fitRef.current = false;
      }
    } catch {
      // keep last data on network hiccups
    }
  }, [groupId, tf, tzOffSec]);

  useEffect(() => {
    fitRef.current = true;
    load();
  }, [load]);

  // 내 거래 직후(가격 변동) 즉시 갱신 → 마커/캔들 반영
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
    const s = candleRef.current;
    if (!s) return;
    if (priceLineRef.current) s.removePriceLine(priceLineRef.current);
    priceLineRef.current = s.createPriceLine({
      price,
      color: "#0ea06c",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "현재가",
    });
  }, [price, groupId, tf]);

  // ── 평균 매입가 라인 (보유 중일 때만) ─────────────────
  useEffect(() => {
    const s = candleRef.current;
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
        title: `평균 매입가 ${fmt(avgBuyPrice)}`,
      });
    }
  }, [avgBuyPrice, groupId, tf]);

  return (
    <div>
      {/* Interval tabs + indicators */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TIMEFRAMES.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTf(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tf === i
                  ? "bg-violet-600 text-white"
                  : "text-gray-500 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {demo && (
            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-semibold text-gray-400">
              데모 차트 · 아직 거래 없음
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
            </span>
            실시간
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
        실제 거래 기록 기반 · 10초마다 자동 갱신 · Charts powered by{" "}
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
