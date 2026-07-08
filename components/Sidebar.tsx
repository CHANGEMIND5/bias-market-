"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { fmt, fmtInt, changeColor, fmtPct } from "@/lib/format";
import { useStore } from "@/lib/store";

export type View =
  | "market"
  | "watchlist"
  | "portfolio"
  | "history"
  | "community"
  | "missions";

const NAV: { view: View; label: string; icon: string }[] = [
  { view: "market", label: "전체 마켓", icon: "📊" },
  { view: "watchlist", label: "관심 목록", icon: "🤍" },
  { view: "portfolio", label: "포트폴리오", icon: "📁" },
  { view: "history", label: "거래 내역", icon: "🕓" },
  { view: "community", label: "커뮤니티", icon: "💬" },
  { view: "missions", label: "미션 & 보상", icon: "🎁" },
];

export default function Sidebar({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (v: View) => void;
}) {
  const {
    state, portfolioValue, totalCost, totalPnl, holdingCount,
    level, levelTitle, xpInLevel, xpPerLevel,
    claimDailyReward, canClaimReward, showToast,
  } = useStore();
  const { data: session } = useSession();

  const pnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalAssets = state.balance + portfolioValue;

  return (
    <aside className="w-full lg:w-60 shrink-0 flex flex-col gap-4">
      {/* Logo */}
      <div className="px-2 pt-1">
        <h1 className="text-xl font-extrabold tracking-tight">Bias Market</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          K-pop 팬덤 트레이딩 시뮬레이터
        </p>
      </div>

      {/* Account */}
      {session?.user ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-3.5 flex items-center gap-3">
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt=""
              className="w-9 h-9 rounded-full shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full shrink-0"
              style={{ background: "linear-gradient(135deg,#93c5fd,#6ee7b7)" }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{session.user.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{session.user.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-[11px] text-gray-400 hover:text-gray-600 shrink-0"
          >
            로그아웃
          </button>
        </div>
      ) : (
        <button
          onClick={() => signIn("google")}
          className="bg-white rounded-2xl border border-gray-200 shadow-card p-3.5 flex items-center justify-center gap-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <span
            aria-hidden
            className="w-5 h-5 rounded-full grid place-items-center text-[11px] font-extrabold text-white"
            style={{
              background:
                "conic-gradient(#ea4335 0 25%, #fbbc05 25% 50%, #34a853 50% 75%, #4285f4 75% 100%)",
            }}
          >
            G
          </span>
          Google로 로그인
        </button>
      )}

      {/* Navigation */}
      <nav className="bg-white rounded-2xl border border-gray-200 shadow-card p-2">
        {NAV.map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              view === item.view
                ? "bg-emerald-50 text-emerald-700"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span className="text-base leading-none" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Balance card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
        <p className="text-xs text-gray-500">보유 자산</p>
        <p className="text-xl font-bold text-emerald-600 mt-1">
          Fan$ {fmt(totalAssets, 0)}
        </p>
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">보유 Fan$</span>
            <span className="font-medium">{fmt(state.balance, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">평가 손익</span>
            <span className={`font-medium ${changeColor(totalPnl)}`}>
              {totalPnl >= 0 ? "+" : ""}
              {fmt(totalPnl, 0)} ({fmtPct(pnlPct)})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">보유 Fan Shares</span>
            <span className="font-medium">{holdingCount} 종목</span>
          </div>
        </div>
        <button
          onClick={async () => {
            const r = await claimDailyReward();
            if (r.ok) showToast("success", "일일 보상 2,000 Fan$ 지급 완료!");
            else showToast("info", r.error ?? "보상을 받을 수 없습니다.");
          }}
          className={`mt-3 w-full py-2 rounded-xl text-sm font-semibold border transition-colors ${
            canClaimReward
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-gray-200 bg-gray-50 text-gray-400"
          }`}
        >
          {canClaimReward ? "🎁 일일 보상 받기 (+2,000)" : "오늘 보상 수령 완료"}
        </button>
      </div>

      {/* Level card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full"
            style={{ background: "linear-gradient(135deg,#a78bfa,#f0abfc)" }}
          />
          <div>
            <p className="text-sm font-bold">Fandomer</p>
            <p className="text-xs text-gray-500">
              Lv.{level} {levelTitle}
            </p>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all"
            style={{ width: `${(xpInLevel / xpPerLevel) * 100}%` }}
          />
        </div>
        <p className="text-right text-[11px] text-gray-400 mt-1">
          {fmtInt(xpInLevel)} / {fmtInt(xpPerLevel)} XP
        </p>
      </div>
    </aside>
  );
}
