"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Emblem from "@/components/Emblem";
import MarketTabs from "@/components/MarketTabs";
import PriceChart from "@/components/PriceChart";
import RecentTrades from "@/components/RecentTrades";
import SharePreview from "@/components/SharePreview";
import TradePanel from "@/components/TradePanel";
import { spotPrice } from "@/lib/amm";
import { battleRanking } from "@/lib/battle";
import LangSwitcher from "@/components/LangSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import { changeColor, fmt, fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { loungeEligible } from "@/lib/loungeShared";
import { DISCLAIMER_EN, GROUP_MAP, TOTAL_SHARES } from "@/lib/mockData";
import { resolveSlug } from "@/lib/slug";
import { useStore } from "@/lib/store";

export default function MarketDetailPage() {
  const params = useParams<{ slug: string }>();
  const group = resolveSlug(params?.slug ?? "");
  const { state, hydrated, toggleFavorite, missionEvent, loggedIn } = useStore();
  const { t, lang } = useLang();
  const [shareOpen, setShareOpen] = useState(false);

  // 미션 진행: 마켓 방문 (서버가 hidden/멤버/중복 방문을 걸러냄)
  useEffect(() => {
    if (group && loggedIn) missionEvent("market_viewed", group.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id, loggedIn]);

  if (!group) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-8 text-center">
          <p className="text-lg font-bold">{t("detail.notFound")}</p>
          <p className="text-sm text-gray-500 mt-1">{t("detail.notFoundSub")}</p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
          >
            {t("detail.back")}
          </Link>
        </div>
      </div>
    );
  }

  // 멤버 마켓은 현재 준비 중 — 거래 UI를 노출하지 않음 (데이터는 보존)
  if (group.category === "member") {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-8 text-center max-w-sm">
          <div className="flex justify-center mb-3">
            <Emblem group={group} size={56} />
          </div>
          <p className="text-lg font-bold">{t("detail.memberPrep")}</p>
          <p className="text-sm text-gray-500 mt-1">{t("detail.memberPrepSub")}</p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
          >
            {t("detail.back")}
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
    [t("stat.fandomValue"), `Fan$ ${fmtCompact(price * TOTAL_SHARES)}`],
    [t("stat.volume24h"), `Fan$ ${fmtCompact(m.volume24h)}`],
    [t("stat.totalShares"), fmtCompact(TOTAL_SHARES)],
    [t("stat.poolShares"), fmtCompact(m.shareReserve)],
    [t("stat.userHeld"), fmtCompact(userHeld)],
    [t("stat.holders"), t("stat.holdersUnit", { n: fmtInt(m.holders) })],
    [
      t("stat.myRatio"),
      myShares > 0 ? `${myRatio < 0.001 ? "<0.001" : myRatio.toFixed(3)}%` : "0%",
    ],
    [t("stat.poolValue"), `Fan$ ${fmtCompact(poolValue)}`],
  ];

  return (
    <div className="min-h-screen">
      <div
        className="mx-auto max-w-[1200px] p-4 lg:p-6 flex flex-col gap-5"
        style={{ opacity: hydrated ? 1 : 0.4 }}
      >
        {/* Back link + language */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-1.5 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Bias Market" className="w-6 h-6" />
              <span className="text-sm font-extrabold tracking-tight hidden sm:inline">
                Bias Market
              </span>
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors truncate"
            >
              {t("detail.back")}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitcher compact />
            <ThemeToggle />
          </div>
        </div>

        {/* 마켓 / 팬덤 라운지 탭 (라운지 가능 그룹만) */}
        {loungeEligible(group) && (
          <MarketTabs slug={params?.slug ?? group.id} active="market" />
        )}

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Emblem group={group} size={56} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold">{group.name}</h1>
                  {group.tier && group.tier !== "hidden" && (
                    <span className="px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 text-[10px] font-bold uppercase tracking-wide">
                      {group.tier}
                    </span>
                  )}
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
                {(() => {
                  // 있는 정보만 표시 — 없으면 줄 자체를 숨김 ("-" 표시 금지)
                  const parts = [
                    lang === "ko" && group.koreanName ? group.koreanName : null,
                    parent ? parent.name : null,
                    group.fandom && group.fandom !== "-"
                      ? `${t("detail.fandom")} ${group.fandom}`
                      : null,
                  ].filter(Boolean);
                  return parts.length > 0 ? (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {parts.join(" · ")}
                    </p>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{t("detail.currentPrice")}</p>
              <p className="text-3xl font-extrabold leading-tight">{fmt(price)}</p>
              <p className={`text-sm font-semibold ${changeColor(ch24)}`}>
                {fmtPct(ch24)} ({ch24 >= 0 ? "▲" : "▼"} Fan${" "}
                {fmt(Math.abs(price - m.baseline24h))}) · {t("detail.24h")}
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
            {t("detail.sharesNote")} {t("footer.tierNote")}
          </p>
        </div>

        {/* Main grid — 모바일 순서: 거래 패널 → 차트 → 배틀 요약 → 최근 거래 → 그룹 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Trade panel — first on mobile, right(sticky) on desktop */}
          <aside className="lg:col-span-4 lg:order-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5 lg:sticky lg:top-4">
              <TradePanel group={group} onBuySuccess={() => setShareOpen(true)} />
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
                    {t("sum.today", { name: group.name })}
                  </p>
                  <p className={`text-sm font-bold ${changeColor(ch24)}`}>
                    {fmtPct(ch24)} {ch24 >= 0 ? t("sum.rising") : t("sum.falling")}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-card px-4 py-3 flex items-center gap-3">
                <span className="text-lg" aria-hidden>📊</span>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 truncate">{t("sum.volume")}</p>
                  <p className="text-sm font-bold">Fan$ {fmtCompact(m.volume24h)}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-card px-4 py-3 flex items-center gap-3">
                <span className="text-lg" aria-hidden>🏆</span>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 truncate">{t("sum.battle")}</p>
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
          </section>
        </div>

        {/* Footer disclaimer */}
        <footer className="text-[11px] leading-relaxed text-gray-400 px-2 pb-6">
          <p>{t("disclaimer")}</p>
          <p className="mt-1.5">{DISCLAIMER_EN}</p>
          <p className="mt-1.5">{t("footer.namesNote")}</p>
          <p className="mt-2 flex flex-wrap gap-x-3">
            <Link href="/privacy" className="underline hover:text-gray-600">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="underline hover:text-gray-600">
              {t("footer.terms")}
            </Link>
          </p>
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
