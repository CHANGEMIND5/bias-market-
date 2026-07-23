"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BadgesCard from "@/components/BadgesCard";
import BattleCard from "@/components/BattleCard";
import CollectionBadges from "@/components/CollectionBadges";
import BiasDashboard from "@/components/BiasDashboard";
import CommunityView from "@/components/CommunityView";
import FanProfileCard from "@/components/FanProfileCard";
import HistoryView from "@/components/HistoryView";
import MarketNews from "@/components/MarketNews";
import MarketTable from "@/components/MarketTable";
import MissionsView from "@/components/MissionsView";
import MobileTabBar from "@/components/MobileTabBar";
import Onboarding from "@/components/Onboarding";
import PortfolioCard from "@/components/PortfolioCard";
import SeasonCard from "@/components/SeasonCard";
import Sidebar, { View } from "@/components/Sidebar";
import TrendingStrip from "@/components/TrendingStrip";
import { DISCLAIMER_EN, GROUP_MAP } from "@/lib/mockData";
import { useLang } from "@/lib/i18n";
import { slugFor } from "@/lib/slug";
import { useStore } from "@/lib/store";

export default function Page() {
  const { hydrated } = useStore();
  const { t } = useLang();
  const router = useRouter();
  const [view, setView] = useState<View>("market");

  const goToMarket = (id: string) => {
    const g = GROUP_MAP[id];
    if (g) router.push(`/market/${slugFor(g)}`);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-6 pb-24 lg:pb-6 flex flex-col lg:flex-row gap-5">
        <Sidebar view={view} onNavigate={setView} />

        <main
          className="flex-1 min-w-0 flex flex-col gap-5"
          style={{ opacity: hydrated ? 1 : 0.4 }}
        >
          {/* 마켓 — 거래에 집중: 트렌딩 + 마켓 테이블 + 뉴스 */}
          {view === "market" && (
            <div className="flex flex-col gap-5">
              <TrendingStrip onSelect={goToMarket} />
              <MarketTable selectedId="" onSelect={goToMarket} />
              <MarketNews onSelect={goToMarket} />
            </div>
          )}

          {/* 랭킹 — 경쟁 콘텐츠 한곳에: 팬덤 배틀 + 시즌 */}
          {view === "ranking" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <BattleCard onSelect={goToMarket} />
              <SeasonCard />
            </div>
          )}

          {view === "watchlist" && <BiasDashboard onSelect={goToMarket} />}

          {/* 포트폴리오 — 내 자산·프로필·뱃지·컬렉션 통합 */}
          {view === "portfolio" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              <div className="lg:col-span-2">
                <PortfolioCard onSelect={goToMarket} />
              </div>
              <div className="flex flex-col gap-5">
                <FanProfileCard />
                <BadgesCard />
                <CollectionBadges onSelect={goToMarket} />
              </div>
            </div>
          )}
          {view === "history" && <HistoryView />}
          {view === "community" && <CommunityView />}
          {view === "missions" && <MissionsView />}

          {/* Footer disclaimer */}
          <footer className="text-[11px] leading-relaxed text-gray-400 px-2 pb-6">
            <p>{t("disclaimer")}</p>
            <p className="mt-1.5">{DISCLAIMER_EN}</p>
            <p className="mt-1.5">{t("footer.namesNote")}</p>
            <p className="mt-1.5">{t("footer.tierNote")}</p>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <a href="/privacy" className="underline hover:text-gray-600">
                {t("footer.privacy")}
              </a>
              <a href="/terms" className="underline hover:text-gray-600">
                {t("footer.terms")}
              </a>
              <button
                onClick={() => setView("community")}
                className="underline hover:text-gray-600"
              >
                {t("footer.feedback")}
              </button>
            </p>
          </footer>
        </main>
      </div>

      <MobileTabBar view={view} onNavigate={setView} />
      <Onboarding />
    </div>
  );
}
