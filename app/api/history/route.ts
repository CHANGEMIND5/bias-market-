import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GROUP_MAP } from "@/lib/mockData";

export const dynamic = "force-dynamic";

const CANDLE_COUNT = 60;

/**
 * GET /api/history?groupId=bts&minutes=60
 * Returns real OHLC candles built from recorded trade price points.
 * Empty buckets carry the previous close forward (flat candle).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId") ?? "";
  const minutes = Math.max(1, Math.min(1440, Number(searchParams.get("minutes")) || 60));
  if (!GROUP_MAP[groupId]) {
    return NextResponse.json({ error: "존재하지 않는 그룹입니다." }, { status: 400 });
  }

  const bucketMs = minutes * 60_000;
  const end = Math.ceil(Date.now() / bucketMs) * bucketMs;
  const start = end - bucketMs * CANDLE_COUNT;

  const [market, points, prev, trades] = await Promise.all([
    prisma.market.findUnique({ where: { groupId } }),
    prisma.pricePoint.findMany({
      where: { groupId, createdAt: { gte: new Date(start) } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pricePoint.findFirst({
      where: { groupId, createdAt: { lt: new Date(start) } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.trade.findMany({
      where: { groupId, createdAt: { gte: new Date(start) } },
      select: { createdAt: true, fan: true },
    }),
  ]);

  const currentPrice = market ? market.fanReserve / market.shareReserve : 1;
  let carry = prev?.price ?? points[0]?.price ?? currentPrice;

  const candles: {
    t: number; open: number; high: number; low: number; close: number; volume: number;
  }[] = [];
  let pi = 0;
  for (let i = 0; i < CANDLE_COUNT; i++) {
    const bStart = start + i * bucketMs;
    const bEnd = bStart + bucketMs;
    const open = carry;
    let high = open;
    let low = open;
    let close = open;
    while (pi < points.length && points[pi].createdAt.getTime() < bEnd) {
      const p = points[pi].price;
      if (p > high) high = p;
      if (p < low) low = p;
      close = p;
      pi++;
    }
    carry = close;
    candles.push({ t: bStart, open, high, low, close, volume: 0 });
  }

  // Live candle: make sure the latest bucket ends at the live spot price
  const last = candles[CANDLE_COUNT - 1];
  last.close = currentPrice;
  if (currentPrice > last.high) last.high = currentPrice;
  if (currentPrice < last.low) last.low = currentPrice;

  // Real volume per bucket (Fan$ traded)
  for (const t of trades) {
    const idx = Math.floor((t.createdAt.getTime() - start) / bucketMs);
    if (idx >= 0 && idx < CANDLE_COUNT) candles[idx].volume += t.fan;
  }

  return NextResponse.json({ candles, price: currentPrice });
}
