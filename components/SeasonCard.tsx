"use client";

// 월간 시즌 카드 — 카운트다운 + 내 시즌 영구 배지 + 지난 시즌 명예의 전당.
import { useCallback, useEffect, useState } from "react";
import { CardSkeleton } from "./Skeleton";
import { sendJSON } from "@/lib/data/api";
import { fmtInt } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";

interface Badge {
  seasonKey: string;
  groupId: string;
  kind: string;
  rank: number;
  groupName: string | null;
  code: string;
}
interface Hall {
  userId: string;
  name: string;
  wealth: number;
  rank: number;
}
interface SeasonData {
  currentSeason: string;
  endsInMs: number;
  lastSeasonKey: string | null;
  hallOfFame: Hall[];
  myBadges: Badge[];
  selectedTitle: string | null;
}

function fmtCountdown(ms: number): string {
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function SeasonCard() {
  const { loggedIn, showToast } = useStore();
  const { t } = useLang();
  const [data, setData] = useState<SeasonData | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/season", { cache: "no-store" });
      if (res.ok) { setData(await res.json()); setLoadedAt(Date.now()); }
    } catch { /* ignore */ }
  }, []);

  const setTitle = async (code: string | null) => {
    setBusy(true);
    try {
      const d = await sendJSON("/api/title", { code });
      if (d?.ok) {
        setData((prev) => (prev ? { ...prev, selectedTitle: code } : prev));
        showToast("success", code ? t("season.titleApplied") : t("season.titleRemoved"));
      } else {
        showToast("error", d?.error ?? t("err.network"));
      }
    } catch {
      showToast("error", t("err.network"));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!data) return <CardSkeleton lines={4} />;
  const remain = data.endsInMs - (now - loadedAt);

  const RANK_ICON = ["👑", "🥈", "🥉"];

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">🏆 {t("season.title")}</h2>
        <span className="text-xs font-semibold text-violet-600">{data.currentSeason}</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">
        {t("season.currentEnds", { t: fmtCountdown(remain) })}
      </p>
      <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">{t("season.notice")}</p>

      {/* 내 시즌 배지 — 칭호로 설정 가능 */}
      {loggedIn && (
        <div className="mt-4">
          <p className="text-xs font-bold text-gray-600 mb-1.5">
            {t("season.myBadges")} <span className="text-gray-400 font-normal">· {t("season.titleHint")}</span>
          </p>
          {data.myBadges.length === 0 ? (
            <p className="text-[11px] text-gray-400">{t("season.noBadges")}</p>
          ) : (
            <>
              {/* 칩을 탭하면 그 배지를 칭호로 설정/해제 (사용 중이면 보라 채움 + ✓) */}
              <div className="flex flex-wrap gap-1.5">
                {data.myBadges.map((b, i) => {
                  const on = data.selectedTitle === b.code;
                  const label =
                    b.kind === "CHAMPION"
                      ? `🏅 ${b.seasonKey} ${t("season.champion", { n: b.rank })}`
                      : `👑 ${b.seasonKey} ${b.groupName ?? b.groupId}`;
                  return (
                    <button
                      key={i}
                      onClick={() => setTitle(on ? null : b.code)}
                      disabled={busy}
                      title={t("season.titleSet")}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                        on
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      {label}{on ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>
              {data.selectedTitle && (
                <button
                  onClick={() => setTitle(null)}
                  disabled={busy}
                  className="text-[11px] text-gray-400 hover:text-gray-600 mt-1.5"
                >
                  {t("season.titleClear")}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* 지난 시즌 명예의 전당 */}
      <div className="mt-4">
        <p className="text-xs font-bold text-gray-600 mb-1.5">
          {t("season.hall")}{data.lastSeasonKey ? ` · ${data.lastSeasonKey}` : ""}
        </p>
        {data.hallOfFame.length === 0 ? (
          <p className="text-[11px] text-gray-400">{t("season.empty")}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {data.hallOfFame.slice(0, 5).map((h) => (
              <div key={h.rank} className="flex items-center gap-2 text-sm">
                <span className="w-5 text-center">{RANK_ICON[h.rank - 1] ?? h.rank}</span>
                <span className="flex-1 font-semibold truncate">{h.name}</span>
                <span className="text-xs text-gray-400">Fan$ {fmtInt(h.wealth)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
