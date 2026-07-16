import { FEE_RATE } from "./mockData";
import { BuyQuote, MarketState, SellQuote } from "./types";

// ─────────────────────────────────────────────────────────────
// Constant-product AMM (x · y = k)
//   x = Fan$ reserve, y = Fan Shares reserve
// This is the single source of truth for all swap math.
// ─────────────────────────────────────────────────────────────

/** AMM 계산에 필요한 최소 풀 상태 (서버 Decimal → number 변환값도 허용) */
export type PoolState = Pick<MarketState, "fanReserve" | "shareReserve">;

export function spotPrice(m: PoolState): number {
  return m.fanReserve / m.shareReserve;
}

/** Quote a buy: user pays `fanIn` Fan$, receives Fan Shares. */
export function quoteBuy(m: PoolState, fanIn: number): BuyQuote | null {
  if (!isFinite(fanIn) || fanIn <= 0) return null;
  const x = m.fanReserve;
  const y = m.shareReserve;
  const k = x * y;

  const fee = fanIn * FEE_RATE;
  const effectiveInput = fanIn - fee;
  const newFanReserve = x + effectiveInput;
  const newShareReserve = k / newFanReserve;
  const sharesOut = y - newShareReserve;
  if (sharesOut <= 0) return null;

  const execPrice = fanIn / sharesOut; // includes fee
  const spot = x / y;
  const priceImpact = ((execPrice - spot) / spot) * 100;

  return { fee, effectiveInput, sharesOut, execPrice, priceImpact, newFanReserve, newShareReserve };
}

/** Quote a sell: user gives `sharesIn` Fan Shares, receives Fan$. */
export function quoteSell(m: PoolState, sharesIn: number): SellQuote | null {
  if (!isFinite(sharesIn) || sharesIn <= 0) return null;
  const x = m.fanReserve;
  const y = m.shareReserve;
  const k = x * y;

  const newShareReserve = y + sharesIn;
  const newFanReserve = k / newShareReserve;
  const fanOutBeforeFee = x - newFanReserve;
  const fee = fanOutBeforeFee * FEE_RATE;
  const fanOut = fanOutBeforeFee - fee;
  if (fanOut <= 0) return null;

  const execPrice = fanOut / sharesIn; // includes fee
  const spot = x / y;
  const priceImpact = ((spot - execPrice) / spot) * 100;

  return { fee, fanOut, fanOutBeforeFee, execPrice, priceImpact, newFanReserve, newShareReserve };
}
