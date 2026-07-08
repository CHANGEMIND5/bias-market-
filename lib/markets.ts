import type { Market } from "@prisma/client";
import { prisma } from "./db";
import { GROUPS, INITIAL_POOL } from "./mockData";

/**
 * Make sure every group in mockData has a Market row in the DB.
 * Reserves are seeded on the constant-product curve (k = INITIAL_POOL²)
 * exactly like the localStorage version did.
 */
export async function ensureMarkets(): Promise<Market[]> {
  const existing = await prisma.market.findMany();
  const have = new Set(existing.map((m) => m.groupId));
  const missing = GROUPS.filter((g) => !have.has(g.id));
  if (missing.length === 0) return existing;

  await prisma.market.createMany({
    data: missing.map((g) => {
      const sqrtP = Math.sqrt(g.seedPrice);
      const fanReserve = INITIAL_POOL * sqrtP;
      const shareReserve = INITIAL_POOL / sqrtP;
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
