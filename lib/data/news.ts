// 팬덤 마켓 뉴스 생성 레이어 — 앱 내부 가상 데이터에서만 생성
// TODO: Replace with server-generated news feed (Supabase) later.
import { battleRanking } from "../battle";
import { fmtInt, fmtPct, todayString } from "../format";
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

const TIMES = ["2분 전", "15분 전", "1시간 전", "2시간 전", "3시간 전", "5시간 전"];

export function getMarketNews(
  markets: Record<string, MarketState>
): NewsItem[] {
  const ranking = battleRanking(markets);
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
}
