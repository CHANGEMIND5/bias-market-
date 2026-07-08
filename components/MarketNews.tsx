"use client";

import { useMemo } from "react";
import Emblem from "./Emblem";
import { spotPrice } from "@/lib/amm";
import { battleRanking } from "@/lib/battle";
import { fmtInt, fmtPct } from "@/lib/format";
import { GROUP_MAP } from "@/lib/mockData";
import { hashString, mulberry32 } from "@/lib/rng";
import { todayString } from "@/lib/format";
import { useStore } from "@/lib/store";

interface NewsItem {
  icon: string;
  message: string;
  groupId: string;
  timeAgo: string;
  trend?: "up" | "down";
}

const TIMES = ["2분 전", "15분 전", "1시간 전", "2시간 전", "3시간 전", "5시간 전"];

export default function MarketNews({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { state } = useStore();

  // 앱 내부 가상 마켓 데이터에서 뉴스 생성 — 수정은 이 useMemo에서
  const news = useMemo<NewsItem[]>(() => {
    const ranking = battleRanking(state.markets);
    if (ranking.length < 3) return [];
    const items: NewsItem[] = [];

    // 1) 24h 거래량 1위
    const topVol = [...ranking].sort((a, b) => b.volume - a.volume)[0];
    items.push({
      icon: "🔥",
      message: `${GROUP_MAP[topVol.groupId]?.name}가 24h 거래량 1위를 기록했습니다.`,
      groupId: topVol.groupId,
      timeAgo: TIMES[0],
      trend: "up",
    });

    // 2) 24h 최고 상승
    const topGain = [...ranking].sort((a, b) => b.ch24 - a.ch24)[0];
    if (topGain.ch24 > 0.01) {
      items.push({
        icon: "🚀",
        message: `${GROUP_MAP[topGain.groupId]?.name}가 24시간 만에 ${fmtPct(topGain.ch24)} 상승했습니다.`,
        groupId: topGain.groupId,
        timeAgo: TIMES[1],
        trend: "up",
      });
    }

    // 3) 배틀 2위
    const second = ranking[1];
    items.push({
      icon: "👀",
      message: `${GROUP_MAP[second.groupId]?.name}가 팬덤 배틀 2위로 올라섰습니다.`,
      groupId: second.groupId,
      timeAgo: TIMES[2],
    });

    // 4) 홀더 수 마일스톤
    const topHolders = [...ranking].sort((a, b) => b.holders - a.holders)[0];
    if (topHolders.holders >= 10) {
      const milestone = Math.pow(10, Math.floor(Math.log10(topHolders.holders)));
      items.push({
        icon: "🎉",
        message: `${GROUP_MAP[topHolders.groupId]?.name} 홀더 수가 ${fmtInt(milestone)}명을 돌파했습니다.`,
        groupId: topHolders.groupId,
        timeAgo: TIMES[3],
        trend: "up",
      });
    }

    // 5) 거래량 급증 (전일 대비 — 모의 % · 날짜 시드 기반)
    const rand = mulberry32(hashString(`news-${todayString()}`));
    const surge = ranking[Math.floor(rand() * Math.min(5, ranking.length))];
    items.push({
      icon: "📈",
      message: `${GROUP_MAP[surge.groupId]?.name} 거래량이 전일 대비 ${Math.round(80 + rand() * 120)}% 증가했습니다.`,
      groupId: surge.groupId,
      timeAgo: TIMES[4],
      trend: "up",
    });

    // 6) 최고 하락 (있을 때만)
    const topLoss = [...ranking].sort((a, b) => a.ch24 - b.ch24)[0];
    if (topLoss.ch24 < -0.01) {
      items.push({
        icon: "🧊",
        message: `${GROUP_MAP[topLoss.groupId]?.name}가 24시간 동안 ${fmtPct(topLoss.ch24)} 조정 중입니다.`,
        groupId: topLoss.groupId,
        timeAgo: TIMES[5],
        trend: "down",
      });
    }

    return items.slice(0, 6);
  }, [state.markets]);

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <h2 className="text-lg font-bold">팬덤 마켓 뉴스</h2>
      <p className="text-sm text-gray-500 mt-0.5">
        실시간 팬덤 마켓 소식을 빠르게 확인하세요.
      </p>

      <div className="mt-4 flex flex-col divide-y divide-gray-50">
        {news.map((n, i) => {
          const g = GROUP_MAP[n.groupId];
          return (
            <button
              key={i}
              onClick={() => onSelect(n.groupId)}
              className="flex items-center gap-3 py-3 text-left hover:bg-gray-50 rounded-lg px-2 transition-colors"
            >
              <span className="text-lg shrink-0" aria-hidden>
                {n.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">{n.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  {g && <Emblem group={g} size={14} />}
                  <span className="text-[11px] text-gray-400">{g?.name}</span>
                  <span className="text-[11px] text-gray-300">· {n.timeAgo}</span>
                  {n.trend && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        n.trend === "up"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      {n.trend === "up" ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-gray-300">
        팬덤 마켓 뉴스는 앱 내부 가상 데이터 기반 알림입니다.
      </p>
    </section>
  );
}
