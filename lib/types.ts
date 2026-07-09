export interface Group {
  id: string;
  name: string;
  /** "group" = 그룹 종목, "member" = 멤버 개인 종목 */
  category: "group" | "member";
  /** 멤버 종목일 때 소속 그룹의 id */
  parentGroup?: string;
  fandom: string;
  debut: string;
  platforms: string;
  followers: number;
  lastComeback: string;
  status: string;
  gradient: [string, string];
  /** Seed values used only to initialize the mock market on first visit */
  seedPrice: number;
  seedChange1h: number;
  seedChange24h: number;
  seedChange7d: number;
  seedVolume24h: number;
  seedHolders: number;
}

export interface MarketState {
  groupId: string;
  fanReserve: number; // x — Fan$ in the pool
  shareReserve: number; // y — Fan Shares in the pool (풀 잔여량)
  systemShares?: number; // 시스템 봇 보유량 (총량 보존)
  userHeldShares?: number; // 전체 유저 보유량 합계 (서버 집계)
  baseline1h: number; // price 1h ago (for % change)
  baseline24h: number;
  baseline7d: number;
  volume24h: number;
  holders: number;
}

export type TradeSide = "buy" | "sell";

export interface Trade {
  id: string;
  groupId: string;
  side: TradeSide;
  price: number; // execution price (Fan$ per Fan Share)
  shares: number;
  fan: number; // total Fan$ (input for buy, output for sell)
  fee: number;
  time: string; // ISO timestamp
}

export interface Holding {
  shares: number;
  cost: number; // total Fan$ spent (basis) for average buy price
}

export interface AppState {
  balance: number;
  holdings: Record<string, Holding>;
  markets: Record<string, MarketState>;
  trades: Trade[];
  favorites: string[];
  lastRewardDate: string | null; // YYYY-MM-DD of last daily reward claim
  xp: number;
}

export interface BuyQuote {
  fee: number;
  effectiveInput: number;
  sharesOut: number;
  execPrice: number;
  priceImpact: number; // percentage
  newFanReserve: number;
  newShareReserve: number;
}

export interface SellQuote {
  fee: number;
  fanOut: number;
  fanOutBeforeFee: number;
  execPrice: number;
  priceImpact: number;
  newFanReserve: number;
  newShareReserve: number;
}
