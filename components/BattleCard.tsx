"use client";

import { useEffect, useMemo, useState } from "react";
import Emblem from "./Emblem";
import { BattleCategory, battleRanking } from "@/lib/battle";
import { changeColor, fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { TKey, useLang } from "@/lib/i18n";
import { GROUP_MAP } from "@/lib/mockData";
import { useStore } from "@/lib/store";

const CATEGORIES: { cat: BattleCategory; labelKey: TKey }[] = [
  { cat: "all", labelKey: "bcat.all" },
  { cat: "girl", labelKey: "bcat.girl" },
  { cat: "boy", labelKey: "bcat.boy" },
  { cat: "mega", labelKey: "bcat.mega" },
  { cat: "large", labelKey: "bcat.large" },
  { cat: "mid", labelKey: "bcat.mid" },
  { cat: "rookie", labelKey: "bcat.rookie" },
];

// KST 기준 이번 주 마감(일요일 24시 = 다음 월요일 0시)까지 남은 시간
function countdownToWeekEnd(now: number): string {
  const KST = 9 * 3600_000;
  const k = new Date(now + KST);
  const day = k.getUTCDay(); // 0=일 .. 1=월
  let daysToMon = (1 - day + 7) % 7; // 다음 월요일까지 일수
  if (daysToMon === 0) daysToMon = 7; // 오늘이 월요일이면 이번 주 끝은 7일 후
  const endKstMs = Date.UTC(
    k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() + daysToMon, 0, 0, 0
  );
  const endMs = endKstMs - KST;
  let s = Math.max(0, Math.floor((endMs - now) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const hms = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

interface WeekEntry { groupId: string; rank: number; score: number; ch24: number; }

const CRITERIA: [TKey, string][] = [
  ["battle.cChange", "35%"],
  ["battle.cVolume", "30%"],
  ["battle.cHolders", "20%"],
  ["battle.cSocial", "15%"],
];

export default function BattleCard({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { state, missionEvent, loggedIn } = useStore();
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const [cat, setCat] = useState<BattleCategory>("all");
  const [now, setNow] = useState<number | null>(null);
  const [tab, setTab] = useState<"this" | "last">("this");
  const [lastWeek, setLastWeek] = useState<WeekEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/weekly-fandom", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLastWeek(d?.lastWeek?.entries ?? []))
      .catch(() => setLastWeek([]));
  }, []);

  // 카운트다운 (클라이언트에서만 tick — SSR 불일치 방지)
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 미션 진행: 팬덤 배틀 확인 (서버가 하루 1회만 인정)
  useEffect(() => {
    if (loggedIn) missionEvent("battle_viewed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const liveRanking = useMemo(
    () => battleRanking(state.markets, cat),
    [state.markets, cat]
  );
  // 이번 주 = 실시간, 지난주 = 스냅샷 (BattleEntry 형태로 통일)
  const ranking = useMemo(() => {
    if (tab === "this") return liveRanking;
    return (lastWeek ?? []).map((e) => ({
      groupId: e.groupId, rank: e.rank, score: e.score,
      ch24: e.ch24, volume: 0, holders: 0,
    }));
  }, [tab, liveRanking, lastWeek]);
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3, expanded ? ranking.length : 7);

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{t("battle.title")}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t("battle.subtitle")}</p>
        </div>
        {tab === "this" && (
          <span className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold">
            {t("battle.countdown", {
              t: now !== null ? countdownToWeekEnd(now) : "--:--:--",
            })}
          </span>
        )}
      </div>

      {/* 이번 주 / 지난주 토글 */}
      <div className="mt-3 flex gap-1.5">
        {(["this", "last"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => { setTab(tb); setExpanded(false); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === tb ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {t(tb === "this" ? "battle.thisWeekTab" : "battle.lastWeekTab")}
          </button>
        ))}
      </div>

      {/* 카테고리 세분화 탭 (이번 주만) */}
      {tab === "this" && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map(({ cat: c, labelKey }) => (
            <button
              key={c}
              onClick={() => { setCat(c); setExpanded(false); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                cat === c
                  ? "bg-violet-600 text-white"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}

      {tab === "this" && ranking.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">{t("battle.emptyCat")}</p>
      )}
      {tab === "last" && ranking.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">{t("battle.lastWeekEmpty")}</p>
      )}

      {/* Top 3 podium */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[top3[1], top3[0], top3[2]].map((e, i) =>
          e ? (
            <button
              key={e.groupId}
              onClick={() => onSelect(e.groupId)}
              className={`rounded-2xl border p-3 text-center transition-colors hover:bg-gray-50 ${
                e.rank === 1
                  ? "border-violet-200 bg-violet-50/60"
                  : "border-gray-100"
              }`}
            >
              <p className="text-base" aria-hidden>
                {e.rank === 1 ? "👑" : e.rank === 2 ? "🥈" : "🥉"}
              </p>
              <div className="flex justify-center my-1.5">
                <Emblem group={GROUP_MAP[e.groupId]} size={e.rank === 1 ? 44 : 36} />
              </div>
              <p className="text-sm font-bold truncate">
                {GROUP_MAP[e.groupId]?.name}
              </p>
              <p className={`font-extrabold ${e.rank === 1 ? "text-lg text-violet-700" : "text-sm"}`}>
                {e.score.toFixed(1)} pts
              </p>
              <p className={`text-xs font-semibold ${changeColor(e.ch24)}`}>
                {fmtPct(e.ch24)}
              </p>
            </button>
          ) : (
            <div key={i} />
          )
        )}
      </div>

      {/* Rank 4+ */}
      <div className="mt-3 divide-y divide-gray-50">
        {rest.map((e) => (
          <button
            key={e.groupId}
            onClick={() => onSelect(e.groupId)}
            className="w-full flex items-center gap-3 py-2.5 text-sm hover:bg-gray-50 rounded-lg px-2 transition-colors"
          >
            <span className="w-5 text-gray-400 font-medium">{e.rank}</span>
            <Emblem group={GROUP_MAP[e.groupId]} size={24} />
            <span className="font-semibold flex-1 text-left truncate">
              {GROUP_MAP[e.groupId]?.name}
            </span>
            <span className="font-bold">{e.score.toFixed(1)} pts</span>
            <span className={`w-16 text-right text-xs font-semibold ${changeColor(e.ch24)}`}>
              {fmtPct(e.ch24)}
            </span>
            <span className="hidden sm:block w-20 text-right text-xs text-gray-400">
              {fmtCompact(e.volume)} Fan$
            </span>
            <span className="hidden sm:block w-16 text-right text-xs text-gray-400">
              {t("battle.holdersUnit", { n: fmtInt(e.holders) })}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors"
      >
        {expanded ? t("battle.collapse") : t("battle.detail")}
      </button>

      {/* 점수 산정 기준 */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-gray-400 mr-1">{t("battle.criteria")}</span>
        {CRITERIA.map(([labelKey, w]) => (
          <span
            key={labelKey}
            className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[11px] text-gray-500"
          >
            {t(labelKey)} <b className="text-gray-700">{w}</b>
          </span>
        ))}
      </div>
    </section>
  );
}
