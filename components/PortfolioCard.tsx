"use client";

import { useEffect } from "react";
import Emblem from "./Emblem";
import { spotPrice } from "@/lib/amm";
import { changeColor, fmt, fmtInt, fmtPct, fmtShares } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { GROUP_MAP } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function PortfolioCard({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { state, portfolioValue, totalCost, totalPnl, level, missionEvent, loggedIn } =
    useStore();
  const { t } = useLang();

  // 미션 진행: 포트폴리오 확인 (서버가 하루 1회만 인정)
  useEffect(() => {
    if (loggedIn) missionEvent("portfolio_viewed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);
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
          <p className="text-xs text-gray-500">{t("side.fanBalance")}</p>
          <p className="text-2xl font-extrabold mt-1">Fan$ {fmt(state.balance, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
          <p className="text-xs text-gray-500">{t("pf.totalValue")}</p>
          <p className="text-2xl font-extrabold mt-1">Fan$ {fmt(portfolioValue, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
          <p className="text-xs text-gray-500">{t("pf.totalPnl")}</p>
          <p className={`text-2xl font-extrabold mt-1 ${changeColor(totalPnl)}`}>
            {totalPnl >= 0 ? "+" : ""}
            {fmt(totalPnl, 0)}
            <span className="text-sm font-semibold ml-1.5">({fmtPct(pnlPct)})</span>
          </p>
        </div>
      </div>

      {/* Holdings table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
        <h3 className="text-base font-bold p-5 pb-2">{t("pf.holdings")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left font-medium py-3 px-5">{t("col.group")}</th>
                <th className="text-right font-medium py-3 px-2">{t("pf.colShares")}</th>
                <th className="text-right font-medium py-3 px-2">{t("pf.colAvg")}</th>
                <th className="text-right font-medium py-3 px-2">{t("col.price")}</th>
                <th className="text-right font-medium py-3 px-2">{t("pf.colValue")}</th>
                <th className="text-right font-medium py-3 px-5">{t("pf.colPnl")}</th>
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <p className="text-4xl mb-2">📈</p>
                    <p className="text-sm text-gray-500">{t("pf.empty")}</p>
                    <button
                      onClick={() => onSelect("bts")}
                      className="mt-3 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
                    >
                      {t("pf.emptyCta")}
                    </button>
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
          <p className="text-xs text-gray-500">{t("pf.myReturn")}</p>
          <p className={`text-2xl font-extrabold mt-1 ${changeColor(pnlPct)}`}>
            {fmtPct(pnlPct)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {t("pf.returnSub", { n: Math.max(1, Math.min(99, Math.round(50 - pnlPct))) })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
          <p className="text-xs text-gray-500">{t("pf.influence")}</p>
          <p className="text-2xl font-extrabold mt-1">{t("pf.pts", { n: fmtInt(influence) })}</p>
          <p className="text-[11px] text-gray-400 mt-1">
            {t("pf.influenceSub", { n: level })}
          </p>
        </div>
      </div>
    </div>
  );
}
