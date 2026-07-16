// ─────────────────────────────────────────────────────────────
// 미션/보상 설정 (클라이언트·서버 공용)
// 새 미션 추가: 풀에 한 줄 + lib/i18n.tsx에 제목 키 추가하면 끝.
// 모든 시간 기준은 KST(UTC+9)로 통일.
// ─────────────────────────────────────────────────────────────
import { hashString } from "./rng";

export const KST_OFFSET_MS = 9 * 3600_000;

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
export function kstDateKey(now = Date.now()): string {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** KST 기준 이번 주 월요일 날짜 → 주간 키 */
export function kstWeekKey(now = Date.now()): string {
  const d = new Date(now + KST_OFFSET_MS);
  const day = d.getUTCDay(); // 0=일
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** 다음 KST 자정까지 남은 ms */
export function msToKstMidnight(now = Date.now()): number {
  const k = now + KST_OFFSET_MS;
  const next = Math.ceil(k / 86_400_000) * 86_400_000;
  return next - k;
}

// ── 일일 미션 풀 ─────────────────────────────────────────────
export interface MissionDef {
  type: string;
  titleKey: string; // i18n 키
  target: number;
}

export const DAILY_POOL: MissionDef[] = [
  { type: "visit_markets_3", titleKey: "dm.visit3", target: 3 },
  { type: "add_watchlist_1", titleKey: "dm.fav1", target: 1 },
  { type: "trade_1", titleKey: "dm.trade1", target: 1 },
  { type: "view_battle", titleKey: "dm.battle", target: 1 },
  { type: "view_portfolio", titleKey: "dm.portfolio", target: 1 },
  { type: "view_charts_2", titleKey: "dm.charts2", target: 2 },
  { type: "read_post_1", titleKey: "dm.post1", target: 1 },
  { type: "visit_rookie_1", titleKey: "dm.rookie1", target: 1 },
];

export const WEEKLY_POOL: MissionDef[] = [
  { type: "w_daily_missions_12", titleKey: "wm.daily12", target: 12 },
  { type: "w_visit_markets_10", titleKey: "wm.visit10", target: 10 },
  { type: "w_trade_days_3", titleKey: "wm.tradeDays3", target: 3 },
  { type: "w_battle_days_4", titleKey: "wm.battleDays4", target: 4 },
  { type: "w_watchlist_5", titleKey: "wm.fav5", target: 5 },
  { type: "w_rookie_3", titleKey: "wm.rookie3", target: 3 },
  { type: "w_portfolio_days_4", titleKey: "wm.portfolioDays4", target: 4 },
  { type: "w_trades_5", titleKey: "wm.trades5", target: 5 },
  { type: "w_read_posts_5", titleKey: "wm.posts5", target: 5 },
];

export const ONBOARDING_STEPS: MissionDef[] = [
  { type: "ob_fav_first", titleKey: "ob.s1", target: 1 }, // 최애 팬덤 선택 (관심 1개)
  { type: "ob_fav_3", titleKey: "ob.s2", target: 3 }, // 관심 그룹 3개
  { type: "ob_market_visit", titleKey: "ob.s3", target: 1 },
  { type: "ob_first_trade", titleKey: "ob.s4", target: 1 },
  { type: "ob_portfolio", titleKey: "ob.s5", target: 1 },
  { type: "ob_battle", titleKey: "ob.s6", target: 1 },
];

/** 날짜 시드로 결정적 선택 — 모든 유저가 같은 날 같은 미션을 받음 */
function pick<T>(pool: T[], count: number, seed: string): T[] {
  const arr = [...pool];
  let h = hashString(seed);
  const out: T[] = [];
  while (out.length < count && arr.length > 0) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(arr.splice(h % arr.length, 1)[0]);
  }
  return out;
}

export function pickDailyMissions(dateKey: string): MissionDef[] {
  return pick(DAILY_POOL, 3, `daily-${dateKey}`);
}

export function pickWeeklyMissions(weekKey: string): MissionDef[] {
  return pick(WEEKLY_POOL, 5, `weekly-${weekKey}`);
}

// ── 보상 수치 (Fan$ 일일 상한 2,000 유지) ────────────────────
export const REWARDS = {
  // 출석 스트릭이 곧 일일 체크인 보상 (기본 500 대체, 7일차만 특별)
  streakFan: [300, 400, 500, 500, 600, 700, 1000],
  streakXp: [50, 60, 70, 80, 90, 100, 200],
  perMissionInfluence: 100,
  perMissionXp: 50,
  dailyAllFan: 1000,
  dailyAllInfluence: 200,
  dailyAllXp: 100,
  dailyBonusFan: 500,
  weeklyFan: 2500,
  weeklyInfluence: 1000,
  weeklyXp: 1000,
  onboardingFan: 1500,
  onboardingInfluence: 500,
  onboardingXp: 500,
} as const;
