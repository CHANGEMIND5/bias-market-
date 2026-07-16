import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { quoteBuy, quoteSell } from "@/lib/amm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureMarkets } from "@/lib/markets";
import { GROUP_MAP, MIN_BUY, MIN_SELL } from "@/lib/mockData";
import { processFirstTradeReferral } from "@/lib/referral";
import { recordEvent } from "@/lib/rewards";

export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return bad("Google 로그인 후 거래할 수 있어요.", 401);

  const body = await req.json().catch(() => null);
  const groupId: string = body?.groupId;
  const side: string = body?.side;
  const amount = Number(body?.amount);
  if (!groupId || !GROUP_MAP[groupId]) return bad("존재하지 않는 그룹입니다.");
  if (side !== "buy" && side !== "sell") return bad("잘못된 주문 유형입니다.");
  if (!isFinite(amount) || amount <= 0) return bad("금액/수량을 입력해 주세요.");

  await ensureMarkets();
  const [user, market, holding] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.market.findUnique({ where: { groupId } }),
    prisma.holding.findUnique({
      where: { userId_groupId: { userId, groupId } },
    }),
  ]);
  if (!user) return bad("계정을 찾을 수 없습니다. 다시 로그인해 주세요.", 401);
  if (!market) return bad("마켓을 찾을 수 없습니다.");

  if (side === "buy") {
    if (amount < MIN_BUY) return bad(`최소 매수 금액은 ${MIN_BUY} Fan$입니다.`);
    if (amount > user.balance) return bad("보유 Fan$가 부족합니다.");
    const q = quoteBuy(market, amount);
    if (!q) return bad("견적을 계산할 수 없습니다.");

    const isNewHolder = !holding || holding.shares <= 0;
    const [updatedUser, updatedMarket, updatedHolding, trade] =
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { balance: { decrement: amount }, xp: { increment: 25 } },
        }),
        prisma.market.update({
          where: { groupId },
          data: {
            fanReserve: q.newFanReserve,
            shareReserve: q.newShareReserve,
            volume24h: { increment: amount },
            holders: { increment: isNewHolder ? 1 : 0 },
          },
        }),
        prisma.holding.upsert({
          where: { userId_groupId: { userId, groupId } },
          update: {
            shares: { increment: q.sharesOut },
            cost: { increment: amount },
          },
          create: { userId, groupId, shares: q.sharesOut, cost: amount },
        }),
        prisma.trade.create({
          data: {
            userId, groupId, side: "buy",
            price: q.execPrice, shares: q.sharesOut, fan: amount, fee: q.fee,
          },
        }),
        prisma.pricePoint.create({
          data: { groupId, price: q.newFanReserve / q.newShareReserve },
        }),
      ]);

    // 첫 거래 초대 보상 (조건 미충족 시 0)
    let refBonus = 0;
    try {
      refBonus = await processFirstTradeReferral(userId);
    } catch {
      // 보상 실패가 거래를 막으면 안 됨
    }
    // 미션 진행 (성공한 유저 거래만 — 시스템 거래는 이 경로에 오지 않음)
    try {
      await recordEvent(userId, "trade_completed", groupId);
    } catch {
      // ignore
    }

    return NextResponse.json({
      ok: true,
      balance: updatedUser.balance + refBonus,
      xp: updatedUser.xp,
      market: updatedMarket,
      holding: { shares: updatedHolding.shares, cost: updatedHolding.cost },
      trade: { ...serializeTrade(trade) },
      refBonus,
    });
  }

  // sell
  if (amount < MIN_SELL) return bad(`최소 매도 수량은 ${MIN_SELL} Fan Share입니다.`);
  const owned = holding?.shares ?? 0;
  if (amount > owned + 1e-9) return bad("보유 Fan Shares가 부족합니다.");
  const q = quoteSell(market, amount);
  if (!q) return bad("견적을 계산할 수 없습니다.");

  const remaining = owned - amount;
  const soldAll = remaining < 1e-6;
  const costRemoved = holding ? holding.cost * (amount / owned) : 0;

  const holdingOp = soldAll
    ? prisma.holding.delete({ where: { userId_groupId: { userId, groupId } } })
    : prisma.holding.update({
        where: { userId_groupId: { userId, groupId } },
        data: { shares: remaining, cost: (holding?.cost ?? 0) - costRemoved },
      });

  const [updatedUser, updatedMarket, , trade] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: q.fanOut }, xp: { increment: 25 } },
    }),
    prisma.market.update({
      where: { groupId },
      data: {
        fanReserve: q.newFanReserve,
        shareReserve: q.newShareReserve,
        volume24h: { increment: q.fanOutBeforeFee },
        holders: { decrement: soldAll ? 1 : 0 },
      },
    }),
    holdingOp,
    prisma.trade.create({
      data: {
        userId, groupId, side: "sell",
        price: q.execPrice, shares: amount, fan: q.fanOut, fee: q.fee,
      },
    }),
    prisma.pricePoint.create({
      data: { groupId, price: q.newFanReserve / q.newShareReserve },
    }),
  ]);

  // 첫 거래 초대 보상 (조건 미충족 시 0)
  let refBonus = 0;
  try {
    refBonus = await processFirstTradeReferral(userId);
  } catch {
    // 보상 실패가 거래를 막으면 안 됨
  }
  // 미션 진행 (성공한 유저 거래만)
  try {
    await recordEvent(userId, "trade_completed", groupId);
  } catch {
    // ignore
  }

  return NextResponse.json({
    ok: true,
    balance: updatedUser.balance + refBonus,
    xp: updatedUser.xp,
    market: updatedMarket,
    holding: soldAll
      ? null
      : { shares: remaining, cost: (holding?.cost ?? 0) - costRemoved },
    trade: { ...serializeTrade(trade) },
    refBonus,
  });
}

function serializeTrade(t: {
  id: string; groupId: string; side: string; price: number;
  shares: number; fan: number; fee: number; createdAt: Date;
}) {
  return {
    id: t.id, groupId: t.groupId, side: t.side, price: t.price,
    shares: t.shares, fan: t.fan, fee: t.fee, time: t.createdAt.toISOString(),
  };
}
