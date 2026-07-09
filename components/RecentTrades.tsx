"use client";

import { useCallback, useEffect, useState } from "react";
import { getTrades } from "@/lib/data/trades";
import { fmt, fmtShares } from "@/lib/format";

interface Row {
  id: string;
  side: "buy" | "sell";
  price: number;
  shares: number;
  fan: number;
  time: string; // ISO
  mine: boolean;
}

const POLL_MS = 10_000;

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
  const [mineOnly, setMineOnly] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getTrades(groupId);
      if (Array.isArray(data.trades)) setRows(data.trades);
    } catch {
      // keep last data
    }
  }, [groupId]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  // refresh instantly after my own trade (price prop changes), plus polling
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price]);

  useEffect(() => {
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const visible = (rows ?? []).filter((r) => (mineOnly ? r.mine : true)).slice(0, 10);

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
          {rows === null && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-300">
                불러오는 중...
              </td>
            </tr>
          )}
          {rows !== null && visible.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-400">
                {mineOnly
                  ? "이 종목의 내 거래가 아직 없어요."
                  : "아직 거래가 없어요. 첫 거래의 주인공이 되어보세요!"}
              </td>
            </tr>
          )}
          {visible.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 last:border-0">
              <td className="py-2 text-gray-500">
                {timeLabel(r.time)}
                {r.mine && (
                  <span className="ml-1 text-[9px] text-violet-500 font-semibold">나</span>
                )}
              </td>
              <td className={`py-2 font-semibold ${r.side === "buy" ? "text-up" : "text-down"}`}>
                {r.side === "buy" ? "매수" : "매도"}
              </td>
              <td className="py-2 text-right">{fmt(r.price)}</td>
              <td className="py-2 text-right">{fmtShares(r.shares)}</td>
              <td className="py-2 text-right">{fmt(r.fan)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
