"use client";

import { useEffect, useMemo, useState } from "react";
import Emblem from "./Emblem";
import { battleRanking } from "@/lib/battle";
import { changeColor, fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { TKey, useLang } from "@/lib/i18n";
import { GROUP_MAP } from "@/lib/mockData";
import { useStore } from "@/lib/store";

function countdownToMidnight(now: number): string {
  const d = new Date(now);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  let s = Math.max(0, Math.floor((midnight - now) / 1000));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
  const { state } = useStore();
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  // 카운트다운 (클라이언트에서만 tick — SSR 불일치 방지)
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ranking = useMemo(() => battleRanking(state.markets), [state.markets]);
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3, expanded ? ranking.length : 7);

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{t("battle.title")}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t("battle.subtitle")}</p>
        </div>
        <span className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-bold">
          {t("battle.countdown", {
            t: now !== null ? countdownToMidnight(now) : "--:--:--",
          })}
        </span>
      </div>

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
