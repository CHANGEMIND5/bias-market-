"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CommunityView from "@/components/CommunityView";
import HistoryView from "@/components/HistoryView";
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
            <MarketTable selectedId="" onSelect={goToMarket} />
          )}

          {view === "watchlist" && (
            <MarketTable selectedId="" onSelect={goToMarket} favoritesOnly />
          )}

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
