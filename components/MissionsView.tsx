"use client";

import { DAILY_REWARD } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function MissionsView() {
  const { state, claimDailyReward, canClaimReward, showToast, holdingCount } = useStore();

  const missions = [
    { title: "첫 Fan Shares 매수하기", reward: "+25 XP", done: state.trades.some((t) => t.side === "buy") },
    { title: "첫 Fan Shares 매도하기", reward: "+25 XP", done: state.trades.some((t) => t.side === "sell") },
    { title: "그룹 3개 이상 보유하기", reward: "+50 XP", done: holdingCount >= 3 },
    { title: "관심 목록에 그룹 추가하기", reward: "+10 XP", done: state.favorites.length > 0 },
    { title: "거래 10회 달성하기", reward: "+100 XP", done: state.trades.length >= 10 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Daily reward */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">🎁 일일 보상</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            매일 접속하면 무료 Fan$ {DAILY_REWARD.toLocaleString()}을 드려요.
          </p>
        </div>
        <button
          onClick={async () => {
            const r = await claimDailyReward();
            if (r.ok) showToast("success", `일일 보상 ${DAILY_REWARD.toLocaleString()} Fan$ 지급 완료!`);
            else showToast("info", r.error ?? "오늘의 보상은 이미 받았어요.");
          }}
          disabled={!canClaimReward}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            canClaimReward
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {canClaimReward ? `Fan$ ${DAILY_REWARD.toLocaleString()} 받기` : "내일 다시 오세요"}
        </button>
      </div>

      {/* Missions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
        <h3 className="text-base font-bold mb-3">미션</h3>
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
