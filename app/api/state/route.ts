import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureMarkets } from "@/lib/markets";
import { STARTING_BALANCE } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function GET() {
  const markets = await ensureMarkets();
  const marketMap = Object.fromEntries(markets.map((m) => [m.groupId, m]));

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({
      markets: marketMap,
      user: null,
      holdings: {},
      favorites: [],
      trades: [],
    });
  }

  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId,
        email: session?.user?.email ?? `${userId}@no-email.local`,
        name: session?.user?.name,
        image: session?.user?.image,
        balance: STARTING_BALANCE,
      },
    });
  }

  const [holdings, favorites, trades] = await Promise.all([
    prisma.holding.findMany({ where: { userId } }),
    prisma.favorite.findMany({ where: { userId } }),
    prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    markets: marketMap,
    user: {
      balance: user.balance,
      xp: user.xp,
      lastRewardDate: user.lastRewardDate,
      name: user.name,
      image: user.image,
      isAdmin: isAdminEmail(session?.user?.email),
    },
    holdings: Object.fromEntries(
      holdings.map((h) => [h.groupId, { shares: h.shares, cost: h.cost }])
    ),
    favorites: favorites.map((f) => f.groupId),
    trades: trades.map((t) => ({
      id: t.id,
      groupId: t.groupId,
      side: t.side,
      price: t.price,
      shares: t.shares,
      fan: t.fan,
      fee: t.fee,
      time: t.createdAt.toISOString(),
    })),
  });
}
