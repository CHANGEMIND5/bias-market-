import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { quoteBuy, quoteSell } from "@/lib/amm";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  assertSupplyInvariant,
  num,
  poolStateOf,
  r8,
  serializeMarket,
} from "@/lib/economy";
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
  const pool = poolStateOf(market);
  const heldShares = num(holding?.shares);
  const heldCost = num(holding?.cost);

  try {
    if (side === "buy") {
      if (amount < MIN_BUY) return bad(`최소 매수 금액은 ${MIN_BUY} Fan$입니다.`);
      if (amount > user.balance) return bad("보유 Fan$가 부족합니다.");
      const q = quoteBuy(pool, amount);
      if (!q) return bad("견적을 계산할 수 없습니다.");

      const isNewHolder = heldShares <= 0;
      const result = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { balance: { decrement: amount }, xp: { increment: 25 } },
        });
        const updatedMarket = await tx.market.update({
          where: { groupId },
          data: {
            fanReserve: r8(q.newFanReserve),
            shareReserve: r8(q.newShareReserve),
            volume24h: { increment: amount },
            holders: { increment: isNewHolder ? 1 : 0 },
          },
        });
        const updatedHolding = await tx.holding.upsert({
          where: { userId_groupId: { userId, groupId } },
          update: {
            shares: r8(heldShares + q.sharesOut),
            cost: r8(heldCost + amount),
          },
          create: { userId, groupId, shares: r8(q.sharesOut), cost: amount },
        });
        const trade = await tx.trade.create({
          data: {
            userId, groupId, side: "buy",
            price: q.execPrice, shares: q.sharesOut, fan: amount, fee: q.fee,
          },
        });
        await tx.pricePoint.create({
          data: { groupId, price: q.newFanReserve / q.newShareReserve },
        });
        // 공급 불변식: 풀 + 준비금 + 유저 보유 = 1,000,000 — 위반 시 전체 롤백
        await assertSupplyInvariant(tx, groupId);
        return { updatedUser, updatedMarket, updatedHolding, trade };
      });

      let refBonus = 0;
      try {
        refBonus = await processFirstTradeReferral(userId);
      } catch {
        // 보상 실패가 거래를 막으면 안 됨
      }
      try {
        await recordEvent(userId, "trade_completed", groupId);
      } catch {
        // ignore
      }

      return NextResponse.json({
        ok: true,
        balance: result.updatedUser.balance + refBonus,
        xp: result.updatedUser.xp,
        market: serializeMarket(result.updatedMarket),
        holding: {
          shares: num(result.updatedHolding.shares),
          cost: num(result.updatedHolding.cost),
        },
        trade: { ...serializeTrade(result.trade) },
        refBonus,
      });
    }

    // sell
    if (amount < MIN_SELL) return bad(`최소 매도 수량은 ${MIN_SELL} Fan Share입니다.`);
    if (amount > heldShares + 1e-9) return bad("보유 Fan Shares가 부족합니다.");
    const q = quoteSell(pool, amount);
    if (!q) return bad("견적을 계산할 수 없습니다.");

    const remaining = heldShares - amount;
    const soldAll = remaining < 1e-6;
    const costRemoved = heldShares > 0 ? heldCost * (amount / heldShares) : 0;

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: q.fanOut }, xp: { increment: 25 } },
      });
      const updatedMarket = await tx.market.update({
        where: { groupId },
        data: {
          fanReserve: r8(q.newFanReserve),
          shareReserve: r8(q.newShareReserve),
          volume24h: { increment: q.fanOutBeforeFee },
          holders: { decrement: soldAll ? 1 : 0 },
        },
      });
      if (soldAll) {
        await tx.holding.delete({
          where: { userId_groupId: { userId, groupId } },
        });
      } else {
        await tx.holding.update({
          where: { userId_groupId: { userId, groupId } },
          data: { shares: r8(remaining), cost: r8(heldCost - costRemoved) },
        });
      }
      const trade = await tx.trade.create({
        data: {
          userId, groupId, side: "sell",
          price: q.execPrice, shares: amount, fan: q.fanOut, fee: q.fee,
        },
      });
      await tx.pricePoint.create({
        data: { groupId, price: q.newFanReserve / q.newShareReserve },
      });
      await assertSupplyInvariant(tx, groupId);
      return { updatedUser, updatedMarket, trade };
    });

    let refBonus = 0;
    try {
      refBonus = await processFirstTradeReferral(userId);
    } catch {
      // 보상 실패가 거래를 막으면 안 됨
    }
    try {
      await recordEvent(userId, "trade_completed", groupId);
    } catch {
      // ignore
    }

    return NextResponse.json({
      ok: true,
      balance: result.updatedUser.balance + refBonus,
      xp: result.updatedUser.xp,
      market: serializeMarket(result.updatedMarket),
      holding: soldAll
        ? null
        : { shares: remaining, cost: heldCost - costRemoved },
      trade: { ...serializeTrade(result.trade) },
      refBonus,
    });
  } catch (e) {
    // 불변식 위반 등 — 트랜잭션 전체 롤백됨
    console.error("[trade] transaction failed:", e);
    return bad("거래를 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
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
