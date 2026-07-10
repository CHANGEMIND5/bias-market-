"use client";

import { useMemo, useState } from "react";
import Emblem from "./Emblem";
import { spotPrice } from "@/lib/amm";
import { changeColor, fmt, fmtCompact, fmtPct } from "@/lib/format";
import { TKey, useLang } from "@/lib/i18n";
import { GROUPS, GROUP_MAP, TOTAL_SHARES, VISIBLE_GROUPS } from "@/lib/mockData";
import { searchGroups } from "@/lib/search";
import { useStore } from "@/lib/store";
import { Group } from "@/lib/types";

type Filter = "up" | "down" | "volume" | "name";
type CatFilter =
  | "all" | "group" | "member"
  | "boy" | "girl"
  | "rookie" | "legacy" | "check";

const CAT_FILTERS: [CatFilter, TKey][] = [
  ["all", "cat.all"],
  ["group", "cat.group"],
  ["member", "cat.member"],
  ["boy", "cat.boy"],
  ["girl", "cat.girl"],
  ["rookie", "cat.rookie"],
  ["legacy", "cat.legacy"],
  ["check", "cat.check"],
];

/** 카테고리 필터별 대상 목록 (기본: active + rookie만 노출) */
function baseListFor(cat: CatFilter): Group[] {
  switch (cat) {
    case "rookie":
      return GROUPS.filter((g) => g.seedStatus === "rookie_candidate");
    case "legacy":
      return GROUPS.filter((g) => g.seedStatus === "legacy_candidate");
    case "check":
      return GROUPS.filter((g) => g.seedStatus === "check");
    case "group":
      return VISIBLE_GROUPS.filter((g) => g.category === "group");
    case "member":
      return VISIBLE_GROUPS.filter((g) => g.category === "member");
    case "boy":
      return VISIBLE_GROUPS.filter((g) => g.gender === "boy");
    case "girl":
      return VISIBLE_GROUPS.filter((g) => g.gender === "girl");
    default:
      return VISIBLE_GROUPS;
  }
}

function pctChange(price: number, baseline: number): number {
  return baseline > 0 ? ((price - baseline) / baseline) * 100 : 0;
}

