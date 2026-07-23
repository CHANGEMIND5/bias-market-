"use client";

// 모바일 전용 하단 탭바 — 데스크톱(lg)에서는 숨김, 사이드바 네비를 대체.
import { BarChart3, Gift, MessageCircle, Trophy, Wallet, type LucideIcon } from "lucide-react";
import { View } from "./Sidebar";
import { TKey, useLang } from "@/lib/i18n";

const TABS: { view: View; labelKey: TKey; icon: LucideIcon }[] = [
  { view: "market", labelKey: "nav.market", icon: BarChart3 },
  { view: "ranking", labelKey: "nav.ranking", icon: Trophy },
  { view: "portfolio", labelKey: "nav.portfolio", icon: Wallet },
  { view: "community", labelKey: "nav.community", icon: MessageCircle },
  { view: "missions", labelKey: "nav.missions", icon: Gift },
];

export default function MobileTabBar({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (v: View) => void;
}) {
  const { t } = useLang();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
      <div
        className="flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((tab) => {
          const active = view === tab.view;
          const Icon = tab.icon;
          return (
            <button
              key={tab.view}
              onClick={() => onNavigate(tab.view)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
                active ? "text-violet-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} aria-hidden />
              <span className="text-[10px] font-semibold">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
