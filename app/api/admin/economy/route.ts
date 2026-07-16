import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { INVARIANT_EPS, num } from "@/lib/economy";
import { GROUP_MAP } from "@/lib/mockData";

export const dynamic = "force-dynamic";

/** 관리자 전용 — 마켓별 준비금/공급 불변식 진단 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const [markets, heldAgg, starterCounts, botAgg] = await Promise.all([
    prisma.market.findMany(),
    prisma.holding.groupBy({ by: ["groupId"], _sum: { shares: true } }),
    prisma.starterPortfolioAllocation.groupBy({
      by: ["marketId"],
      _count: { _all: true },
    }),
    prisma.trade.groupBy({
      by: ["groupId", "side"],
      where: { isSystem: true },
      _sum: { fan: true },
      _count: { _all: true },
    }),
  ]);
  const heldMap = new Map(
    heldAgg.map((h: any) => [h.groupId, num(h._sum?.shares)])
  );
  const starterMap = new Map(
    starterCounts.map((s: any) => [s.marketId, s._count?._all ?? 0])
  );
  const botMap = new Map<string, { buys: number; sells: number; buyFan: number; sellFan: number }>();
  for (const b of botAgg as any[]) {
    const cur = botMap.get(b.groupId) ?? { buys: 0, sells: 0, buyFan: 0, sellFan: 0 };
    if (b.side === "buy") {
      cur.buys = b._count?._all ?? 0;
      cur.buyFan = b._sum?.fan ?? 0;
    } else {
      cur.sells = b._count?._all ?? 0;
      cur.sellFan = b._sum?.fan ?? 0;
    }
    botMap.set(b.groupId, cur);
  }

  const rows = markets.map((m) => {
    const g = GROUP_MAP[m.groupId];
    const pool = num(m.shareReserve);
    const reserve = num(m.systemReserveShares);
    const held = heldMap.get(m.groupId) ?? 0;
    const total = pool + reserve + held;
    const expected = num(m.totalFanShares);
    const bot = botMap.get(m.groupId);
    return {
      groupId: m.groupId,
      name: g?.name ?? m.groupId,
      tier: g?.tier ?? "?",
      visible: !!(g && g.category === "group" && g.defaultVisible !== false),
      economyVersion: m.economyVersion ?? 1,
      initialPrice: num(m.initialPrice),
      currentPrice: pool > 0 ? num(m.fanReserve) / pool : 0,
      poolShares: pool,
      reserveShares: reserve,
      userHeldShares: held,
      starterDistributed: num(m.starterSharesDistributed),
      starterUserCount: starterMap.get(m.groupId) ?? 0,
      treasuryFan: num(m.systemTreasuryFan),
      botBuys: bot?.buys ?? 0,
      botSells: bot?.sells ?? 0,
      invariantOk:
        (m.economyVersion ?? 1) < 2 || Math.abs(total - expected) <= INVARIANT_EPS,
      lowReserve: reserve < num(m.initialReserveShares) * 0.1,
    };
  });

  return NextResponse.json({ ok: true, rows });
}
