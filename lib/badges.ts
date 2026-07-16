import { fmtInt } from "./format";
import { GameData } from "./game";
import { Tfn } from "./i18n";
import { AppState } from "./types";

// ─────────────────────────────────────────────────────────────
// 뱃지 정의 + 획득 규칙 — 규칙 수정은 이 파일, 문구는 lib/i18n.tsx (b.*)
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

export function computeBadges(
  opts: {
    state: AppState;
    portfolioValue: number;
    battleTopGroupId: string | null;
    game: GameData;
    refCount?: number; // 성공한 친구 초대 수
    serverStreak?: number; // 서버 저장 연속 출석 (있으면 우선)
  },
  t: Tfn
): BadgeStatus[] {
  const { state, portfolioValue, battleTopGroupId, game } = opts;
  const refCount = opts.refCount ?? 0;
  const streak = Math.max(opts.serverStreak ?? 0, game.streak);

  const buys = state.trades.filter((tr) => tr.side === "buy").length;
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
      id: "early", icon: "⭐",
      name: t("b.early.name"), desc: t("b.early.desc"),
      unlocked: buys >= 1,
      lockedProgress: t("b.early.prog", { n: Math.min(buys, 1) }),
    },
    {
      id: "volume", icon: "📊",
      name: t("b.volume.name"), desc: t("b.volume.desc"),
      unlocked: tradeCount >= 3,
      lockedProgress: t("b.volume.prog", { n: Math.min(tradeCount, 3) }),
    },
    {
      id: "booster", icon: "🚀",
      name: t("b.booster.name"), desc: t("b.booster.desc"),
      unlocked: boosted,
      lockedProgress: t("b.booster.prog"),
    },
    {
      id: "top10", icon: "🏅",
      name: t("b.top10.name"),
      desc: t("b.top10.desc", { n: fmtInt(TOP_HOLDER_THRESHOLD) }),
      unlocked: topHolder,
      lockedProgress: t("b.top10.prog", {
        a: fmtInt(Math.min(portfolioValue, TOP_HOLDER_THRESHOLD)),
        b: fmtInt(TOP_HOLDER_THRESHOLD),
      }),
    },
    {
      id: "share", icon: "📣",
      name: t("b.share.name"), desc: t("b.share.desc"),
      unlocked: game.shareCopies >= 3,
      lockedProgress: t("b.share.prog", { n: Math.min(game.shareCopies, 3) }),
    },
    {
      id: "streak", icon: "🔥",
      name: t("b.streak.name"), desc: t("b.streak.desc"),
      unlocked: streak >= 7,
      lockedProgress: t("b.streak.prog", { n: Math.min(streak, 7) }),
    },
    {
      id: "champion", icon: "👑",
      name: t("b.champion.name"), desc: t("b.champion.desc"),
      unlocked: champion,
      lockedProgress: t("b.champion.prog"),
    },
    {
      id: "recruiter", icon: "🤝",
      name: t("b.recruiter.name"), desc: t("b.recruiter.desc"),
      unlocked: refCount >= 3,
      lockedProgress: t("b.recruiter.prog", { n: Math.min(refCount, 3) }),
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
  bonus?: number; // 미션 등으로 획득한 영향력 (서버 저장)
}): number {
  return Math.round(
    opts.portfolioValue * 0.01 +
      opts.tradeCount * 10 +
      opts.shareCount * 25 +
      opts.battleParticipation * 50 +
      opts.badgeCount * 100 +
      (opts.bonus ?? 0)
  );
}

export function influenceTitle(pts: number, t: Tfn): string {
  if (pts <= 500) return t("title.newbie");
  if (pts <= 2000) return t("title.top50");
  if (pts <= 5000) return t("title.top25");
  return t("title.top12");
}
