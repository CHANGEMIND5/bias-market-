/** 시드 분류 상태 — Bias Market 내부 분류일 뿐, 공식 활동 상태 주장이 아님 */
export type SeedStatus =
  | "active_candidate"
  | "rookie_candidate"
  | "legacy_candidate"
  | "hidden";

/**
 * 마켓 티어 — Bias Market 내부 시뮬레이션 분류.
 * 실제 인기·활동량·매출·팬덤 규모·아티스트 가치를 의미하지 않음.
 * mega/large/mid/rookie = 기본 노출, legacy = 레거시 필터에서만, hidden = 미노출
 */
export type MarketTier =
  | "mega"
  | "large"
  | "mid"
  | "rookie"
  | "legacy"
  | "hidden";

export type GroupGender = "boy" | "girl" | "coed";

export type Generation =
  | "1st" | "2nd" | "3rd" | "4th" | "5th" | "rookie" | "unknown";

export interface Group {
  id: string; // slug 역할 (소문자, 하이픈, ASCII)
  name: string; // displayName — 글로벌/영문/로마자 표기 (로케일 불변)
  /** "group" = 그룹 종목, "member" = 멤버 개인 종목 (marketType) */
  category: "group" | "member";
  /** 멤버 종목일 때 소속 그룹의 id */
  parentGroup?: string;
  koreanName?: string; // 한글 원어 표기 (한국어 UI 보조 표시용)
  aliases?: string[]; // 검색 별칭: 한글, 영문, 옛 이름, 약칭
  koreanFandomName?: string;
  gender?: GroupGender; // 보이/걸/혼성 (멤버는 소속 그룹 기준)
  generation?: Generation;
  seedStatus?: SeedStatus; // 기본 active_candidate
  tier?: MarketTier; // 마켓 티어 (내부 시뮬레이션 분류)
  defaultVisible?: boolean; // 메인 마켓 기본 노출 여부 (기본 true)
  sourceNote?: string;
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
  totalFanShares?: number; // 고정 총량 (1,000,000)
  systemReserveShares?: number; // 풀 밖 시스템 준비금 (스타터/봇용)
  starterSharesDistributed?: number;
  economyVersion?: number;
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
  fanIn?: number; // 역산 매수(quoteBuyShares)에서 실제 청구할 Fan$
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
