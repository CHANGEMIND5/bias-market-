import type { Market } from "@prisma/client";
import { prisma } from "./db";
import {
  ECONOMY_VERSION,
  INITIAL_POOL_SHARES,
  INITIAL_RESERVE_SHARES,
  TOTAL_FAN_SHARES,
} from "./economy";
import { GROUPS } from "./mockData";

/**
 * Make sure every group in mockData has a Market row in the DB.
 *
 * 안전한 create-only: "없는 마켓만" 생성합니다. 이미 존재하는 마켓의
 * 가격·리저브·거래·보유는 절대 건드리지 않습니다 (데이터 보존).
 *
 * 이코노미 v2 초기화 (티어 기반 시작가는 g.seedPrice):
 *   totalFanShares      = 1,000,000 (발행/소각 없음)
 *   poolShares          =   600,000 (AMM 풀)
 *   systemReserveShares =   400,000 (스타터/미션 보상·봇용 준비금)
 *   poolFan             = seedPrice × 600,000  →  시작가 = seedPrice
 */
export function v2MarketInit(
  g: {
    id: string;
    seedPrice: number;
    seedVolume24h: number;
  },
  startPrice?: number // 지정 시 시작가 override (시즌 성과 반영용). 기본은 seedPrice.
) {
  const shareReserve = INITIAL_POOL_SHARES;
  const price = startPrice && startPrice > 0 ? startPrice : g.seedPrice;
  const fanReserve = price * INITIAL_POOL_SHARES;
  return {
    groupId: g.id,
    fanReserve,
    shareReserve,
    totalFanShares: TOTAL_FAN_SHARES,
    systemReserveShares: INITIAL_RESERVE_SHARES,
    initialReserveShares: INITIAL_RESERVE_SHARES,
    systemTreasuryFan: 0,
    starterSharesDistributed: 0,
    missionSharesDistributed: 0,
    systemBotNetShares: 0,
    initialPrice: price,
    economyVersion: ECONOMY_VERSION,
    baseline1h: price,
    baseline24h: price,
    baseline7d: price,
    volume24h: 0,
    holders: 0,
  };
}

export async function ensureMarkets(): Promise<Market[]> {
  const existing = await prisma.market.findMany();
  const have = new Set(existing.map((m) => m.groupId));
  const missing = GROUPS.filter((g) => !have.has(g.id));
  if (missing.length === 0) return existing;

  await prisma.market.createMany({ data: missing.map(v2MarketInit) });
  return prisma.market.findMany();
}
