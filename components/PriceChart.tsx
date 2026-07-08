"use client";

import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import { genCandles } from "@/lib/rng";

const TIMEFRAMES = [
  { label: "1분", vol: 0.004 },
  { label: "3분", vol: 0.006 },
  { label: "5분", vol: 0.008 },
  { label: "15분", vol: 0.012 },
  { label: "30분", vol: 0.016 },
  { label: "1시간", vol: 0.02 },
  { label: "4시간", vol: 0.035 },
  { label: "일봉", vol: 0.06 },
];

const W = 800;
const H = 260;
const VOL_H = 56;
const PAD_R = 56;
const PAD_T = 10;
const COUNT = 60;

export default function PriceChart({
  groupId,
  price,
}: {
  groupId: string;
  price: number;
}) {
  const [tf, setTf] = useState(5); // default 1시간

  const candles = useMemo(
    () => genCandles(`${groupId}-${TIMEFRAMES[tf].label}`, COUNT, price, TIMEFRAMES[tf].vol),
    [groupId, tf, price]
  );

  const { min, max, maxVol } = useMemo(() => {
    let mn = Infinity, mx = -Infinity, mv = 0;
    for (const c of candles) {
      mn = Math.min(mn, c.low);
      mx = Math.max(mx, c.high);
      mv = Math.max(mv, c.volume);
    }
    const pad = (mx - mn) * 0.08 || mx * 0.01;
    return { min: mn - pad, max: mx + pad, maxVol: mv };
  }, [candles]);

  const chartH = H - VOL_H - PAD_T - 8;
  const y = (v: number) => PAD_T + ((max - v) / (max - min)) * chartH;
  const slot = (W - PAD_R) / COUNT;
  const cw = Math.max(2, slot * 0.55);

  const gridLines = 4;
  const grid = Array.from({ length: gridLines + 1 }, (_, i) => min + ((max - min) * i) / gridLines);

  return (
    <div>
      {/* Timeframe tabs */}
      <div className="flex items-center gap-1 flex-wrap mb-3">
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

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="가격 차트 (모의 데이터)"
      >
        {/* Grid + price labels */}
        {grid.map((v, i) => (
          <g key={i}>
            <line
              x1={0} x2={W - PAD_R} y1={y(v)} y2={y(v)}
              stroke="#f3f4f6" strokeWidth={1}
            />
            <text
              x={W - PAD_R + 6} y={y(v) + 3.5}
              fontSize={10} fill="#9ca3af"
            >
              {fmt(v)}
            </text>
          </g>
        ))}

        {/* Current price dashed line */}
        <line
          x1={0} x2={W - PAD_R} y1={y(price)} y2={y(price)}
          stroke="#0ea06c" strokeWidth={1} strokeDasharray="4 3"
        />
        <rect x={W - PAD_R + 2} y={y(price) - 9} width={PAD_R - 4} height={18} rx={4} fill="#0ea06c" />
        <text x={W - PAD_R + (PAD_R - 2) / 2} y={y(price) + 3.5} fontSize={10} fill="#fff" textAnchor="middle" fontWeight={600}>
          {fmt(price)}
        </text>

        {/* Candles */}
        {candles.map((c, i) => {
          const cx = i * slot + slot / 2;
          const up = c.close >= c.open;
          const color = up ? "#0ea06c" : "#e5484d";
          const bodyTop = y(Math.max(c.open, c.close));
          const bodyH = Math.max(1, Math.abs(y(c.open) - y(c.close)));
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
              <rect x={cx - cw / 2} y={bodyTop} width={cw} height={bodyH} fill={color} rx={0.5} />
            </g>
          );
        })}

        {/* Volume bars */}
        {candles.map((c, i) => {
          const cx = i * slot + slot / 2;
          const up = c.close >= c.open;
          const vh = (c.volume / maxVol) * (VOL_H - 8);
          return (
            <rect
              key={i}
              x={cx - cw / 2}
              y={H - vh}
              width={cw}
              height={vh}
              fill={up ? "#0ea06c" : "#e5484d"}
              opacity={0.28}
            />
          );
        })}
      </svg>
      <p className="text-[10px] text-gray-300 text-right mt-1">
        차트는 시뮬레이션용 모의 데이터입니다
      </p>
    </div>
  );
}
