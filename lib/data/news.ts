// 팬덤 마켓 뉴스 생성 레이어 — 앱 내부 가상 데이터에서만 생성
// 문구 수정은 lib/i18n.tsx의 news.* 키에서
// TODO: Replace with server-generated news feed (Supabase) later.
import { battleRanking } from "../battle";
import { fmtInt, fmtPct, todayString } from "../format";
import { Tfn } from "../i18n";
import { GROUP_MAP } from "../mockData";
import { hashString, mulberry32 } from "../rng";
import { MarketState } from "../types";

export interface NewsItem {
  icon: string;
  message: string;
  groupId: string;
  timeAgo: string;
  trend?: "up" | "down";
}

export function getMarketNews(
  markets: Record<string, MarketState>,
  t: Tfn
): NewsItem[] {
  const ranking = battleRanking(markets);
  if (ranking.length < 3) return [];
  const items: NewsItem[] = [];
  const times = [
    t("time.minAgo", { n: 2 }),
    t("time.minAgo", { n: 15 }),
    t("time.hourAgo", { n: 1 }),
    t("time.hourAgo", { n: 2 }),
    t("time.hourAgo", { n: 3 }),
    t("time.hourAgo", { n: 5 }),
  ];
  const nameOf = (id: string) => GROUP_MAP[id]?.name ?? id;

  // 1) 24h 거래량 1위
  const topVol = [...ranking].sort((a, b) => b.volume - a.volume)[0];
  items.push({
    icon: "🔥",
    message: t("news.topVol", { name: nameOf(topVol.groupId) }),
    groupId: topVol.groupId,
    timeAgo: times[0],
    trend: "up",
  });

  // 2) 24h 최고 상승
  const topGain = [...ranking].sort((a, b) => b.ch24 - a.ch24)[0];
  if (topGain.ch24 > 0.01) {
    items.push({
      icon: "🚀",
      message: t("news.topGain", {
        name: nameOf(topGain.groupId),
        pct: fmtPct(topGain.ch24),
      }),
      groupId: topGain.groupId,
      timeAgo: times[1],
      trend: "up",
    });
  }

  // 3) 배틀 2위
  const second = ranking[1];
  items.push({
    icon: "👀",
    message: t("news.second", { name: nameOf(second.groupId) }),
    groupId: second.groupId,
    timeAgo: times[2],
  });

  // 4) 홀더 수 마일스톤
  const topHolders = [...ranking].sort((a, b) => b.holders - a.holders)[0];
  if (topHolders.holders >= 10) {
    const milestone = Math.pow(10, Math.floor(Math.log10(topHolders.holders)));
    items.push({
      icon: "🎉",
      message: t("news.holders", {
        name: nameOf(topHolders.groupId),
        n: fmtInt(milestone),
      }),
      groupId: topHolders.groupId,
      timeAgo: times[3],
      trend: "up",
    });
  }

  // 5) 거래량 급증 (전일 대비 — 모의 % · 날짜 시드 기반)
  const rand = mulberry32(hashString(`news-${todayString()}`));
  const surge = ranking[Math.floor(rand() * Math.min(5, ranking.length))];
  items.push({
    icon: "📈",
    message: t("news.surge", {
      name: nameOf(surge.groupId),
      n: Math.round(80 + rand() * 120),
    }),
    groupId: surge.groupId,
    timeAgo: times[4],
    trend: "up",
  });

  // 6) 최고 하락 (있을 때만)
  const topLoss = [...ranking].sort((a, b) => a.ch24 - b.ch24)[0];
  if (topLoss.ch24 < -0.01) {
    items.push({
      icon: "🧊",
      message: t("news.cooling", {
        name: nameOf(topLoss.groupId),
        pct: fmtPct(topLoss.ch24),
      }),
      groupId: topLoss.groupId,
      timeAgo: times[5],
      trend: "down",
    });
  }

  return items.slice(0, 6);
}
