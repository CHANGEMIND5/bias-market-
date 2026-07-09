// 보유량 데이터 접근 레이어
// TODO: Replace this API implementation with Supabase later.
import { Holding } from "../types";
import { fetchAppState } from "./markets";

/** 로그인 유저의 보유 Fan Shares */
export async function getUserHoldings(): Promise<Record<string, Holding>> {
  const s = await fetchAppState();
  return s.holdings ?? {};
}

// NOTE: updateUserHolding()은 의도적으로 제공하지 않습니다 —
// 보유량은 서버의 createTrade 경로에서만 변경됩니다 (치팅 방지).
