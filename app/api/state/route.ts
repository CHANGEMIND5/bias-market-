import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { num, serializeMarket } from "@/lib/economy";
import { runMarketActivityBot } from "@/lib/marketActivityBot";
import { ensureMarkets } from "@/lib/markets";
import { STARTING_BALANCE } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureMarkets();

  // 시스템 가상 거래 봇 — 30분 이상 지났으면 밀린 활동 생성
  try {
    await runMarketActivityBot();
  } catch {
    // 봇 실패가 상태 조회를 막으면 안 됨
  }

  // 마켓 상태 + 그룹별 전체 유저 보유량 합계 (총 Fan Shares 지표용)
  const [markets, heldAgg] = await Promise.all([
    prisma.market.findMany(),
    prisma.holding.groupBy({ by: ["groupId"], _sum: { shares: true } }),
  ]);
  const heldMap = new Map(
    heldAgg.map((h: any) => [h.groupId, num(h._sum?.shares)])
  );
  const marketMap = Object.fromEntries(
    markets.map((m) => [
      m.groupId,
      { ...serializeMarket(m), userHeldShares: heldMap.get(m.groupId) ?? 0 },
    ])
  );

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

  // 초대 코드가 없으면 생성 (6자리, 충돌 시 재시도)
  if (!user.refCode) {
    for (let i = 0; i < 5; i++) {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      try {
        user = await prisma.user.update({
          where: { id: userId },
          data: { refCode: code },
        });
        break;
      } catch {
        // 코드 충돌 — 재시도
      }
    }
  }

  const [holdings, favorites, trades, rewardState, starter] =
    await Promise.all([
      prisma.holding.findMany({ where: { userId } }),
      prisma.favorite.findMany({ where: { userId } }),
      prisma.trade.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.userRewardState.findUnique({ where: { userId } }),
      prisma.starterPortfolio.findUnique({
        where: { userId },
        select: { status: true },
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
      refCode: user.refCode,
      refCount: user.refCount,
      hasReferrer: !!user.referredBy,
      influence: user.influence,
      streak: rewardState?.currentStreak ?? 0,
      checkedInToday:
        rewardState?.lastCheckInDate ===
        new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10),
      starterStatus: starter?.status ?? "NOT_STARTED",
    },
    holdings: Object.fromEntries(
      holdings.map((h) => [
        h.groupId,
        { shares: num(h.shares), cost: num(h.cost) },
      ])
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
