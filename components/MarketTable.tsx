"use client";

import { useMemo, useState } from "react";
import Emblem from "./Emblem";
import { spotPrice } from "@/lib/amm";
import { changeColor, fmt, fmtCompact, fmtPct } from "@/lib/format";
import { GROUPS, GROUP_MAP, TOTAL_SHARES } from "@/lib/mockData";
import { useStore } from "@/lib/store";

type Filter = "up" | "down" | "volume" | "name";

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
  const [filter, setFilter] = useState<Filter>("up");
  const [showFavs, setShowFavs] = useState(favoritesOnly);
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(() => {
    const list = GROUPS.map((g) => {
      const m = state.markets[g.id];
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
    });
    let filtered = showFavs || favoritesOnly ? list.filter((r) => r.fav) : list;
    switch (filter) {
      case "up": filtered = [...filtered].sort((a, b) => b.ch24h - a.ch24h); break;
      case "down": filtered = [...filtered].sort((a, b) => a.ch24h - b.ch24h); break;
      case "volume": filtered = [...filtered].sort((a, b) => b.volume - a.volume); break;
      case "name": filtered = [...filtered].sort((a, b) => a.group.name.localeCompare(b.group.name)); break;
    }
    // Rank is always by fandom value (market cap)
    const byCap = [...list].sort((a, b) => b.marketCap - a.marketCap);
    const rankMap = new Map(byCap.map((r, i) => [r.group.id, i + 1]));
    return filtered.map((r) => ({ ...r, rank: rankMap.get(r.group.id) ?? 0 }));
  }, [state.markets, state.favorites, filter, showFavs, favoritesOnly]);

  const visible = expanded ? rows : rows.slice(0, 6);

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
            {favoritesOnly ? "관심 목록" : "전체 팬쉐어"}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            모든 K-pop 그룹의 Fan Share 가격과 팬덤 가치를 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {!favoritesOnly && (
            <button
              onClick={() => setShowFavs((v) => !v)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors mr-1 ${
                showFavs
                  ? "border-amber-200 bg-amber-50 text-amber-600"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              ☆ 관심
            </button>
          )}
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 p-0.5">
            {filterBtn("up", "상승")}
            {filterBtn("down", "하락")}
            {filterBtn("volume", "거래량")}
            {filterBtn("name", "이름")}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="w-10" />
              <th className="text-left font-medium py-3 px-2 w-10">#</th>
              <th className="text-left font-medium py-3 px-2">그룹</th>
              <th className="text-right font-medium py-3 px-2">현재 가격 (Fan$)</th>
              <th className="text-right font-medium py-3 px-2">1시간</th>
              <th className="text-right font-medium py-3 px-2">24시간</th>
              <th className="text-right font-medium py-3 px-2">7일</th>
              <th className="text-right font-medium py-3 px-2">팬덤 가치</th>
              <th className="text-right font-medium py-3 px-4">24h 거래량</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-400">
                  {showFavs || favoritesOnly
                    ? "관심 목록이 비어 있어요. 별을 눌러 그룹을 추가해 보세요."
                    : "표시할 그룹이 없습니다."}
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
                <td className="px-2 py-3.5 text-gray-500">{r.rank}</td>
                <td className="px-2 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Emblem group={r.group} size={28} />
                    <span className="font-semibold">{r.group.name}</span>
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
                <td className="px-4 py-3.5 text-right text-gray-700">
                  Fan$ {fmtCompact(r.volume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 6 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 border-t border-gray-100"
        >
          {expanded ? "접기 ▲" : "더 보기 ▼"}
        </button>
      )}
    </section>
  );
}
