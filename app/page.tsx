"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BadgesCard from "@/components/BadgesCard";
import BattleCard from "@/components/BattleCard";
import BiasDashboard from "@/components/BiasDashboard";
import CommunityView from "@/components/CommunityView";
import FanProfileCard from "@/components/FanProfileCard";
import HistoryView from "@/components/HistoryView";
import MarketNews from "@/components/MarketNews";
import MarketTable from "@/components/MarketTable";
import MissionsView from "@/components/MissionsView";
import PortfolioCard from "@/components/PortfolioCard";
import Sidebar, { View } from "@/components/Sidebar";
import { DISCLAIMER_EN, DISCLAIMER_KO, GROUP_MAP } from "@/lib/mockData";
import { slugFor } from "@/lib/slug";
import { useStore } from "@/lib/store";

export default function Page() {
  const { hydrated } = useStore();
  const router = useRouter();
  const [view, setView] = useState<View>("market");

  const goToMarket = (id: string) => {
    const g = GROUP_MAP[id];
    if (g) router.push(`/market/${slugFor(g)}`);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-6 flex flex-col lg:flex-row gap-5">
        <Sidebar view={view} onNavigate={setView} />

        <main
          className="flex-1 min-w-0 flex flex-col gap-5"
          style={{ opacity: hydrated ? 1 : 0.4 }}
        >
          {view === "market" && (
            /* 모바일 순서: 배틀 → 최애 대시보드 → 마켓 테이블 → 뉴스 → 프로필 → 뱃지
               데스크톱: 테이블 전체 폭 → (배틀/대시보드/뉴스 | 프로필/뱃지) 2단 */
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="order-3 xl:order-1 xl:col-span-3">
                <MarketTable selectedId="" onSelect={goToMarket} />
              </div>
              <div className="order-1 xl:order-2 xl:col-span-2">
                <BattleCard onSelect={goToMarket} />
              </div>
              <div className="order-5 xl:order-3 xl:row-span-3 flex flex-col gap-5">
                <FanProfileCard />
                <BadgesCard />
              </div>
              <div className="order-2 xl:order-4 xl:col-span-2">
                <BiasDashboard onSelect={goToMarket} />
              </div>
              <div className="order-4 xl:order-5 xl:col-span-2">
                <MarketNews onSelect={goToMarket} />
              </div>
            </div>
          )}

          {view === "watchlist" && <BiasDashboard onSelect={goToMarket} />}

          {view === "portfolio" && <PortfolioCard onSelect={goToMarket} />}
          {view === "history" && <HistoryView />}
          {view === "community" && <CommunityView />}
          {view === "missions" && <MissionsView />}

          {/* Footer disclaimer */}
          <footer className="text-[11px] leading-relaxed text-gray-400 px-2 pb-6">
            <p>{DISCLAIMER_KO}</p>
            <p className="mt-1.5">{DISCLAIMER_EN}</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
