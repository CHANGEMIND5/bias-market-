import type { Market } from "@prisma/client";
import { prisma } from "./db";
import { GROUPS, INITIAL_POOL } from "./mockData";

/**
 * Make sure every group in mockData has a Market row in the DB.
 *
 * 안전한 upsert: "없는 마켓만" 생성합니다. 이미 존재하는 마켓의
 * 가격·리저브·거래·보유는 절대 건드리지 않습니다 (데이터 보존).
 *
 * 신규 마켓 초기화 (티어 기반):
 *   initialPoolShares = 1,000,000 (총 Fan Shares와 동일 — 발행/소각 없음)
 *   initialPoolFan   = seedPrice × 1,000,000
 *   → initialPrice   = initialPoolFan / initialPoolShares = seedPrice
 */
export async function ensureMarkets(): Promise<Market[]> {
  const existing = await prisma.market.findMany();
  const have = new Set(existing.map((m) => m.groupId));
  const missing = GROUPS.filter((g) => !have.has(g.id));
  if (missing.length === 0) return existing;

  await prisma.market.createMany({
    data: missing.map((g) => {
      const shareReserve = INITIAL_POOL;
      const fanReserve = g.seedPrice * INITIAL_POOL;
      const price = fanReserve / shareReserve;
      return {
        groupId: g.id,
        fanReserve,
        shareReserve,
        baseline1h: price / (1 + g.seedChange1h / 100),
        baseline24h: price / (1 + g.seedChange24h / 100),
        baseline7d: price / (1 + g.seedChange7d / 100),
        volume24h: g.seedVolume24h,
        holders: g.seedHolders,
      };
    }),
  });
  return prisma.market.findMany();
}
