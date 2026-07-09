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
import { battleRanking } from "@/lib/battle";
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

  // ── 차트 위 요약 카드 데이터 — 팬덤 배틀 실제 점수/순위 ──
  const battleEntry = battleRanking(state.markets).find(
    (e) => e.groupId === group.id
  );
  const rank = battleEntry?.rank ?? 0;
  const battlePts = battleEntry?.score ?? 0;

  // 총 Fan Shares 지표 — 총량은 고정 (풀 + 유저 보유 + 시스템 보유)
  const myShares = state.holdings[group.id]?.shares ?? 0;
  const userHeld = m.userHeldShares ?? 0;
  const myRatio = (myShares / TOTAL_SHARES) * 100;

  const stats: [string, string][] = [
    ["팬덤 가치 (Fandom Value)", `Fan$ ${fmtCompact(price * TOTAL_SHARES)}`],
    ["24h 거래량", `Fan$ ${fmtCompact(m.volume24h)}`],
    ["총 Fan Shares", fmtCompact(TOTAL_SHARES)],
    ["풀 잔여량 (Pool Shares)", fmtCompact(m.shareReserve)],
    ["유저 보유량", fmtCompact(userHeld)],
    ["보유자 수", `${fmtInt(m.holders)}명`],
    [
      "내 보유 비율",
      myShares > 0 ? `${myRatio < 0.001 ? "<0.001" : myRatio.toFixed(3)}%` : "0%",
    ],
    ["풀 가치 (Pool Value)", `Fan$ ${fmtCompact(poolValue)}`],
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
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-3 border-t border-gray-100 pt-4">
            {stats.map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] text-gray-400">{label}</p>
                <p className="text-sm font-bold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-gray-300 leading-relaxed">
            Fan Shares는 Bias Market 안에서만 사용하는 가상 팬덤 자산이며, 실제
            주식·소유권·투자상품을 의미하지 않습니다. 총 Fan Shares는 종목당{" "}
            {fmtInt(TOTAL_SHARES)}개로 고정되어 있고, 거래 시 풀과 보유자 사이를
            이동할 뿐 새로 발행되거나 소각되지 않습니다.
          </p>
        </div>

        {/* Main grid — 모바일 순서: 거래 패널 → 차트 → 배틀 요약 → 최근 거래 → 그룹 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Trade panel — first on mobile, right on desktop */}
          <aside className="lg:col-span-4 lg:order-2 flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
              <TradePanel group={group} onBuySuccess={() => setShareOpen(true)} />
            </div>
            <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 shadow-card p-5">
              <GroupInfoCard group={group} />
            </div>
          </aside>

          {/* Chart + recent trades */}
          <section className="lg:col-span-8 lg:order-1 flex flex-col gap-5">
            {/* 차트 위 요약 카드 — 내용 수정은 여기서 (모바일에선 차트 다음) */}
            <div className="order-2 lg:order-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-card px-4 py-3 flex items-center gap-3">
                <span className="text-lg" aria-hidden>
                  {ch24 >= 0 ? "📈" : "📉"}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 truncate">
                    오늘 {group.name} Fan Shares
                  </p>
                  <p className={`text-sm font-bold ${changeColor(ch24)}`}>
                    {fmtPct(ch24)} {ch24 >= 0 ? "상승 중" : "하락 중"}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-card px-4 py-3 flex items-center gap-3">
                <span className="text-lg" aria-hidden>📊</span>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 truncate">24시간 거래량</p>
                  <p className="text-sm font-bold">Fan$ {fmtCompact(m.volume24h)}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-card px-4 py-3 flex items-center gap-3">
                <span className="text-lg" aria-hidden>🏆</span>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 truncate">오늘의 팬덤 배틀</p>
                  <p className="text-sm font-bold">
                    #{rank} · {battlePts.toFixed(1)} pts
                  </p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 bg-white rounded-2xl border border-gray-200 shadow-card p-4 sm:p-5">
              <PriceChart groupId={group.id} price={price} />
            </div>
            <div className="order-3 bg-white rounded-2xl border border-gray-200 shadow-card p-4 sm:p-5">
              <RecentTrades groupId={group.id} price={price} />
            </div>
            {/* 그룹 정보 — 모바일에서는 맨 아래 */}
            <div className="order-4 lg:hidden bg-white rounded-2xl border border-gray-200 shadow-card p-4 sm:p-5">
              <GroupInfoCard group={group} />
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
