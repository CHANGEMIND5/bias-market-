// 관심 목록 데이터 접근 레이어
// TODO: Replace this API implementation with Supabase later.
import { sendJSON } from "./api";
import { fetchAppState } from "./markets";

export async function getFavorites(): Promise<string[]> {
  const s = await fetchAppState();
  return s.favorites ?? [];
}

/** 관심 토글 — 서버 저장, 갱신된 목록 반환 */
export async function updateFavorite(groupId: string): Promise<any> {
  return sendJSON("/api/favorite", { groupId });
}
