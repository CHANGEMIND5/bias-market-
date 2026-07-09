"use client";

import { fmtInt } from "@/lib/format";
import { trServer, useLang } from "@/lib/i18n";
import { DAILY_REWARD } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function MissionsView() {
  const { state, claimDailyReward, canClaimReward, showToast, holdingCount } = useStore();
  const { t } = useLang();

  const missions = [
    { title: t("mis.m1"), reward: "+25 XP", done: state.trades.some((tr) => tr.side === "buy") },
    { title: t("mis.m2"), reward: "+25 XP", done: state.trades.some((tr) => tr.side === "sell") },
    { title: t("mis.m3"), reward: "+50 XP", done: holdingCount >= 3 },
    { title: t("mis.m4"), reward: "+10 XP", done: state.favorites.length > 0 },
    { title: t("mis.m5"), reward: "+100 XP", done: state.trades.length >= 10 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Daily reward */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">{t("mis.daily")}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("mis.dailySub", { n: fmtInt(DAILY_REWARD) })}
          </p>
        </div>
        <button
          onClick={async () => {
            const r = await claimDailyReward();
            if (r.ok) showToast("success", t("mis.claimed", { n: fmtInt(DAILY_REWARD) }));
            else showToast("info", trServer(t, r.error, "err.rewardDone"));
          }}
          disabled={!canClaimReward}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            canClaimReward
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {canClaimReward
            ? t("mis.claim", { n: fmtInt(DAILY_REWARD) })
            : t("mis.tomorrow")}
        </button>
      </div>

      {/* Missions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
        <h3 className="text-base font-bold mb-3">{t("mis.title")}</h3>
        <div className="flex flex-col gap-2">
          {missions.map((m, i) => (
            <div
              key={i}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                m.done ? "border-emerald-100 bg-emerald-50/50" : "border-gray-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-lg ${m.done ? "" : "grayscale opacity-40"}`} aria-hidden>
                  {m.done ? "✅" : "⬜️"}
                </span>
                <span className={`text-sm font-medium ${m.done ? "text-emerald-700" : ""}`}>
                  {m.title}
                </span>
              </div>
              <span className="text-xs font-semibold text-violet-500">{m.reward}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
