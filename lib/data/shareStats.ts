// 공유 통계 데이터 접근 레이어 (localStorage 키: bias-market-game-v1)
// TODO: Replace localStorage implementation with Supabase later.
import { GameData, loadGame, saveGame } from "../game";

export function getShareStats(): { shareCopies: number } {
  return { shareCopies: loadGame().shareCopies };
}

/** 공유 횟수 +1 — 갱신된 GameData 반환 */
export function updateShareStats(game: GameData): GameData {
  return saveGame({ ...game, shareCopies: game.shareCopies + 1 });
}
