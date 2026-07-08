import { fmtInt } from "./format";
import { GameData } from "./game";
import { AppState } from "./types";

// ─────────────────────────────────────────────────────────────
// 뱃지 정의 + 획득 규칙 — 규칙 수정은 이 파일에서
// 뱃지는 가상 활동에 대한 인정일 뿐, 금전적 보상이 아닙니다.
// ─────────────────────────────────────────────────────────────

export const TOP_HOLDER_THRESHOLD = 5_000; // 상위 10% 홀더 데모 기준 (Fan$)

export interface BadgeStatus {
  id: string;
  icon: string;
  name: string;
  desc: string;
  unlocked: boolean;
  progress?: string; // 잠금 상태일 때 진행도 표시
  earnedDate?: string;
}

export function computeBadges(opts: {
  state: AppState;
  portfolioValue: number;
  battleTopGroupId: string | null;
  game: GameData;
}): BadgeStatus[] {
  const { state, portfolioValue, battleTopGroupId, game } = opts;

  const buys = state.trades.filter((t) => t.side === "buy").length;
  const tradeCount = state.trades.length;
  const boosted = state.favorites.some(
    (f) => (state.holdings[f]?.shares ?? 0) > 0
  );
  const topHolder = portfolioValue >= TOP_HOLDER_THRESHOLD;
  const champion =
    battleTopGroupId !== null &&
    (state.holdings[battleTopGroupId]?.shares ?? 0) > 0;

  const defs = [
    {
      id: "early", icon: "⭐", name: "초기 서포터",
      desc: "첫 Fan Shares 매수 완료",
      unlocked: buys >= 1,
      lockedProgress: `${Math.min(buys, 1)} / 1 매수`,
    },
    {
      id: "volume", icon: "📊", name: "거래량 기여자",
      desc: "3회 이상 거래 완료",
      unlocked: tradeCount >= 3,
      lockedProgress: `${Math.min(tradeCount, 3)} / 3 거래`,
    },
    {
      id: "booster", icon: "🚀", name: "팬덤 부스터",
      desc: "관심 팬덤의 Fan Shares 보유",
      unlocked: boosted,
      lockedProgress: "관심 그룹 매수 시 획득",
    },
    {
      id: "top10", icon: "🏅", name: "상위 10% 홀더",
      desc: `보유 가치 ${fmtInt(TOP_HOLDER_THRESHOLD)} Fan$ 이상 (데모 기준)`,
      unlocked: topHolder,
      lockedProgress: `${fmtInt(Math.min(portfolioValue, TOP_HOLDER_THRESHOLD))} / ${fmtInt(TOP_HOLDER_THRESHOLD)} Fan$`,
    },
    {
      id: "share", icon: "📣", name: "공유 마스터",
      desc: "공유 문구 3회 이상 복사",
      unlocked: game.shareCopies >= 3,
      lockedProgress: `${Math.min(game.shareCopies, 3)} / 3 공유`,
    },
    {
      id: "streak", icon: "🔥", name: "7일 연속 팬",
      desc: "7일 연속 방문",
      unlocked: game.streak >= 7,
      lockedProgress: `${Math.min(game.streak, 7)} / 7 일`,
    },
    {
      id: "champion", icon: "👑", name: "시즌 챔피언",
      desc: "배틀 1위 팬덤의 서포터",
      unlocked: champion,
      lockedProgress: "1위 팬덤 보유 시 획득",
    },
  ];

  return defs.map((d) => ({
    id: d.id,
    icon: d.icon,
    name: d.name,
    desc: d.desc,
    unlocked: d.unlocked,
    progress: d.unlocked ? undefined : d.lockedProgress,
    earnedDate: game.badgeEarned[d.id],
  }));
}

// ─────────────────────────────────────────────────────────────
// 팬덤 영향력 점수 — 가중치 수정은 여기서
// ─────────────────────────────────────────────────────────────
export function fanInfluence(opts: {
  portfolioValue: number;
  tradeCount: number;
  shareCount: number;
  battleParticipation: number;
  badgeCount: number;
}): number {
  return Math.round(
    opts.portfolioValue * 0.01 +
      opts.tradeCount * 10 +
      opts.shareCount * 25 +
      opts.battleParticipation * 50 +
      opts.badgeCount * 100
  );
}

export function influenceTitle(pts: number): string {
  if (pts <= 500) return "신규 서포터";
  if (pts <= 2000) return "상위 50% 서포터";
  if (pts <= 5000) return "상위 25% 서포터";
  return "상위 12% 서포터";
}
