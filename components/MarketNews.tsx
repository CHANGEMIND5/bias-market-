"use client";

import { useMemo } from "react";
import Emblem from "./Emblem";
import { getMarketNews, NewsItem } from "@/lib/data/news";
import { GROUP_MAP } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function MarketNews({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { state } = useStore();

  // 뉴스 생성 로직은 lib/data/news.ts 에서 수정
  const news = useMemo<NewsItem[]>(
    () => getMarketNews(state.markets),
    [state.markets]
  );

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
