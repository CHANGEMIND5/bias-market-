"use client";

import Emblem from "./Emblem";
import { changeColor, fmt, fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { TOTAL_SHARES } from "@/lib/mockData";
import { spotPrice } from "@/lib/amm";
import { useStore } from "@/lib/store";
import { Group } from "@/lib/types";

export default function MarketDetail({ group }: { group: Group }) {
  const { state, toggleFavorite } = useStore();
  const m = state.markets[group.id];
  const price = spotPrice(m);
  const ch24 = m.baseline24h > 0 ? ((price - m.baseline24h) / m.baseline24h) * 100 : 0;
  const fav = state.favorites.includes(group.id);
  const poolValue = m.fanReserve + m.shareReserve * price; // ≈ 2x Fan$ reserve

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-2 self-stretch justify-center">
        <h3 className="text-lg font-bold">{group.name}</h3>
        <button
          onClick={() => toggleFavorite(group.id)}
          aria-label="관심 목록 토글"
          className={fav ? "text-amber-400" : "text-gray-300 hover:text-gray-400"}
        >
          {fav ? "★" : "☆"}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">
        팔로워 {fmtInt(group.followers)}명
      </p>

      <div className="my-5">
        <Emblem group={group} size={104} />
      </div>

      <p className="text-xs text-gray-500">현재 가격</p>
      <p className="text-3xl font-extrabold mt-1">Fan$ {fmt(price)}</p>
      <p className={`text-sm font-semibold mt-1 ${changeColor(ch24)}`}>
        {fmtPct(ch24)} {ch24 >= 0 ? "▲" : "▼"} Fan$ {fmt(Math.abs(price - m.baseline24h))} (24h)
      </p>

      <dl className="mt-6 w-full text-sm divide-y divide-gray-100 border-t border-gray-100">
        <div className="flex justify-between py-3">
          <dt className="text-gray-500">팬덤 가치 (Fandom Value)</dt>
          <dd className="font-semibold">Fan$ {fmtCompact(price * TOTAL_SHARES)}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-gray-500">풀 가치 (Pool Value)</dt>
          <dd className="font-semibold">Fan$ {fmtCompact(poolValue)}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-gray-500">24h 거래량 (Volume)</dt>
          <dd className="font-semibold">Fan$ {fmtCompact(m.volume24h)}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-gray-500">보유자 (Holders)</dt>
          <dd className="font-semibold">{fmtInt(m.holders)}명</dd>
        </div>
      </dl>
    </div>
  );
}
