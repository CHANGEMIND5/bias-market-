"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import LangSwitcher from "./LangSwitcher";
import RewardCelebration from "./RewardCelebration";
import ThemeToggle from "./ThemeToggle";
import UserAvatar from "./UserAvatar";
import { AVATAR_PRESETS } from "@/lib/avatars";
import { fmt, fmtInt, changeColor, fmtPct } from "@/lib/format";
import { TKey, trServer, useLang } from "@/lib/i18n";
import { DAILY_REWARD, STARTING_BALANCE } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export type View =
  | "market"
  | "watchlist"
  | "portfolio"
  | "history"
  | "community"
  | "missions";

const NAV: { view: View; labelKey: TKey; icon: string }[] = [
  { view: "market", labelKey: "nav.market", icon: "📊" },
  { view: "watchlist", labelKey: "nav.watchlist", icon: "🤍" },
  { view: "portfolio", labelKey: "nav.portfolio", icon: "📁" },
  { view: "history", labelKey: "nav.history", icon: "🕓" },
  { view: "community", labelKey: "nav.community", icon: "💬" },
  { view: "missions", labelKey: "nav.missions", icon: "🎁" },
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
    claimDailyReward, canClaimReward, showToast, loggedIn,
    userName, userImage, updateName, updateAvatar, rewardStreak,
    starterStatus,
  } = useStore();
  const { data: session } = useSession();
  const { t } = useLang();
  const [celebrate, setCelebrate] = useState<{ fan: number; streak: number } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const pickAvatar = async (n: number) => {
    const r = await updateAvatar(n);
    if (r.ok) {
      showToast("success", n === -1 ? t("ok.googlePhoto") : t("ok.avatar"));
      setAvatarPickerOpen(false);
    } else {
      showToast("error", trServer(t, r.error, "err.network"));
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
      showToast("success", t("ok.nick"));
      setEditingName(false);
    } else {
      showToast("error", trServer(t, r.error, "err.network"));
    }
  };

  const pnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const totalAssets = state.balance + portfolioValue;

  return (
    <aside className="w-full lg:w-60 shrink-0 flex flex-col gap-4">
      {/* Logo */}
      <div className="px-2 pt-1">
        <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="w-8 h-8 shrink-0" />
          <span>
            Bias Market
            <span className="ml-1.5 align-middle px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-600 text-[10px] font-bold tracking-wide">
              BETA
            </span>
          </span>
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">{t("app.subtitle")}</p>
        <div className="mt-2 flex items-center gap-2">
          <LangSwitcher compact />
          <ThemeToggle />
        </div>
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
                  placeholder={t("side.nickPlaceholder")}
                />
                <button
                  onClick={saveName}
                  disabled={savingName}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 shrink-0 disabled:opacity-50"
                >
                  {t("save")}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-[11px] text-gray-400 hover:text-gray-600 shrink-0"
                >
                  {t("cancel")}
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
              {t("side.logout")}
            </button>
          )}
          </div>

          {/* Avatar picker */}
          {avatarPickerOpen && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-[11px] text-gray-400 mb-2">{t("side.avatarPick")}</p>
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
                {t("side.googlePhoto")}
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
          {t("side.login")}
        </button>
      )}

      {/* Navigation — 데스크톱: 세로 목록. 모바일은 하단 탭바(MobileTabBar)가 대체하므로 숨김 */}
      <nav className="hidden lg:flex bg-white rounded-2xl border border-gray-200 shadow-card p-2 lg:flex-col gap-1 overflow-x-auto">
        {NAV.map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              view === item.view
                ? "bg-emerald-50 text-emerald-700"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <span className="text-base leading-none" aria-hidden>
              {item.icon}
            </span>
            {t(item.labelKey)}
          </button>
        ))}
      </nav>

      {/* Balance hero */}
      <div
        className="rounded-2xl shadow-card p-4 text-white"
        style={{ background: "linear-gradient(135deg,#7c3aed,#d946ef)" }}
      >
        <p className="text-xs text-white/80">{t("side.assets")}</p>
        <p className="text-2xl font-extrabold mt-1">Fan$ {fmt(totalAssets, 0)}</p>
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-white/70">{t("side.fanBalance")}</span>
            <span className="font-semibold">{fmt(state.balance, 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">{t("side.pnl")}</span>
            <span className="font-semibold">
              {totalPnl >= 0 ? "+" : ""}
              {fmt(totalPnl, 0)} ({fmtPct(pnlPct)})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">{t("side.heldShares")}</span>
            <span className="font-semibold">{t("side.items", { n: holdingCount })}</span>
          </div>
        </div>
        {/* 보상 영역 — 가입 보너스(1회)와 일일 보상(매일)을 구분해 표시 */}
        {!loggedIn ? (
          <button
            onClick={() => signIn("google")}
            className="mt-3 w-full py-2 rounded-xl text-sm font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            {t("side.loginBonus", { n: fmtInt(STARTING_BALANCE) })}
          </button>
        ) : (
          <>
            {rewardStreak === 0 && state.trades.length === 0 && (
              <p className="mt-3 text-[11px] font-semibold text-emerald-600 text-center">
                {t("side.signupBonus", { n: fmtInt(STARTING_BALANCE) })}
              </p>
            )}
            <button
              onClick={async () => {
                const r = await claimDailyReward();
                if (r.ok)
                  setCelebrate({ fan: r.fan ?? 0, streak: r.streak ?? 1 });
                else showToast("info", trServer(t, r.error, "err.rewardDone"));
              }}
              disabled={!canClaimReward}
              className={`mt-2 w-full py-2 rounded-xl text-sm font-semibold border transition-colors ${
                canClaimReward
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
              }`}
            >
              {canClaimReward ? t("mis.checkinBtn") : t("mis.checkedIn")}
            </button>
            {rewardStreak > 0 && (
              <p className="mt-1.5 text-[11px] text-gray-400 text-center">
                🔥 {t("mis.streakNow", { n: rewardStreak })}
              </p>
            )}
            {starterStatus !== "COMPLETED" && (
              <Link
                href="/starter"
                className="mt-2 block rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 hover:bg-violet-100 transition-colors"
              >
                <p className="text-xs font-bold text-violet-700">
                  {t("sp.bannerTitle")}
                </p>
                <p className="mt-0.5 text-[10px] text-violet-500 leading-snug">
                  {t("sp.bannerDesc")} →
                </p>
              </Link>
            )}
          </>
        )}
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

      {celebrate && (
        <RewardCelebration
          fan={celebrate.fan}
          streak={celebrate.streak}
          onClose={() => setCelebrate(null)}
        />
      )}
    </aside>
  );
}
