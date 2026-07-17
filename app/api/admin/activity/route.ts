import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { num } from "@/lib/economy";
import { GROUP_MAP } from "@/lib/mockData";

export const dynamic = "force-dynamic";

/** GET /api/admin/activity — 24시간 거래 현황 (유저 vs 시스템, 종목별 거래량) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const since = new Date(Date.now() - 24 * 3600_000);
  const [markets, tradeAgg, userCount24, sysCount24, holdersAgg] =
    await Promise.all([
      prisma.market.findMany(),
      // 종목·유형별 24h 거래 건수
      prisma.trade.groupBy({
        by: ["groupId", "isSystem"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.trade.count({ where: { createdAt: { gte: since }, isSystem: false } }),
      prisma.trade.count({ where: { createdAt: { gte: since }, isSystem: true } }),
      prisma.holding.groupBy({
        by: ["groupId"],
        where: { shares: { gt: 0 } },
        _count: { _all: true },
      }),
    ]);

  const userTradeMap = new Map<string, number>();
  const sysTradeMap = new Map<string, number>();
  for (const t of tradeAgg as any[]) {
    (t.isSystem ? sysTradeMap : userTradeMap).set(t.groupId, t._count?._all ?? 0);
  }
  const holderMap = new Map(
    (holdersAgg as any[]).map((h) => [h.groupId, h._count?._all ?? 0])
  );

  let totalVolume = 0;
  const rows = markets
    .map((m) => {
      const g = GROUP_MAP[m.groupId];
      const vol = m.volume24h ?? 0;
      totalVolume += vol;
      const price = num(m.shareReserve) > 0 ? num(m.fanReserve) / num(m.shareReserve) : 0;
      const base = m.baseline24h || price;
      const change = base > 0 ? ((price - base) / base) * 100 : 0;
      return {
        groupId: m.groupId,
        name: g?.name ?? m.groupId,
        tier: g?.tier ?? "?",
        visible: !!(g && g.category === "group" && g.defaultVisible !== false),
        volume24h: vol,
        price,
        change24h: change,
        userTrades: userTradeMap.get(m.groupId) ?? 0,
        systemTrades: sysTradeMap.get(m.groupId) ?? 0,
        holders: holderMap.get(m.groupId) ?? 0,
      };
    })
    .filter((r) => r.visible)
    .sort((a, b) => b.volume24h - a.volume24h);

  return NextResponse.json({
    ok: true,
    totals: {
      volume24h: totalVolume,
      userTrades24h: userCount24,
      systemTrades24h: sysCount24,
      activeMarkets: rows.filter((r) => r.userTrades + r.systemTrades > 0).length,
    },
    rows: rows.slice(0, 40),
  });
}
