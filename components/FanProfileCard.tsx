"use client";

import { useMemo } from "react";
import Emblem from "./Emblem";
import { spotPrice } from "@/lib/amm";
import { battleRanking } from "@/lib/battle";
import { computeBadges, fanInfluence, influenceTitle } from "@/lib/badges";
import { fmtInt, fmtShares } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { GROUP_MAP } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function FanProfileCard() {
  const { state, portfolioValue, game } = useStore();
  const { t } = useLang();

  const ranking = useMemo(() => battleRanking(state.markets), [state.markets]);
  const battleTopGroupId = ranking[0]?.groupId ?? null;

  // 대표 팬덤: 보유 가치가 가장 큰 그룹
  const repFandom = useMemo(() => {
    let best: { id: string; value: number } | null = null;
    for (const [gid, h] of Object.entries(state.holdings)) {
      const m = state.markets[gid];
      if (!m || h.shares <= 0) continue;
      const value = h.shares * spotPrice(m);
      if (!best || value > best.value) best = { id: gid, value };
    }
    return best ? GROUP_MAP[best.id] ?? null : null;
  }, [state.holdings, state.markets]);

  const badges = useMemo(
    () => computeBadges({ state, portfolioValue, battleTopGroupId, game }, t),
    [state, portfolioValue, battleTopGroupId, game, t]
  );
  const unlockedBadges = badges.filter((b) => b.unlocked);

  const totalShares = Object.values(state.holdings).reduce(
    (s, h) => s + h.shares,
    0
  );
  // 참여한 배틀: 거래한 날짜 수 기준
  const battleParticipation = new Set(
    state.trades.map((t) => t.time.slice(0, 10))
  ).size;

  const influence = fanInfluence({
    portfolioValue,
    tradeCount: state.trades.length,
    shareCount: game.shareCopies,
    battleParticipation,
    badgeCount: unlockedBadges.length,
  });
  const title = influenceTitle(influence, t);

  const stats: [string, string][] = [
    [t("pf.holdings"), fmtShares(totalShares)],
    [t("prof.trades"), t("prof.times", { n: state.trades.length })],
    [t("prof.battles"), t("prof.times", { n: battleParticipation })],
    [t("prof.shared"), t("prof.times", { n: game.shareCopies })],
  ];

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <h2 className="text-lg font-bold">{t("prof.title")}</h2>

      {/* 대표 팬덤 배너 */}
      {repFandom ? (
        <div
          className="mt-3 rounded-2xl p-4 flex items-center gap-3 text-white"
          style={{
            background: `linear-gradient(135deg, ${repFandom.gradient[0]}, ${repFandom.gradient[1]})`,
          }}
        >
          <Emblem group={repFandom} size={40} />
          <div>
            <p className="text-[11px] text-white/85 drop-shadow">{t("prof.rep")}</p>
            <p className="text-lg font-extrabold drop-shadow">{repFandom.name}</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-gray-200 p-4 text-center">
          <p className="text-sm font-semibold text-gray-500">{t("prof.repNone")}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t("prof.repNoneSub")}</p>
        </div>
      )}

      {/* 영향력 */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-gray-500">{t("prof.influence")}</p>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[11px] font-bold">
            {title}
          </span>
        </div>
        <p className="text-2xl font-extrabold mt-1">{fmtInt(influence)} pts</p>
        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
            style={{ width: `${Math.min(100, (influence / 5000) * 100)}%` }}
          />
        </div>
      </div>

      {/* 활동 통계 */}
      <dl className="mt-4 grid grid-cols-2 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-gray-50 px-3 py-2.5">
            <dt className="text-[11px] text-gray-400">{label}</dt>
            <dd className="text-sm font-bold mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      {/* 보유 뱃지 미리보기 */}
      <div className="mt-4">
        <p className="text-xs text-gray-500 mb-1.5">
          {t("prof.badges", { a: unlockedBadges.length, b: badges.length })}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {unlockedBadges.length === 0 && (
            <span className="text-[11px] text-gray-400">{t("prof.noBadges")}</span>
          )}
          {unlockedBadges.map((b) => (
            <span
              key={b.id}
              title={b.name}
              className="w-8 h-8 grid place-items-center rounded-lg bg-violet-50 border border-violet-100 text-base"
            >
              {b.icon}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
