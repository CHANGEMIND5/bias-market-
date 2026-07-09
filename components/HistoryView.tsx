"use client";

import Emblem from "./Emblem";
import { fmt, fmtShares } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { GROUP_MAP } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function HistoryView() {
  const { state } = useStore();
  const { t, lang } = useLang();
  const locale = lang === "ko" ? "ko-KR" : lang === "es" ? "es-ES" : "en-US";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
      <div className="p-5 pb-2">
        <h2 className="text-lg font-bold">{t("his.title")}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t("his.sub")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left font-medium py-3 px-5">{t("trades.time")}</th>
              <th className="text-left font-medium py-3 px-2">{t("col.group")}</th>
              <th className="text-left font-medium py-3 px-2">{t("trades.side")}</th>
              <th className="text-right font-medium py-3 px-2">{t("trades.price")}</th>
              <th className="text-right font-medium py-3 px-2">{t("trades.shares")}</th>
              <th className="text-right font-medium py-3 px-2">{t("his.fee")}</th>
              <th className="text-right font-medium py-3 px-5">{t("trades.total")}</th>
            </tr>
          </thead>
          <tbody>
            {state.trades.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-400">
                  {t("his.empty")}
                </td>
              </tr>
            )}
            {state.trades.map((tr) => {
              const g = GROUP_MAP[tr.groupId];
              const d = new Date(tr.time);
              return (
                <tr key={tr.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {d.toLocaleString(locale)}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      {g && <Emblem group={g} size={22} />}
                      <span className="font-semibold">{g?.name ?? tr.groupId}</span>
                    </div>
                  </td>
                  <td className={`px-2 py-3 font-semibold ${tr.side === "buy" ? "text-up" : "text-down"}`}>
                    {tr.side === "buy" ? t("buy") : t("sell")}
                  </td>
                  <td className="px-2 py-3 text-right">{fmt(tr.price)}</td>
                  <td className="px-2 py-3 text-right">{fmtShares(tr.shares)}</td>
                  <td className="px-2 py-3 text-right text-gray-500">{fmt(tr.fee)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{fmt(tr.fan)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
