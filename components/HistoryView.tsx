"use client";

import Emblem from "./Emblem";
import { fmt, fmtShares } from "@/lib/format";
import { GROUP_MAP } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function HistoryView() {
  const { state } = useStore();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
      <div className="p-5 pb-2">
        <h2 className="text-lg font-bold">거래 내역</h2>
        <p className="text-sm text-gray-500 mt-0.5">내가 체결한 모든 Fan Shares 거래입니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left font-medium py-3 px-5">시간</th>
              <th className="text-left font-medium py-3 px-2">그룹</th>
              <th className="text-left font-medium py-3 px-2">구분</th>
              <th className="text-right font-medium py-3 px-2">가격 (Fan$)</th>
              <th className="text-right font-medium py-3 px-2">수량 (Fan Shares)</th>
              <th className="text-right font-medium py-3 px-2">수수료</th>
              <th className="text-right font-medium py-3 px-5">합계 (Fan$)</th>
            </tr>
          </thead>
          <tbody>
            {state.trades.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-400">
                  아직 거래 내역이 없어요.
                </td>
              </tr>
            )}
            {state.trades.map((t) => {
              const g = GROUP_MAP[t.groupId];
              const d = new Date(t.time);
              return (
                <tr key={t.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {d.toLocaleString("ko-KR")}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      {g && <Emblem group={g} size={22} />}
                      <span className="font-semibold">{g?.name ?? t.groupId}</span>
                    </div>
                  </td>
                  <td className={`px-2 py-3 font-semibold ${t.side === "buy" ? "text-up" : "text-down"}`}>
                    {t.side === "buy" ? "매수" : "매도"}
                  </td>
                  <td className="px-2 py-3 text-right">{fmt(t.price)}</td>
                  <td className="px-2 py-3 text-right">{fmtShares(t.shares)}</td>
                  <td className="px-2 py-3 text-right text-gray-500">{fmt(t.fee)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{fmt(t.fan)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
