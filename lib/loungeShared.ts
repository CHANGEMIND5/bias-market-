// ─────────────────────────────────────────────────────────────
// 팬덤 라운지 — 클라이언트/서버 공용 순수 로직 (prisma 임포트 없음)
// 클라이언트 컴포넌트는 반드시 이 파일에서 import (lib/lounge.ts는 서버 전용)
// ─────────────────────────────────────────────────────────────
import { Group } from "./types";

export type LoungeStatus = "ACTIVE" | "LOCKED" | "DISABLED";
export type PostScope = "GLOBAL" | "MARKET";
export type PostType = "GENERAL" | "MARKET_TALK" | "BATTLE" | "POLL";
export type UserLabel =
  | "STARTER_FANDOM"
  | "FAN_SHARE_HOLDER"
  | "EARLY_BETA"
  | "LOUNGE_REGULAR";

export const POST_TYPES: PostType[] = ["GENERAL", "MARKET_TALK", "BATTLE", "POLL"];
export const SUPPORTER_TARGET = 20; // 자동 활성화 목표 (고유 서포터)
export const MAX_POST_LENGTH = 3000;
export const MAX_TITLE_LENGTH = 120;
export const MAX_COMMENT_LENGTH = 300;

/** 라운지를 가질 수 있는 그룹인가 (그룹 종목 + 노출 + 티어 mega/large/mid/rookie) */
export function loungeEligible(g: Group | undefined): boolean {
  return !!(
    g &&
    g.category === "group" &&
    g.defaultVisible !== false &&
    g.tier &&
    ["mega", "large", "mid", "rookie"].includes(g.tier)
  );
}

/**
 * 저장된 loungeStatus(AUTO 포함) + 티어 + 서포터 수 → 실제 상태.
 * AUTO: mega/large=ACTIVE, mid/rookie=서포터 20명 이상이면 ACTIVE 아니면 LOCKED.
 * 명시적 ACTIVE/LOCKED/DISABLED는 관리자 오버라이드로 그대로 사용.
 */
export function resolveLoungeStatus(
  stored: string | null | undefined,
  g: Group | undefined,
  supporterCount: number
): LoungeStatus {
  if (!loungeEligible(g)) return "DISABLED";
  const s = stored ?? "AUTO";
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "LOCKED") return "LOCKED";
  if (s === "DISABLED") return "DISABLED";
  const tier = g!.tier;
  if (tier === "mega" || tier === "large") return "ACTIVE";
  return supporterCount >= SUPPORTER_TARGET ? "ACTIVE" : "LOCKED";
}

export const RATE = {
  postPer10Min: 1,
  postPerDay: 10,
  commentPerMin: 5,
  commentPerDay: 100,
};
export const MIN_ACCOUNT_AGE_MS = 12 * 3600_000;
export const REPORT_HIDE_THRESHOLD = 3;
export const REPORT_MIN_ACCOUNT_AGE_MS = 24 * 3600_000;
