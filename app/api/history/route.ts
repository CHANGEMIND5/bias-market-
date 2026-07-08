import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GROUP_MAP } from "@/lib/mockData";
import { genCandles } from "@/lib/rng";

export const dynamic = "force-dynamic";

const CANDLE_COUNT = 60;

// demo volatility per interval size (used only when a market has no trades yet)
function demoVol(minutes: number): number {
  if (minutes <= 1) return 0.004;
  if (minutes <= 5) return 0.008;
  if (minutes <= 15) return 0.012;
  if (minutes <= 30) return 0.016;
  if (minutes <= 60) return 0.02;
  if (minutes <= 240) return 0.035;
  return 0.06;
}

/**
 * GET /api/history?groupId=bts&minutes=60
 * Real OHLCV candles aggregated from Bias Market trade history:
 *   open = first trade price in interval, high/low = max/min,
 *   close = last trade price, volume = sum of trade value (Fan$).
 * Intervals with no trades carry the previous close (flat candle).
 * Markets with no trades at all return demo candles (demo: true).
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

  const [market, trades, prevTrade] = await Promise.all([
    prisma.market.findUnique({ where: { groupId } }),
    prisma.trade.findMany({
      where: { groupId, createdAt: { gte: new Date(start) } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, price: true, fan: true },
    }),
    prisma.trade.findFirst({
      where: { groupId, createdAt: { lt: new Date(start) } },
      orderBy: { createdAt: "desc" },
      select: { price: true },
    }),
  ]);

  const currentPrice = market ? market.fanReserve / market.shareReserve : 1;

  // No trades ever → demo candles from mock price data (MVP fallback)
  if (trades.length === 0 && !prevTrade) {
    const demo = genCandles(
      `${groupId}-demo-${minutes}`,
      CANDLE_COUNT,
      currentPrice,
      demoVol(minutes)
    ).map((c, i) => ({
      t: start + i * bucketMs,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: Math.round(c.volume * 500),
    }));
    return NextResponse.json({ candles: demo, demo: true, price: currentPrice });
  }

  let carry = prevTrade?.price ?? trades[0].price;
  const candles: {
    t: number; open: number; high: number; low: number; close: number; volume: number;
  }[] = [];
  let ti = 0;
  for (let i = 0; i < CANDLE_COUNT; i++) {
    const bEnd = start + (i + 1) * bucketMs;
    let open = carry;
    let high = carry;
    let low = carry;
    let close = carry;
    let volume = 0;
    let first = true;
    while (ti < trades.length && trades[ti].createdAt.getTime() < bEnd) {
      const p = trades[ti].price;
      if (first) {
        open = p;
        high = p;
        low = p;
        first = false;
      } else {
        if (p > high) high = p;
        if (p < low) low = p;
      }
      close = p;
      volume += trades[ti].fan;
      ti++;
    }
    carry = close;
    candles.push({ t: start + i * bucketMs, open, high, low, close, volume });
  }

  // Live candle: sync the latest bucket to the current pool spot price
  const last = candles[CANDLE_COUNT - 1];
  last.close = currentPrice;
  if (currentPrice > last.high) last.high = currentPrice;
  if (currentPrice < last.low) last.low = currentPrice;

  return NextResponse.json({ candles, demo: false, price: currentPrice });
}
