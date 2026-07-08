"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fmt } from "@/lib/format";

interface Candle {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

const POLL_MS = 10_000; // 10초마다 실시간 갱신

const W = 800;
const H = 260;
const VOL_H = 56;
const PAD_R = 56;
const PAD_T = 10;
const COUNT = 60;

function timeLabel(t: number, minutes: number): string {
  const d = new Date(t);
  if (minutes >= 1440) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function PriceChart({
  groupId,
  price,
}: {
  groupId: string;
  price: number;
}) {
  const [tf, setTf] = useState(5); // default 1시간
  const [candles, setCandles] = useState<Candle[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/history?groupId=${encodeURIComponent(groupId)}&minutes=${TIMEFRAMES[tf].minutes}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.candles)) setCandles(data.candles);
    } catch {
      // keep last data on network hiccups
    }
  }, [groupId, tf]);

  // Load on group/timeframe change, refresh every POLL_MS,
  // and immediately when the live price moves (e.g. my own trade).
  useEffect(() => {
    setCandles(null);
    load();
  }, [load]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price]);

  useEffect(() => {
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const view = useMemo(() => {
    if (!candles || candles.length === 0) return null;
    let mn = Infinity;
    let mx = -Infinity;
    let mv = 0;
    for (const c of candles) {
      if (c.low < mn) mn = c.low;
      if (c.high > mx) mx = c.high;
      if (c.volume > mv) mv = c.volume;
    }
    const pad = (mx - mn) * 0.08 || mx * 0.02 || 0.02;
    return { min: mn - pad, max: mx + pad, maxVol: mv };
  }, [candles]);

  const chartH = H - VOL_H - PAD_T - 8;
  const slot = (W - PAD_R) / COUNT;
  const cw = Math.max(2, slot * 0.55);

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
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
          </span>
          실시간
        </span>
      </div>

      {!candles || !view ? (
        <div
          className="w-full grid place-items-center text-xs text-gray-400"
          style={{ aspectRatio: `${W} / ${H}` }}
        >
          차트 불러오는 중...
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="실시간 가격 차트"
        >
          {(() => {
            const { min, max, maxVol } = view;
            const y = (v: number) => PAD_T + ((max - v) / (max - min)) * chartH;
            const gridLines = 4;
            const grid = Array.from(
              { length: gridLines + 1 },
              (_, i) => min + ((max - min) * i) / gridLines
            );
            return (
              <>
                {/* Grid + price labels */}
                {grid.map((v, i) => (
                  <g key={`g${i}`}>
                    <line
                      x1={0} x2={W - PAD_R} y1={y(v)} y2={y(v)}
                      stroke="#f3f4f6" strokeWidth={1}
                    />
                    <text x={W - PAD_R + 6} y={y(v) + 3.5} fontSize={10} fill="#9ca3af">
                      {fmt(v)}
                    </text>
                  </g>
                ))}

                {/* X-axis time labels */}
                {candles.map((c, i) =>
                  i % 15 === 7 ? (
                    <text
                      key={`x${i}`}
                      x={i * slot + slot / 2}
                      y={H - VOL_H - 0}
                      fontSize={9}
                      fill="#c0c5cd"
                      textAnchor="middle"
                    >
                      {timeLabel(c.t, TIMEFRAMES[tf].minutes)}
                    </text>
                  ) : null
                )}

                {/* Current price dashed line */}
                <line
                  x1={0} x2={W - PAD_R} y1={y(price)} y2={y(price)}
                  stroke="#0ea06c" strokeWidth={1} strokeDasharray="4 3"
                />
                <rect x={W - PAD_R + 2} y={y(price) - 9} width={PAD_R - 4} height={18} rx={4} fill="#0ea06c" />
                <text
                  x={W - PAD_R + (PAD_R - 2) / 2} y={y(price) + 3.5}
                  fontSize={10} fill="#fff" textAnchor="middle" fontWeight={600}
                >
                  {fmt(price)}
                </text>

                {/* Candles */}
                {candles.map((c, i) => {
                  const cx = i * slot + slot / 2;
                  const up = c.close >= c.open;
                  const flat = c.close === c.open && c.high === c.low;
                  const color = flat ? "#c8cdd5" : up ? "#0ea06c" : "#e5484d";
                  const bodyTop = y(Math.max(c.open, c.close));
                  const bodyH = Math.max(1, Math.abs(y(c.open) - y(c.close)));
                  return (
                    <g key={`c${i}`}>
                      <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
                      <rect x={cx - cw / 2} y={bodyTop} width={cw} height={bodyH} fill={color} rx={0.5} />
                    </g>
                  );
                })}

                {/* Volume bars (real traded Fan$) */}
                {maxVol > 0 &&
                  candles.map((c, i) => {
                    if (c.volume <= 0) return null;
                    const cx = i * slot + slot / 2;
                    const up = c.close >= c.open;
                    const vh = (c.volume / maxVol) * (VOL_H - 8);
                    return (
                      <rect
                        key={`v${i}`}
                        x={cx - cw / 2}
                        y={H - vh}
                        width={cw}
                        height={vh}
                        fill={up ? "#0ea06c" : "#e5484d"}
                        opacity={0.28}
                      />
                    );
                  })}
              </>
            );
          })()}
        </svg>
      )}
      <p className="text-[10px] text-gray-300 text-right mt-1">
        실제 거래 기록 기반 · 10초마다 자동 갱신
      </p>
    </div>
  );
}
