"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Emblem from "@/components/Emblem";
import GroupInfoCard from "@/components/GroupInfoCard";
import PriceChart from "@/components/PriceChart";
import RecentTrades from "@/components/RecentTrades";
import SharePreview from "@/components/SharePreview";
import TradePanel from "@/components/TradePanel";
import { spotPrice } from "@/lib/amm";
import { changeColor, fmt, fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { DISCLAIMER_EN, DISCLAIMER_KO, GROUP_MAP, TOTAL_SHARES } from "@/lib/mockData";
import { resolveSlug } from "@/lib/slug";
import { useStore } from "@/lib/store";

export default function MarketDetailPage() {
  const params = useParams<{ slug: string }>();
  const group = resolveSlug(params?.slug ?? "");
  const { state, hydrated, toggleFavorite } = useStore();
  const [shareOpen, setShareOpen] = useState(false);

  if (!group) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-8 text-center">
          <p className="text-lg font-bold">종목을 찾을 수 없어요</p>
          <p className="text-sm text-gray-500 mt-1">주소를 다시 확인해 주세요.</p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
          >
            ← 전체 마켓으로
          </Link>
        </div>
      </div>
    );
  }

  const m = state.markets[group.id];
  const price = spotPrice(m);
  const ch24 = m.baseline24h > 0 ? ((price - m.baseline24h) / m.baseline24h) * 100 : 0;
  const fav = state.favorites.includes(group.id);
  const poolValue = m.fanReserve + m.shareReserve * price;
  const parent = group.parentGroup ? GROUP_MAP[group.parentGroup] : null;

  const stats: [string, string][] = [
    ["팬덤 가치", `Fan$ ${fmtCompact(price * TOTAL_SHARES)}`],
    ["풀 가치", `Fan$ ${fmtCompact(poolValue)}`],
    ["24h 거래량", `Fan$ ${fmtCompact(m.volume24h)}`],
    ["보유자", `${fmtInt(m.holders)}명`],
  ];

  return (
    <div className="min-h-screen">
      <div
        className="mx-auto max-w-[1200px] p-4 lg:p-6 flex flex-col gap-5"
        style={{ opacity: hydrated ? 1 : 0.4 }}
      >
        {/* Back link */}
        <Link
          href="/"
          className="self-start text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← 전체 마켓으로
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Emblem group={group} size={56} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold">{group.name}</h1>
                  <button
                    onClick={() => toggleFavorite(group.id)}
                    aria-label="관심 목록 토글"
                    className={`text-lg ${
                      fav ? "text-amber-400" : "text-gray-300 hover:text-gray-400"
                    }`}
                  >
                    {fav ? "★" : "☆"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {parent ? `${parent.name} · ` : ""}팬덤 {group.fandom} · 팔로워{" "}
                  {fmtInt(group.followers)}명
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">현재 가격 (Fan$)</p>
              <p className="text-3xl font-extrabold leading-tight">{fmt(price)}</p>
              <p className={`text-sm font-semibold ${changeColor(ch24)}`}>
                {fmtPct(ch24)} ({ch24 >= 0 ? "▲" : "▼"} Fan${" "}
                {fmt(Math.abs(price - m.baseline24h))}) · 24시간
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-gray-100 pt-4">
            {stats.map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] text-gray-400">{label}</p>
                <p className="text-sm font-bold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Trade panel — first on mobile, right on desktop */}
          <aside className="lg:col-span-4 lg:order-2 flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
              <TradePanel group={group} onBuySuccess={() => setShareOpen(true)} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
              <GroupInfoCard group={group} />
            </div>
          </aside>

          {/* Chart + recent trades */}
          <section className="lg:col-span-8 lg:order-1 flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
              <PriceChart groupId={group.id} price={price} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
              <RecentTrades groupId={group.id} price={price} />
            </div>
          </section>
        </div>

        {/* Footer disclaimer */}
        <footer className="text-[11px] leading-relaxed text-gray-400 px-2 pb-6">
          <p>{DISCLAIMER_KO}</p>
          <p className="mt-1.5">{DISCLAIMER_EN}</p>
        </footer>
      </div>

      {shareOpen && (
        <SharePreview
          group={group}
          change24h={ch24}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
