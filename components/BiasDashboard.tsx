"use client";

import { useMemo } from "react";
import Emblem from "./Emblem";
import { spotPrice } from "@/lib/amm";
import { battleRanking } from "@/lib/battle";
import { changeColor, fmt, fmtPct, fmtShares } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { GROUP_MAP } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function BiasDashboard({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { state, toggleFavorite } = useStore();
  const { t } = useLang();
  const ranking = useMemo(() => battleRanking(state.markets), [state.markets]);
  const rankMap = useMemo(
    () => new Map(ranking.map((e) => [e.groupId, e])),
    [ranking]
  );
  const topScore = ranking[0]?.score ?? 0;

  const favs = state.favorites.filter((id) => GROUP_MAP[id]);

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <h2 className="text-lg font-bold">{t("dash.title")}</h2>
      <p className="text-sm text-gray-500 mt-0.5">{t("dash.sub")}</p>

      {favs.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-500 font-medium">{t("dash.empty1")}</p>
          <p className="text-xs text-gray-400 mt-1">{t("dash.empty2")}</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {favs.map((id) => {
            const g = GROUP_MAP[id];
            const m = state.markets[id];
            if (!m) return null;
            const price = spotPrice(m);
            const ch24 =
              m.baseline24h > 0
                ? ((price - m.baseline24h) / m.baseline24h) * 100
                : 0;
            const entry = rankMap.get(id);
            const shares = state.holdings[id]?.shares ?? 0;
            const gap = entry ? topScore - entry.score : 0;

            return (
              <div
                key={id}
                onClick={() => onSelect(id)}
                className="rounded-xl border border-gray-100 p-3.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Emblem group={g} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold truncate">{g.name}</p>
                    <span className="text-[11px] text-gray-400">
                      {t("dash.current", { n: entry?.rank ?? "-" })}
                    </span>
                    <span className={`text-[11px] font-semibold ${changeColor(ch24)}`}>
                      24h {fmtPct(ch24)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Fan$ {fmt(price)} ·{" "}
                    {shares > 0
                      ? t("dash.myHolding", { n: fmtShares(shares) })
                      : t("dash.notHolding")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {entry?.rank === 1 ? (
                    <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[11px] font-bold">
                      {t("dash.first")}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[11px] font-semibold text-gray-500">
                      {t("dash.gap", { n: gap.toFixed(1) })}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                      ch24 >= 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-500"
                    }`}
                  >
                    {ch24 >= 0 ? t("dash.rising") : t("dash.falling")}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(id);
                  }}
                  aria-label="관심 해제"
                  className="text-amber-400 hover:text-gray-300 shrink-0"
                >
                  ★
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
