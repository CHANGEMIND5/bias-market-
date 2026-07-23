"use client";

import { useEffect, useMemo, useState } from "react";
import { battleRanking } from "@/lib/battle";
import { computeBadges } from "@/lib/badges";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export default function BadgesCard() {
  const { state, portfolioValue, game, markBadgeEarned, refCount, rewardStreak } = useStore();
  const { t } = useLang();

  const ranking = useMemo(() => battleRanking(state.markets), [state.markets]);
  const battleTopGroupId = ranking[0]?.groupId ?? null;

  const badges = useMemo(
    () =>
      computeBadges(
        { state, portfolioValue, battleTopGroupId, game, refCount, serverStreak: rewardStreak },
        t
      ),
    [state, portfolioValue, battleTopGroupId, game, refCount, rewardStreak, t]
  );

  // 새로 잠금 해제된 뱃지의 획득일 기록 (localStorage)
  useEffect(() => {
    for (const b of badges) {
      if (b.unlocked && !b.earnedDate) markBadgeEarned(b.id);
    }
  }, [badges, markBadgeEarned]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const [selected, setSelected] = useState<string | null>(null);
  const sel = badges.find((b) => b.id === selected) ?? null;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{t("bdg.title")}</h2>
        <span className="text-xs text-gray-400">
          {unlockedCount} / {badges.length}
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">{t("bdg.sub")}</p>

      {/* 아이콘 진열장 — 탭하면 아래에 상세 표시 */}
      <div className="mt-4 grid grid-cols-4 gap-y-3 gap-x-2">
        {badges.map((b) => {
          const on = selected === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setSelected(on ? null : b.id)}
              className="flex flex-col items-center gap-1.5 text-center group"
            >
              <span
                className={`w-14 h-14 rounded-2xl grid place-items-center text-2xl transition-all ${
                  b.unlocked
                    ? "bg-violet-50 border border-violet-200 group-hover:bg-violet-100"
                    : "bg-gray-50 border border-gray-100 grayscale opacity-40"
                } ${on ? "ring-2 ring-violet-400 ring-offset-1" : ""}`}
                aria-hidden
              >
                {b.icon}
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  b.unlocked ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {b.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* 선택한 뱃지 상세 */}
      {sel && (
        <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
          <div className="flex items-center gap-2">
            <span className={`text-lg ${sel.unlocked ? "" : "grayscale opacity-50"}`}>{sel.icon}</span>
            <p className="text-sm font-bold">{sel.name}</p>
            {sel.unlocked && (
              <span className="ml-auto text-[10px] font-semibold text-violet-500">
                {t("bdg.earned")}{sel.earnedDate ? ` · ${sel.earnedDate}` : ""}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-1 leading-snug">{sel.desc}</p>
          {!sel.unlocked && (
            <p className="text-[11px] text-gray-400 mt-1">🔒 {sel.progress}</p>
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] text-gray-300">{t("bdg.notice")}</p>
    </section>
  );
}
