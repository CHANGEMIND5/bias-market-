// Deterministic pseudo-random generator for mock chart/trade data.

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Generate `count` mock candles ending exactly at `endPrice`,
 * deterministic for a given seed string.
 */
export function genCandles(
  seedStr: string,
  count: number,
  endPrice: number,
  volatility: number
): Candle[] {
  const rand = mulberry32(hashString(seedStr));
  // Walk closes backwards from endPrice
  const closes: number[] = new Array(count);
  closes[count - 1] = endPrice;
  for (let i = count - 2; i >= 0; i--) {
    const drift = (rand() - 0.48) * volatility;
    closes[i] = Math.max(0.01, closes[i + 1] / (1 + drift));
  }
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const open = i === 0 ? closes[0] * (1 + (rand() - 0.5) * volatility * 0.5) : closes[i - 1];
    const close = closes[i];
    const hi = Math.max(open, close);
    const lo = Math.min(open, close);
    const high = hi * (1 + rand() * volatility * 0.4);
    const low = lo * (1 - rand() * volatility * 0.4);
    const volume = 0.2 + rand() * 0.8 + (Math.abs(close - open) / open) * 20;
    candles.push({ open, high, low, close, volume });
  }
  return candles;
}
