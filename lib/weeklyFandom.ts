// ─────────────────────────────────────────────────────────────
// 주간 팬덤 배틀 — 매주 롤오버 시 지난주 랭킹 스냅샷 (서버 전용)
//
// 배틀은 현재 마켓 상태로 실시간 계산되므로, 지난주 결과를 보려면
// 주가 바뀌는 시점에 현재 랭킹을 "지난주"로 1회 저장해 둡니다.
// KST 기준 매주 일요일 24시(=월요일 0시) 마감.
// ─────────────────────────────────────────────────────────────
import { battleRanking } from "./battle";
import { prisma } from "./db";
import { num } from "./economy";
import { kstWeekKey } from "./missions";
import { MarketState } from "./types";

export interface WeeklyEntry {
  groupId: string;
  rank: number;
  score: number;
  ch24: number;
}

/** DB 마켓 → battleRanking이 쓰는 MarketState 맵 */
async function currentMarketMap(): Promise<Record<string, MarketState>> {
  const markets = await prisma.market.findMany();
  const map: Record<string, MarketState> = {};
  for (const m of markets) {
    map[m.groupId] = {
      groupId: m.groupId,
      fanReserve: num(m.fanReserve),
      shareReserve: num(m.shareReserve),
      baseline1h: m.baseline1h,
      baseline24h: m.baseline24h,
      baseline7d: m.baseline7d,
      volume24h: m.volume24h,
      holders: m.holders,
    } as MarketState;
  }
  return map;
}

/**
 * 지난주 스냅샷이 없으면 현재 랭킹을 지난주 결과로 저장 (주당 1회, 멱등).
 * cron 또는 /api/state에서 호출.
 */
export async function snapshotWeeklyFandomIfNeeded(): Promise<void> {
  const prevWeek = kstWeekKey(Date.now() - 7 * 86_400_000);
  const existing = await prisma.weeklyFandom.findUnique({
    where: { weekKey: prevWeek },
  });
  if (existing) return;

  const map = await currentMarketMap();
  const top = battleRanking(map, "all")
    .slice(0, 10)
    .map((e) => ({
      groupId: e.groupId,
      rank: e.rank,
      score: e.score,
      ch24: e.ch24,
    }));
  if (top.length === 0) return;

  try {
    await prisma.weeklyFandom.create({
      data: { weekKey: prevWeek, data: JSON.stringify(top) },
    });
  } catch {
    // 동시 생성 충돌(unique) = 이미 저장됨
  }
}

/** 가장 최근(지난주) 스냅샷 반환 */
export async function getLastWeekFandom(): Promise<{
  weekKey: string;
  entries: WeeklyEntry[];
} | null> {
  const row = await prisma.weeklyFandom.findFirst({
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  try {
    return { weekKey: row.weekKey, entries: JSON.parse(row.data) };
  } catch {
    return null;
  }
}
