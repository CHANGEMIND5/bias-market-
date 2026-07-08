"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import UserAvatar from "./UserAvatar";
import { AVATAR_PRESETS } from "@/lib/avatars";
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
    userName, userImage, updateName, updateAvatar,
  } = useStore();
  const { data: session } = useSession();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const pickAvatar = async (n: number) => {
    const r = await updateAvatar(n);
    if (r.ok) {
      showToast("success", n === -1 ? "구글 사진으로 되돌렸어요." : "아바타가 변경됐어요!");
      setAvatarPickerOpen(false);
    } else {
      showToast("error", r.error ?? "아바타를 바꿀 수 없습니다.");
    }
  };

  const displayName = userName ?? session?.user?.name ?? "팬";
  const displayImage = userImage ?? session?.user?.image ?? null;

  const saveName = async () => {
    if (savingName) return;
    setSavingName(true);
    const r = await updateName(nameDraft.trim());
    setSavingName(false);
    if (r.ok) {
      showToast("success", "닉네임이 변경됐어요!");
      setEditingName(false);
    } else {
      showToast("error", r.error ?? "닉네임을 바꿀 수 없습니다.");
    }
  };

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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-3.5">
          <div className="flex items-center gap-3">
          <button
            onClick={() => setAvatarPickerOpen((v) => !v)}
            aria-label="프로필 사진 변경"
            className="relative shrink-0"
          >
            <UserAvatar image={displayImage} size={36} />
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gray-900 text-white text-[9px] leading-none grid place-items-center">
              ✎
            </span>
          </button>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value.slice(0, 20))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  autoFocus
                  className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold outline-none focus:border-emerald-400"
                  placeholder="닉네임 (2~20자)"
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 shrink-0 disabled:opacity-50"
                >
                  저장
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-[11px] text-gray-400 hover:text-gray-600 shrink-0"
                >
                  취소
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-semibold truncate min-w-0">
                    {displayName}
                  </p>
                  <button
                    onClick={() => {
                      setNameDraft(displayName);
                      setEditingName(true);
                    }}
                    aria-label="닉네임 변경"
                    className="text-[11px] text-gray-300 hover:text-gray-500 shrink-0"
                  >
                    ✏️
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 truncate">{session.user.email}</p>
              </>
            )}
          </div>
          {!editingName && (
            <button
              onClick={() => signOut()}
              className="text-[11px] text-gray-400 hover:text-gray-600 shrink-0"
            >
              로그아웃
            </button>
          )}
          </div>

          {/* Avatar picker */}
          {avatarPickerOpen && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-[11px] text-gray-400 mb-2">아바타 선택</p>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_PRESETS.map(([a, b], i) => (
                  <button
                    key={i}
                    onClick={() => pickAvatar(i)}
                    aria-label={`아바타 ${i + 1}`}
                    className="w-8 h-8 rounded-full hover:scale-110 transition-transform ring-offset-1 hover:ring-2 hover:ring-emerald-300"
                    style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
                  />
                ))}
              </div>
              <button
                onClick={() => pickAvatar(-1)}
                className="mt-2.5 w-full py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
              >
                구글 프로필 사진 사용
              </button>
            </div>
          )}
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
