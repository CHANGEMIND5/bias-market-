// 팬덤 배틀 데이터 접근 레이어
// 현재는 클라이언트에서 마켓 상태로부터 계산 (lib/battle.ts).
// TODO: Replace with server-side battle season table (Supabase) later.
import { battleRanking } from "../battle";
import { MarketState } from "../types";

export function getBattleScores(markets: Record<string, MarketState>) {
  return battleRanking(markets);
}
