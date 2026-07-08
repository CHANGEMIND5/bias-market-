"use client";

import Emblem from "./Emblem";
import { spotPrice } from "@/lib/amm";
import { changeColor, fmt, fmtInt, fmtPct, fmtShares } from "@/lib/format";
import { GROUP_MAP } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function PortfolioCard({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { state, portfolioValue, totalCost, totalPnl, level } = useStore();
  const pnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const influence = state.xp * 13 + Math.round(portfolioValue / 10);

  const holdings = Object.entries(state.holdings)
    .filter(([, h]) => h.shares > 0)
    .map(([gid, h]) => {
      const g = GROUP_MAP[gid];
      const price = spotPrice(state.markets[gid]);
      const value = h.shares * price;
      const avg = h.cost / h.shares;
      const pnl = value - h.cost;
      return { g, h, price, value, avg, pnl, pnlPct: h.cost > 0 ? (pnl / h.cost) * 100 : 0 };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
          <p className="text-xs text-gray-500">보유 Fan$</p>
          <p className="text-2xl font-extrabold mt-1">Fan$ {fmt(state.balance, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
          <p className="text-xs text-gray-500">총 포트폴리오 가치</p>
          <p className="text-2xl font-extrabold mt-1">Fan$ {fmt(portfolioValue, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
          <p className="text-xs text-gray-500">총 손익</p>
          <p className={`text-2xl font-extrabold mt-1 ${changeColor(totalPnl)}`}>
            {totalPnl >= 0 ? "+" : ""}
            {fmt(totalPnl, 0)}
            <span className="text-sm font-semibold ml-1.5">({fmtPct(pnlPct)})</span>
          </p>
        </div>
      </div>

      {/* Holdings table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
        <h3 className="text-base font-bold p-5 pb-2">보유 Fan Shares</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left font-medium py-3 px-5">그룹</th>
                <th className="text-right font-medium py-3 px-2">보유 수량 (FS)</th>
                <th className="text-right font-medium py-3 px-2">평균 매수가</th>
                <th className="text-right font-medium py-3 px-2">현재 가격</th>
                <th className="text-right font-medium py-3 px-2">평가 가치</th>
                <th className="text-right font-medium py-3 px-5">손익률</th>
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    아직 보유한 Fan Shares가 없어요. 전체 마켓에서 최애 그룹을 매수해 보세요!
                  </td>
                </tr>
              )}
              {holdings.map((r) => (
                <tr
                  key={r.g.id}
                  onClick={() => onSelect(r.g.id)}
                  className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Emblem group={r.g} size={28} />
                      <span className="font-semibold">{r.g.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3.5 text-right">{fmtShares(r.h.shares)}</td>
                  <td className="px-2 py-3.5 text-right">Fan$ {fmt(r.avg)}</td>
                  <td className="px-2 py-3.5 text-right">Fan$ {fmt(r.price)}</td>
                  <td className="px-2 py-3.5 text-right font-semibold">Fan$ {fmt(r.value)}</td>
                  <td className={`px-5 py-3.5 text-right font-semibold ${changeColor(r.pnl)}`}>
                    {fmtPct(r.pnlPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ranking */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
          <p className="text-xs text-gray-500">내 포트폴리오 수익률</p>
          <p className={`text-2xl font-extrabold mt-1 ${changeColor(pnlPct)}`}>
            {fmtPct(pnlPct)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            전체 팬 트레이더 중 상위 {Math.max(1, Math.min(99, Math.round(50 - pnlPct)))}% (모의 랭킹)
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
          <p className="text-xs text-gray-500">내 팬덤 영향력 점수</p>
          <p className="text-2xl font-extrabold mt-1">{fmtInt(influence)} 점</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Lv.{level} · 거래 활동과 보유 자산으로 계산됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
