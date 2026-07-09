"use client";

import { useEffect, useMemo } from "react";
import { battleRanking } from "@/lib/battle";
import { computeBadges } from "@/lib/badges";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export default function BadgesCard() {
  const { state, portfolioValue, game, markBadgeEarned } = useStore();
  const { t } = useLang();

  const ranking = useMemo(() => battleRanking(state.markets), [state.markets]);
  const battleTopGroupId = ranking[0]?.groupId ?? null;

  const badges = useMemo(
    () => computeBadges({ state, portfolioValue, battleTopGroupId, game }, t),
    [state, portfolioValue, battleTopGroupId, game, t]
  );

  // 새로 잠금 해제된 뱃지의 획득일 기록 (localStorage)
  useEffect(() => {
    for (const b of badges) {
      if (b.unlocked && !b.earnedDate) markBadgeEarned(b.id);
    }
  }, [badges, markBadgeEarned]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{t("bdg.title")}</h2>
        <span className="text-xs text-gray-400">
          {unlockedCount} / {badges.length}
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">{t("bdg.sub")}</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`rounded-xl border p-3 ${
              b.unlocked
                ? "border-violet-100 bg-violet-50/40"
                : "border-gray-100 bg-gray-50/50"
            }`}
          >
            <p
              className={`text-xl ${b.unlocked ? "" : "grayscale opacity-40"}`}
              aria-hidden
            >
              {b.icon}
            </p>
            <p
              className={`text-xs font-bold mt-1 ${
                b.unlocked ? "" : "text-gray-400"
              }`}
            >
              {b.name}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">
              {b.desc}
            </p>
            {b.unlocked ? (
              <p className="text-[10px] text-violet-500 font-semibold mt-1">
                {t("bdg.earned")}{b.earnedDate ? ` · ${b.earnedDate}` : ""}
              </p>
            ) : (
              <p className="text-[10px] text-gray-400 mt-1">🔒 {b.progress}</p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-gray-300">{t("bdg.notice")}</p>
    </section>
  );
}
