import { todayString } from "./format";

// ─────────────────────────────────────────────────────────────
// 게임 레이어 로컬 데이터 (localStorage 키: bias-market-game-v1)
// 방문 스트릭, 공유 횟수, 뱃지 획득일 — 서버 데이터와 독립적
// ─────────────────────────────────────────────────────────────

export interface GameData {
  shareCopies: number; // 공유 문구 복사 횟수
  streak: number; // 연속 방문 일수
  lastVisit: string | null; // YYYY-MM-DD
  badgeEarned: Record<string, string>; // badgeId → 획득일
}

export const DEFAULT_GAME: GameData = {
  shareCopies: 0,
  streak: 0,
  lastVisit: null,
  badgeEarned: {},
};

const KEY = "bias-market-game-v1";

export function loadGame(): GameData {
  if (typeof window === "undefined") return DEFAULT_GAME;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_GAME;
    return { ...DEFAULT_GAME, ...(JSON.parse(raw) as Partial<GameData>) };
  } catch {
    return DEFAULT_GAME;
  }
}

export function saveGame(g: GameData): GameData {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(g));
    } catch {
      // ignore
    }
  }
  return g;
}

/** 오늘 방문 기록 + 연속 방문 스트릭 갱신 */
export function withVisit(g: GameData): GameData {
  const today = todayString();
  if (g.lastVisit === today) return g;
  const y = new Date(Date.now() - 86_400_000);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
  const streak = g.lastVisit === yesterday ? g.streak + 1 : 1;
  return { ...g, lastVisit: today, streak };
}
