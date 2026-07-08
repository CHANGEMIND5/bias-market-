"use client";

import { useEffect, useMemo, useState } from "react";
import { fmt, fmtShares } from "@/lib/format";
import { useStore } from "@/lib/store";
import { hashString, mulberry32 } from "@/lib/rng";

interface Row {
  time: string;
  side: "buy" | "sell";
  price: number;
  shares: number;
  total: number;
  mine: boolean;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export default function RecentTrades({
  groupId,
  price,
}: {
  groupId: string;
  price: number;
}) {
  const { state } = useStore();
  const [mineOnly, setMineOnly] = useState(false);
  // Time-based mock rows are generated only after mount so the
  // server-rendered HTML never contains clock-dependent text
  // (prevents React hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Mock market trades (deterministic per group + rounded price)
  const mockRows = useMemo<Row[]>(() => {
    if (!mounted) return [];
    const rand = mulberry32(hashString(`${groupId}-trades-${price.toFixed(1)}`));
    const now = Date.now();
    let t = now - 20_000;
    const rows: Row[] = [];
    for (let i = 0; i < 8; i++) {
      const side: "buy" | "sell" = rand() > 0.45 ? "buy" : "sell";
      const p = price * (1 + (rand() - 0.5) * 0.004);
      const shares = Math.round(10 + rand() * 250);
      rows.push({
        time: timeLabel(new Date(t).toISOString()),
        side, price: p, shares, total: p * shares, mine: false,
      });
      t -= (10 + rand() * 60) * 1000;
    }
    return rows;
  }, [groupId, price, mounted]);

  const myRows = useMemo<Row[]>(
    () =>
      state.trades
        .filter((t) => t.groupId === groupId)
        .slice(0, 20)
        .map((t) => ({
          time: timeLabel(t.time),
          side: t.side,
          price: t.price,
          shares: t.shares,
          total: t.side === "buy" ? t.fan : t.fan,
          mine: true,
        })),
    [state.trades, groupId]
  );

  const rows = mineOnly ? myRows : [...myRows.slice(0, 3), ...mockRows].slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold">최근 거래</h3>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => setMineOnly(false)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              !mineOnly ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setMineOnly(true)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              mineOnly ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            내 거래
          </button>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left font-medium py-2">시간</th>
            <th className="text-left font-medium py-2">구분</th>
            <th className="text-right font-medium py-2">가격 (Fan$)</th>
            <th className="text-right font-medium py-2">수량 (Fan Shares)</th>
            <th className="text-right font-medium py-2">합계 (Fan$)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-400">
                아직 거래 내역이 없어요.
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0">
              <td className="py-2 text-gray-500">
                {r.time}
                {r.mine && <span className="ml-1 text-[9px] text-violet-500 font-semibold">나</span>}
              </td>
              <td className={`py-2 font-semibold ${r.side === "buy" ? "text-up" : "text-down"}`}>
                {r.side === "buy" ? "매수" : "매도"}
              </td>
              <td className="py-2 text-right">{fmt(r.price)}</td>
              <td className="py-2 text-right">{fmtShares(r.shares)}</td>
              <td className="py-2 text-right">{fmt(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
