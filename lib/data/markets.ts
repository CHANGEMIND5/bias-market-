// 마켓 데이터 접근 레이어
// TODO: Replace this API/localStorage implementation with Supabase later.
import { resolveSlug } from "../slug";
import { Group, MarketState } from "../types";
import { getJSON } from "./api";

/** 전체 앱 상태 스냅샷 (마켓 + 로그인 유저 데이터) */
export async function fetchAppState(): Promise<any> {
  return getJSON("/api/state");
}

/** 전체 마켓 상태 */
export async function getMarkets(): Promise<Record<string, MarketState>> {
  const s = await fetchAppState();
  return s.markets ?? {};
}

/** 슬러그/ID로 종목 메타데이터 조회 (동기 — 정적 mock 데이터) */
export function getMarketBySlug(slug: string): Group | null {
  return resolveSlug(slug);
}

/** OHLCV 캔들 히스토리 */
export async function getMarketHistory(
  groupId: string,
  minutes: number
): Promise<any> {
  return getJSON(
    `/api/history?groupId=${encodeURIComponent(groupId)}&minutes=${minutes}`
  );
}

// NOTE: updateMarket()은 의도적으로 제공하지 않습니다 —
// 마켓 상태(풀 리저브)는 서버의 createTrade 경로에서만 변경됩니다.
