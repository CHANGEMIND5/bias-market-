"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";

interface ApiCandle {
  t: number; // bucket start (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // Fan$ traded
}

const TIMEFRAMES = [
  { label: "1분", minutes: 1 },
  { label: "3분", minutes: 3 },
  { label: "5분", minutes: 5 },
  { label: "15분", minutes: 15 },
  { label: "30분", minutes: 30 },
  { label: "1시간", minutes: 60 },
  { label: "4시간", minutes: 240 },
  { label: "일봉", minutes: 1440 },
];

const POLL_MS = 10_000;

export default function PriceChart({
  groupId,
  price,
}: {
  groupId: string;
  price: number;
}) {
  const [tf, setTf] = useState(5); // default 1시간
  const [demo, setDemo] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const fitRef = useRef(true);

  // Create the chart once per group
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
        attributionLogo: true, // keep TradingView attribution visible
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
      crosshair: { mode: CrosshairMode.Normal },
    });

    const precise = price < 5;
    const candles = chart.addCandlestickSeries({
      upColor: "#0ea06c",
      downColor: "#e5484d",
      borderUpColor: "#0ea06c",
      borderDownColor: "#e5484d",
      wickUpColor: "#0ea06c",
      wickDownColor: "#e5484d",
      priceFormat: {
        type: "price",
        precision: precise ? 4 : 2,
        minMove: precise ? 0.0001 : 0.01,
      },
    });

    const volume = chart.addHistogramSeries({
      priceScaleId: "",
      priceFormat: { type: "volume" },
    });
    chart.priceScale("").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleRef.current = candles;
    volumeRef.current = volume;
    fitRef.current = true;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/history?groupId=${encodeURIComponent(groupId)}&minutes=${TIMEFRAMES[tf].minutes}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.candles) || !candleRef.current || !volumeRef.current) return;

      // shift to local time so axis labels show KST
      const tzOffSec = new Date().getTimezoneOffset() * 60;
      const candles = (data.candles as ApiCandle[]).map((c) => ({
        time: (Math.floor(c.t / 1000) - tzOffSec) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      const volumes = (data.candles as ApiCandle[]).map((c) => ({
        time: (Math.floor(c.t / 1000) - tzOffSec) as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "rgba(14,160,108,0.35)" : "rgba(229,72,77,0.35)",
      }));

      candleRef.current.setData(candles);
      volumeRef.current.setData(volumes);
      setDemo(!!data.demo);

      if (fitRef.current) {
        chartRef.current?.timeScale().fitContent();
        fitRef.current = false;
      }
    } catch {
      // keep last data on network hiccups
    }
  }, [groupId, tf]);

  // Load on group/timeframe change + refit
  useEffect(() => {
    fitRef.current = true;
    load();
  }, [load]);

  // Refresh instantly when the live price moves (e.g. my own trade)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price]);

  // Poll for other fans' trades
  useEffect(() => {
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      {/* Timeframe tabs + live indicator */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TIMEFRAMES.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTf(i)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                tf === i
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-100"
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

      <div ref={containerRef} className="w-full" style={{ height: 320 }} />

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