export default function MarketTable({
  selectedId,
  onSelect,
  favoritesOnly = false,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  favoritesOnly?: boolean;
}) {
  const { state, toggleFavorite } = useStore();
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<Filter>("up");
  const [catFilter, setCatFilter] = useState<CatFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavs, setShowFavs] = useState(favoritesOnly);
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => {
    // 검색 중이면 전체 DB(hidden 제외)에서, 아니면 카테고리 필터 기준
    const source = searchQuery.trim()
      ? searchGroups(searchQuery)
      : baseListFor(catFilter);

    const toRow = (g: Group) => {
      const m = state.markets[g.id];
      if (!m) return null;
      const price = spotPrice(m);
      return {
        group: g,
        price,
        ch1h: pctChange(price, m.baseline1h),
        ch24h: pctChange(price, m.baseline24h),
        ch7d: pctChange(price, m.baseline7d),
        marketCap: price * TOTAL_SHARES,
        volume: m.volume24h,
        fav: state.favorites.includes(g.id),
      };
    };
    const list = source.map(toRow).filter(Boolean) as NonNullable<
      ReturnType<typeof toRow>
    >[];

    let filtered = showFavs || favoritesOnly ? list.filter((r) => r.fav) : list;
    if (!searchQuery.trim()) {
      switch (filter) {
        case "up": filtered = [...filtered].sort((a, b) => b.ch24h - a.ch24h); break;
        case "down": filtered = [...filtered].sort((a, b) => a.ch24h - b.ch24h); break;
        case "volume": filtered = [...filtered].sort((a, b) => b.volume - a.volume); break;
        case "name": filtered = [...filtered].sort((a, b) => a.group.name.localeCompare(b.group.name)); break;
      }
    }

    // 순위는 항상 "기본 노출 종목"의 팬덤 가치 기준 (레거시/체크는 "-")
    const visibleCaps = VISIBLE_GROUPS.map((g) => {
      const m = state.markets[g.id];
      return { id: g.id, cap: m ? spotPrice(m) * TOTAL_SHARES : 0 };
    }).sort((a, b) => b.cap - a.cap);
    const rankMap = new Map(visibleCaps.map((r, i) => [r.id, i + 1]));
    return filtered.map((r) => ({ ...r, rank: rankMap.get(r.group.id) ?? 0 }));
  }, [state.markets, state.favorites, filter, catFilter, searchQuery, showFavs, favoritesOnly]);

  const visible = expanded ? rows : rows.slice(0, 10);

  const filterBtn = (key: Filter, label: string) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        filter === key
          ? "bg-emerald-50 text-emerald-700"
          : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-2">
        <div>
          <h2 className="text-lg font-bold">
            {favoritesOnly ? t("nav.watchlist") : t("table.title")}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{t("table.subtitle")}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 검색 — 영문/한글/별칭/팬덤명 전부 검색됨 */}
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-40 px-3 py-1.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-emerald-400"
          />
          <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 p-0.5 flex-wrap">
            {CAT_FILTERS.map(([key, labelKey]) => (
              <button
                key={key}
                onClick={() => {
                  setCatFilter(key);
                  setSearchQuery("");
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  catFilter === key && !searchQuery
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
          {!favoritesOnly && (
            <button
              onClick={() => setShowFavs((v) => !v)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors mr-1 ${
                showFavs
                  ? "border-amber-200 bg-amber-50 text-amber-600"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t("table.favs")}
            </button>
          )}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 p-0.5">
            {filterBtn("up", t("filter.up"))}
            {filterBtn("down", t("filter.down"))}
            {filterBtn("volume", t("filter.volume"))}
            {filterBtn("name", t("filter.name"))}
          </div>
        </div>
      </div>

      {/* 모바일: 카드 리스트 */}
      <div className="md:hidden px-4 pb-2 flex flex-col gap-2">
        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            {showFavs || favoritesOnly ? t("table.emptyFavs") : t("table.empty")}
          </p>
        )}
        {visible.map((r) => (
          <div
            key={r.group.id}
            onClick={() => onSelect(r.group.id)}
            className="rounded-xl border border-gray-100 p-3 flex items-center gap-3 active:bg-gray-50"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(r.group.id);
              }}
              aria-label="관심 목록 토글"
              className={`text-lg ${r.fav ? "text-amber-400" : "text-gray-300"}`}
            >
              {r.fav ? "★" : "☆"}
            </button>
            <span className="w-5 text-xs text-gray-400">{r.rank || "–"}</span>
            <Emblem group={r.group} size={30} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">
                {r.group.name}
                {r.group.category === "member" && r.group.parentGroup && (
                  <span className="ml-1.5 text-[10px] text-gray-400 font-medium">
                    {GROUP_MAP[r.group.parentGroup]?.name}
                  </span>
                )}
                {lang === "ko" && r.group.koreanName && (
                  <span className="ml-1.5 text-[10px] text-gray-400 font-normal">
                    {r.group.koreanName}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-400">
                Fan$ {fmt(r.price)} · {t("table.volumeShort")} {fmtCompact(r.volume)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${changeColor(r.ch24h)}`}>
                {fmtPct(r.ch24h)}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(r.group.id);
                }}
                className="mt-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold"
              >
                {t("table.tradeBtn")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 데스크톱: 테이블 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="w-10" />
              <th className="text-left font-medium py-3 px-2 w-10">#</th>
              <th className="text-left font-medium py-3 px-2">{t("col.group")}</th>
              <th className="text-right font-medium py-3 px-2">{t("col.price")}</th>
              <th className="text-right font-medium py-3 px-2">{t("col.1h")}</th>
              <th className="text-right font-medium py-3 px-2">{t("col.24h")}</th>
              <th className="text-right font-medium py-3 px-2">{t("col.7d")}</th>
              <th className="text-right font-medium py-3 px-2">{t("col.fandomValue")}</th>
              <th className="text-right font-medium py-3 px-2">{t("col.volume24h")}</th>
              <th className="text-right font-medium py-3 px-4">{t("col.trade")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-gray-400">
                  {showFavs || favoritesOnly ? t("table.emptyFavs") : t("table.empty")}
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr
                key={r.group.id}
                onClick={() => onSelect(r.group.id)}
                className={`cursor-pointer border-b border-gray-50 last:border-0 transition-colors ${
                  selectedId === r.group.id
                    ? "bg-emerald-50/60"
                    : "hover:bg-gray-50"
                }`}
              >
                <td className="pl-4 pr-1 py-3.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(r.group.id);
                    }}
                    aria-label="관심 목록 토글"
                    className={`text-base ${
                      r.fav ? "text-amber-400" : "text-gray-300 hover:text-gray-400"
                    }`}
                  >
                    {r.fav ? "★" : "☆"}
                  </button>
                </td>
                <td className="px-2 py-3.5 text-gray-500">{r.rank || "–"}</td>
                <td className="px-2 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Emblem group={r.group} size={28} />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {r.group.name}
                        {r.group.category === "member" && r.group.parentGroup && (
                          <span className="ml-1.5 text-[11px] text-gray-400 font-medium">
                            {GROUP_MAP[r.group.parentGroup]?.name}
                          </span>
                        )}
                      </p>
                      {(() => {
                        // 한국어 UI: 한글명 · 팬덤명 / 그 외: 팬덤명만
                        const parts = [
                          lang === "ko" ? r.group.koreanName : null,
                          r.group.fandom !== "-" ? r.group.fandom : null,
                        ].filter(Boolean);
                        return parts.length > 0 ? (
                          <p className="text-[10px] text-gray-400 truncate">
                            {parts.join(" · ")}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3.5 text-right font-semibold">
                  Fan$ {fmt(r.price)}
                </td>
                <td className={`px-2 py-3.5 text-right ${changeColor(r.ch1h)}`}>{fmtPct(r.ch1h)}</td>
                <td className={`px-2 py-3.5 text-right ${changeColor(r.ch24h)}`}>{fmtPct(r.ch24h)}</td>
                <td className={`px-2 py-3.5 text-right ${changeColor(r.ch7d)}`}>{fmtPct(r.ch7d)}</td>
                <td className="px-2 py-3.5 text-right text-gray-700">
                  Fan$ {fmtCompact(r.marketCap)}
                </td>
                <td className="px-2 py-3.5 text-right text-gray-700">
                  Fan$ {fmtCompact(r.volume)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(r.group.id);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    {t("table.tradeBtn")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 10 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 border-t border-gray-100"
        >
          {expanded ? t("table.less") : t("table.more")}
        </button>
      )}
    </section>
  );
}
