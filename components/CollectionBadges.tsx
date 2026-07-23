"use client";

// 컬렉션 배지(그룹 도감) + 최대 보유자(Top 3) 배지.
// 데이터는 /api/badges에서. Fan Shares 수량은 노출하지 않음(순위만).
import { useCallback, useEffect, useState } from "react";
import Emblem from "./Emblem";
import { CardSkeleton } from "./Skeleton";
import { useLang } from "@/lib/i18n";
import { GROUP_MAP, VISIBLE_GROUPS } from "@/lib/mockData";
import { useStore } from "@/lib/store";

interface BadgeData {
  collected: string[];
  topHolder: { groupId: string; rank: number }[];
}

const RANK_ICON = ["👑", "🥈", "🥉"];

export default function CollectionBadges({
  onSelect,
}: {
  onSelect?: (id: string) => void;
}) {
  const { loggedIn } = useStore();
  const { t } = useLang();
  const [data, setData] = useState<BadgeData | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/badges", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    if (loggedIn) load();
  }, [loggedIn, load]);

  if (!loggedIn) return null;
  if (!data) return <CardSkeleton lines={3} />;

  const total = VISIBLE_GROUPS.length;
  const collected = data?.collected ?? [];
  const topHolder = data?.topHolder ?? [];
  const pct = total > 0 ? Math.round((collected.length / total) * 100) : 0;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <h2 className="text-lg font-bold">{t("col.title")}</h2>
      <p className="text-sm text-gray-500 mt-0.5">{t("col.sub")}</p>

      {/* 최대 보유자 배지 */}
      {topHolder.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-gray-600 mb-2">
            👑 {t("col.topHolderTitle")}
          </p>
          <div className="flex flex-col gap-2">
            {topHolder.map(({ groupId, rank }) => {
              const g = GROUP_MAP[groupId];
              if (!g) return null;
              return (
                <button
                  key={groupId}
                  onClick={() => onSelect?.(groupId)}
                  className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-left hover:bg-amber-50 transition-colors"
                >
                  <span className="text-lg" aria-hidden>{RANK_ICON[rank - 1] ?? "🏅"}</span>
                  <Emblem group={g} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{g.name}</p>
                    <p className="text-[11px] text-amber-600 font-semibold">
                      {t("col.topHolderRank", { n: rank })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 컬렉션 진행도 */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-bold text-gray-600">🗂 {t("col.collectionTitle")}</p>
          <span className="text-xs text-gray-400">
            {collected.length} / {total}
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {collected.length === 0 ? (
          <p className="mt-3 text-xs text-gray-400 text-center py-2">
            {t("col.empty")}
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-6 sm:grid-cols-8 gap-2">
            {collected.map((gid) => {
              const g = GROUP_MAP[gid];
              if (!g) return null;
              return (
                <button
                  key={gid}
                  onClick={() => onSelect?.(gid)}
                  title={g.name}
                  className="flex flex-col items-center gap-0.5"
                >
                  <Emblem group={g} size={30} />
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">
                    {g.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] text-gray-300">{t("col.notice")}</p>
    </section>
  );
}
