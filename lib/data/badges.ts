// 뱃지 데이터 접근 레이어
// 뱃지 규칙은 lib/badges.ts, 획득일 저장은 localStorage(bias-market-game-v1).
// TODO: Replace localStorage implementation with Supabase later.
import { computeBadges } from "../badges";
import { GameData, saveGame } from "../game";
import { todayString } from "../format";

export const getBadges = computeBadges;

/** 뱃지 획득일 기록 (이미 있으면 그대로) — 갱신된 GameData 반환 */
export function unlockBadge(game: GameData, badgeId: string): GameData {
  if (game.badgeEarned[badgeId]) return game;
  return saveGame({
    ...game,
    badgeEarned: { ...game.badgeEarned, [badgeId]: todayString() },
  });
}
