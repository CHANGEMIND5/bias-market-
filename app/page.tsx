"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import CommunityView from "@/components/CommunityView";
import GroupInfoCard from "@/components/GroupInfoCard";
import HistoryView from "@/components/HistoryView";
import MarketDetail from "@/components/MarketDetail";
import MarketTable from "@/components/MarketTable";
import MissionsView from "@/components/MissionsView";
import PortfolioCard from "@/components/PortfolioCard";
import PriceChart from "@/components/PriceChart";
import RecentTrades from "@/components/RecentTrades";
import SharePreview from "@/components/SharePreview";
import Sidebar, { View } from "@/components/Sidebar";
import Toasts from "@/components/Toast";
import TradePanel from "@/components/TradePanel";
import { spotPrice } from "@/lib/amm";
import { DISCLAIMER_EN, DISCLAIMER_KO, GROUPS, GROUP_MAP } from "@/lib/mockData";
import { StoreProvider, useStore } from "@/lib/store";

function Dashboard() {
  const { state, hydrated } = useStore();
  const [view, setView] = useState<View>("market");
  const [selectedId, setSelectedId] = useState(GROUPS[0].id);
  const [shareOpen, setShareOpen] = useState(false);

  const group = GROUP_MAP[selectedId] ?? GROUPS[0];
  const market = state.markets[group.id];
  const price = spotPrice(market);
  const ch24 =
    market.baseline24h > 0
      ? ((price - market.baseline24h) / market.baseline24h) * 100
      : 0;

  const selectAndShowMarket = (id: string) => {
    setSelectedId(id);
    setView("market");
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-6 flex flex-col lg:flex-row gap-5">
        <Sidebar view={view} onNavigate={setView} />

        <main className="flex-1 min-w-0 flex flex-col gap-5" style={{ opacity: hydrated ? 1 : 0.4 }}>
          {view === "market" && (
            <>
              <MarketTable selectedId={selectedId} onSelect={setSelectedId} />

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Detail summary */}
                <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-card p-5">
                  <MarketDetail group={group} />
                </div>

                {/* Chart + recent trades */}
                <div className="xl:col-span-6 bg-white rounded-2xl border border-gray-200 shadow-card p-5 flex flex-col gap-5">
                  <PriceChart groupId={group.id} price={price} />
                  <RecentTrades groupId={group.id} price={price} />
                </div>

                {/* Trade panel + group info */}
                <div className="xl:col-span-3 flex flex-col gap-5">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
                    <TradePanel group={group} onBuySuccess={() => setShareOpen(true)} />
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
                    <GroupInfoCard group={group} />
                  </div>
                </div>
              </div>
            </>
          )}

          {view === "watchlist" && (
            <MarketTable
              selectedId={selectedId}
              onSelect={selectAndShowMarket}
              favoritesOnly
            />
          )}

          {view === "portfolio" && <PortfolioCard onSelect={selectAndShowMarket} />}
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

      {shareOpen && (
        <SharePreview
          group={group}
          change24h={ch24}
          onClose={() => setShareOpen(false)}
        />
      )}
      <Toasts />
    </div>
  );
}

export default function Page() {
  return (
    <SessionProvider>
      <StoreProvider>
        <Dashboard />
      </StoreProvider>
    </SessionProvider>
  );
}
