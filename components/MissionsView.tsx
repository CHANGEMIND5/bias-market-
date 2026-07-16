"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { getJSON, sendJSON } from "@/lib/data/api";
import { fmtInt } from "@/lib/format";
import { TKey, trServer, useLang } from "@/lib/i18n";
import { REWARDS } from "@/lib/missions";
import { useStore } from "@/lib/store";

interface MissionView {
  type: string;
  titleKey: string;
  target: number;
  progress: number;
  completed: boolean;
}

interface MissionData {
  daily: MissionView[];
  weekly: MissionView[];
  onboarding: MissionView[];
  resetInMs: number;
  rewardState: {
    streak: number;
    checkedInToday: boolean;
    dailyAllClaimed: boolean;
    dailyBonusClaimed: boolean;
    weeklyClaimed: boolean;
    onboardingClaimed: boolean;
  };
}

function fmtCountdown(ms: number): string {
  let s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MissionsView() {
  const { loggedIn, claimDailyReward, showToast, refresh } = useStore();
  const { t } = useLang();
  const [data, setData] = useState<MissionData | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!loggedIn) return;
    try {
      const d = await getJSON("/api/missions");
      if (d?.ok) {
        setData(d);
        setLoadedAt(Date.now());
      }
    } catch {
      // ignore
    }
  }, [loggedIn]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const doCheckin = async () => {
    if (busy) return;
    setBusy(true);
    const r = await claimDailyReward();
    setBusy(false);
    if (r.ok) {
      showToast(
        "success",
        `${t("mis.checkinDone", { n: fmtInt(r.fan ?? 0) })} · ${t("mis.streakNow", { n: r.streak ?? 1 })}`
      );
      load();
    } else {
      showToast("info", trServer(t, r.error, "err.rewardDone"));
    }
  };

  const claim = async (kind: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const d = await sendJSON("/api/rewards/claim", { kind });
      if (d?.ok) {
        const parts = [
          d.fan > 0 ? `Fan$ ${fmtInt(d.fan)}` : null,
          d.influence > 0 ? `${t("mis.inf")} ${fmtInt(d.influence)}` : null,
          d.xp > 0 ? `XP ${fmtInt(d.xp)}` : null,
        ].filter(Boolean);
        showToast("success", t("mis.got", { s: parts.join(" · ") }));
        await load();
        refresh();
      } else {
        showToast("info", trServer(t, d?.error, "err.already"));
      }
    } catch {
      showToast("error", t("err.network"));
    } finally {
      setBusy(false);
    }
  };

  if (!loggedIn) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-8 text-center">
        <p className="text-sm text-gray-500">{t("err.loginReward")}</p>
        <button
          onClick={() => signIn("google")}
          className="mt-4 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800"
        >
          {t("side.login")}
        </button>
      </div>
    );
  }

  const rs = data?.rewardState;
  const dailyDone = (data?.daily ?? []).filter((m) => m.completed).length;
  const dailyTotal = data?.daily.length ?? 3;
  const allDaily = dailyDone >= dailyTotal && dailyTotal > 0;
  const weeklyDone = (data?.weekly ?? []).filter((m) => m.completed).length;
  const obDone = (data?.onboarding ?? []).filter((m) => m.completed).length;
  const obTotal = data?.onboarding.length ?? 6;
  const remainMs = data ? Math.max(0, data.resetInMs - (now - loadedAt)) : 0;

  const missionRow = (m: MissionView, rewardLine: string) => (
    <div
      key={m.type}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        m.completed ? "border-emerald-100 bg-emerald-50/50" : "border-gray-100"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-lg shrink-0 ${m.completed ? "" : "grayscale opacity-40"}`} aria-hidden>
          {m.completed ? "✅" : "⬜️"}
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${m.completed ? "text-emerald-700" : ""}`}>
            {t(m.titleKey as TKey)}
          </p>
          <p className="text-[11px] text-gray-400">{rewardLine}</p>
        </div>
      </div>
      <span className="text-xs font-bold text-gray-500 shrink-0 ml-2">
        {m.progress}/{m.target}
      </span>
    </div>
  );

  const dailyRewardLine = `+${REWARDS.perMissionInfluence} ${t("mis.inf")} · +${REWARDS.perMissionXp} XP`;

  return (
    <div className="flex flex-col gap-4">
      {/* 7일 연속 출석 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">🔥 {t("mis.checkinTitle")}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("mis.streakNow", { n: rs?.streak ?? 0 })}
            </p>
          </div>
          <button
            onClick={doCheckin}
            disabled={busy || rs?.checkedInToday}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              rs?.checkedInToday
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {rs?.checkedInToday ? t("mis.checkedIn") : t("mis.checkinBtn")}
          </button>
        </div>
        {/* 7일 스트립 */}
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {REWARDS.streakFan.map((fan, i) => {
            const day = i + 1;
            const reached = (rs?.streak ?? 0) >= day;
            return (
              <div
                key={day}
                className={`rounded-xl border px-1 py-2 text-center ${
                  reached
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <p className="text-[10px] text-gray-400">{t("mis.day", { n: day })}</p>
                <p className={`text-[11px] font-bold ${reached ? "text-emerald-600" : "text-gray-500"}`}>
                  {fmtInt(fan)}
                </p>
                {day === 7 && <p className="text-[10px]" aria-hidden>🏅</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 오늘의 미션 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-bold">{t("mis.dailyTitle")}</h3>
          <span className="text-xs text-gray-400">
            {dailyDone}/{dailyTotal} · {t("mis.resetsIn", { t: fmtCountdown(remainMs) })}
          </span>
        </div>
        {/* progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${dailyTotal ? (dailyDone / dailyTotal) * 100 : 0}%` }}
          />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {(data?.daily ?? []).map((m) => missionRow(m, dailyRewardLine))}
        </div>
        {allDaily && !rs?.dailyAllClaimed && (
          <p className="mt-3 text-sm font-bold text-emerald-600 text-center">
            {t("mis.allDone")}
          </p>
        )}
        {/* 전체 완료 보상 */}
        <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-gray-600">{t("mis.allReward")}</p>
            <p className="text-[11px] text-gray-400">
              Fan$ {fmtInt(REWARDS.dailyAllFan)} · {t("mis.inf")} {REWARDS.dailyAllInfluence} · XP {REWARDS.dailyAllXp}
            </p>
          </div>
          <button
            onClick={() => claim("daily_all")}
            disabled={busy || !allDaily || rs?.dailyAllClaimed}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              rs?.dailyAllClaimed
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : allDaily
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {rs?.dailyAllClaimed ? t("mis.claimedBtn") : t("mis.claimBtn")}
          </button>
        </div>
        {/* 일일 완료 보너스 */}
        <div className="mt-2 rounded-xl bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-gray-600">{t("mis.bonusTitle")}</p>
            <p className="text-[11px] text-gray-400">
              Fan$ {fmtInt(REWARDS.dailyBonusFan)} · {t("mis.bonusDesc")}
            </p>
          </div>
          <button
            onClick={() => claim("daily_bonus")}
            disabled={busy || !rs?.dailyAllClaimed || !rs?.checkedInToday || rs?.dailyBonusClaimed}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              rs?.dailyBonusClaimed
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : rs?.dailyAllClaimed && rs?.checkedInToday
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {rs?.dailyBonusClaimed ? t("mis.claimedBtn") : t("mis.claimBtn")}
          </button>
        </div>
      </div>

      {/* 시작하기 (온보딩) — 보상 수령 전까지만 표시 */}
      {!rs?.onboardingClaimed && (
        <div className="bg-white rounded-2xl border border-violet-100 shadow-card p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-bold">🚀 {t("mis.onbTitle")}</h3>
            <span className="text-xs text-gray-400">{obDone}/{obTotal}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all"
              style={{ width: `${obTotal ? (obDone / obTotal) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {(data?.onboarding ?? []).map((m) => missionRow(m, `+${t("mis.inf")}/XP`))}
          </div>
          <div className="mt-3 rounded-xl bg-violet-50/60 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-violet-700">{t("ob.reward")}</p>
              <p className="text-[11px] text-gray-500">
                Fan$ {fmtInt(REWARDS.onboardingFan)} · {t("mis.inf")} {REWARDS.onboardingInfluence} · XP {REWARDS.onboardingXp} · {t("ob.titleName")}
              </p>
            </div>
            <button
              onClick={() => claim("onboarding")}
              disabled={busy || obDone < obTotal}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                obDone >= obTotal
                  ? "bg-violet-600 text-white hover:bg-violet-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {t("mis.claimBtn")}
            </button>
          </div>
        </div>
      )}

      {/* 주간 미션 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-bold">{t("mis.weeklyTitle")}</h3>
          <span className="text-xs text-gray-400">
            {weeklyDone}/{data?.weekly.length ?? 5}
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {(data?.weekly ?? []).map((m) => missionRow(m, ""))}
        </div>
        <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-gray-600">{t("mis.allReward")}</p>
            <p className="text-[11px] text-gray-400">
              Fan$ {fmtInt(REWARDS.weeklyFan)} · {t("mis.inf")} {fmtInt(REWARDS.weeklyInfluence)} · XP {fmtInt(REWARDS.weeklyXp)}
            </p>
          </div>
          <button
            onClick={() => claim("weekly")}
            disabled={busy || weeklyDone < (data?.weekly.length ?? 5) || rs?.weeklyClaimed}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              rs?.weeklyClaimed
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : weeklyDone >= (data?.weekly.length ?? 5)
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {rs?.weeklyClaimed ? t("mis.claimedBtn") : t("mis.claimBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
