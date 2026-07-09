// 거래 데이터 접근 레이어
// TODO: Replace this API implementation with Supabase later.
import { getJSON, sendJSON } from "./api";

/** 종목의 최근 실거래 (모든 유저, 익명) */
export async function getTrades(groupId: string): Promise<any> {
  return getJSON(`/api/trades?groupId=${encodeURIComponent(groupId)}`);
}

/** 매수/매도 실행 — 서버가 AMM 검증·체결 후 결과 반환 */
export async function createTrade(input: {
  groupId: string;
  side: "buy" | "sell";
  amount: number;
}): Promise<any> {
  return sendJSON("/api/trade", input);
}
