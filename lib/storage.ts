import { INITIAL_POOL, GROUPS, STARTING_BALANCE } from "./mockData";
import { AppState, MarketState } from "./types";

const STORAGE_KEY = "bias-market-state-v1";

/** Build the initial state for a first-time visitor. */
export function initialState(): AppState {
  const markets: Record<string, MarketState> = {};
  for (const g of GROUPS) {
    // Derive reserves on the constant-product curve so k = INITIAL_POOL²
    const sqrtP = Math.sqrt(g.seedPrice);
    const fanReserve = INITIAL_POOL * sqrtP;
    const shareReserve = INITIAL_POOL / sqrtP;
    const price = fanReserve / shareReserve;
    markets[g.id] = {
      groupId: g.id,
      fanReserve,
      shareReserve,
      baseline1h: price / (1 + g.seedChange1h / 100),
      baseline24h: price / (1 + g.seedChange24h / 100),
      baseline7d: price / (1 + g.seedChange7d / 100),
      volume24h: g.seedVolume24h,
      holders: g.seedHolders,
    };
  }
  return {
    balance: STARTING_BALANCE,
    holdings: {},
    markets,
    trades: [],
    favorites: [],
    lastRewardDate: null,
    xp: 0,
  };
}

export function loadState(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (typeof parsed.balance !== "number" || !parsed.markets) return null;
    // Merge in any groups added to mockData after the user first saved state
    const fresh = initialState();
    for (const id of Object.keys(fresh.markets)) {
      if (!parsed.markets[id]) parsed.markets[id] = fresh.markets[id];
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full / private mode — ignore for MVP
  }
}

export function resetState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
