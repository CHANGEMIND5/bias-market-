"use client";

import { useMemo } from "react";
import Emblem from "./Emblem";
import { spotPrice } from "@/lib/amm";
import { battleRanking } from "@/lib/battle";
import { changeColor, fmt, fmtPct, fmtShares } from "@/lib/format";
import { GROUP_MAP } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function BiasDashboard({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { state, toggleFavorite } = useStore();
  const ranking = useMemo(() => battleRanking(state.markets), [state.markets]);
  const rankMap = useMemo(
    () => new Map(ranking.map((e) => [e.groupId, e])),
    [ranking]
  );
  const topScore = ranking[0]?.score ?? 0;

  const favs = state.favorites.filter((id) => GROUP_MAP[id]);

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <h2 className="text-lg font-bold">내 최애 대시보드</h2>
      <p className="text-sm text-gray-500 mt-0.5">
        관심 팬덤을 한 곳에서 모니터링하고 추격하세요!
      </p>

      {favs.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-500 font-medium">아직 관심 팬덤이 없어요.</p>
          <p className="text-xs text-gray-400 mt-1">
            마켓에서 별표(☆)를 눌러 최애 팬덤을 추가해보세요.
          </p>
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
                      현재 #{entry?.rank ?? "-"}
                    </span>
                    <span className={`text-[11px] font-semibold ${changeColor(ch24)}`}>
                      24h {fmtPct(ch24)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Fan$ {fmt(price)} ·{" "}
                    {shares > 0
                      ? `내 보유량 ${fmtShares(shares)} Shares`
                      : "아직 보유하지 않음"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {entry?.rank === 1 ? (
                    <span className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[11px] font-bold">
                      👑 배틀 1위 유지 중
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[11px] font-semibold text-gray-500">
                      1위까지 {gap.toFixed(1)} pts
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                      ch24 >= 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-500"
                    }`}
                  >
                    {ch24 >= 0 ? "상승 중" : "하락 중"}
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
