import { MarketTier } from "./types";

// ─────────────────────────────────────────────────────────────
// 최종 큐레이션 티어 리스트 — 티어 이동/추가/제외는 이 파일에서
//
// 마켓 티어와 초기 가격은 Bias Market 내부 시뮬레이션 분류이며,
// 실제 인기·활동량·매출·팬덤 규모·아티스트 가치를 의미하지 않습니다.
// (Not an official activity or popularity ranking.)
//
// 여기 리스트에 없는 그룹 + 제외 목록 + 모든 멤버 종목은 hidden 처리됨.
// 데이터는 삭제되지 않고 숨겨지기만 함 (기존 거래/보유/시세 보존).
// ─────────────────────────────────────────────────────────────

export const MEGA_TIER = [
  "BTS", "BLACKPINK", "TWICE", "SEVENTEEN", "Stray Kids", "BIGBANG",
];

export const LARGE_TIER = [
  "aespa", "IVE", "LE SSERAFIM", "NCT", "NCT 127", "NCT DREAM",
  "ENHYPEN", "TXT", "ATEEZ", "RIIZE", "ZEROBASEONE", "BABYMONSTER",
  "Red Velvet", "EXO", "SHINee", "TREASURE", "THE BOYZ", "MONSTA X",
  "DAY6", "BTOB", "ITZY", "NMIXX", "KISS OF LIFE", "STAYC", "tripleS",
  "QWER", "ILLIT", "NewJeans", "GOT7", "WINNER", "iKON", "ASTRO",
];

export const MID_TIER = [
  "BOYNEXTDOOR", "TWS", "P1Harmony", "xikers", "CRAVITY", "EPEX",
  "EVNNE", "PLAVE", "CIX", "ONEUS", "VERIVERY", "ONF", "AB6IX",
  "OnlyOneOf", "MCND", "DRIPPIN", "BAE173", "VANNER", "Xdinary Heroes",
  "TRENDZ", "TEMPEST", "NINE.i", "YOUNITE", "TNX", "ATBO", "The Wind",
  "LUN8", "FANTASY BOYS", "POW", "82MAJOR", "WHIB", "AMPERS&ONE",
  "ONE PACT", "Big Ocean", "TIOT", "DXMON", "B.D.U", "ARrC", "XLOV",
  "NouerA", "fromis_9", "FIFTY FIFTY", "H1-KEY", "VIVIZ", "Kep1er",
  "UNIS", "ARTMS", "Billlie", "Dreamcatcher", "MAMAMOO", "Apink",
  "OH MY GIRL", "WOOAH", "PURPLE KISS", "LIGHTSUM", "cignature",
  "Weeekly", "SECRET NUMBER", "TRI.BE", "ICHILLIN'", "CLASS:y", "X:IN",
  "YOUNG POSSE", "Candy Shop", "VVUP", "BEWAVE", "SF9", "PENTAGON",
  "BBGIRLS", "EVERGLOW", "BLACKSWAN",
];

export const ROOKIE_TIER = [
  "CORTIS", "RESCENE", "Hearts2Hearts", "KiiiKiii", "KickFlip",
  "NEWBEAT", "CLOSE YOUR EYES", "AHOF", "MEOVV", "izna", "BADVILLAIN",
  "MADEIN", "SAY MY NAME", "ODD YOUTH", "LOVEONE", "ifeye", "HITGS",
  "KIIRAS", "Baby DONT Cry", "AtHeart", "NEXZ", "ALLDAY PROJECT",
  "AxMxP", "1Verse", "3way", "CHECKMATE", "CRAXY", "UDTT", "UAU",
];

export const LEGACY_TIER = [
  "Seo Taiji and Boys", "H.O.T.", "SECHSKIES", "NRG", "SHINHWA", "god",
  "SS501", "Wanna One", "X1", "RAINZ", "JBJ", "TO1", "TFN", "MIRAE",
  "TAN", "NU'EST", "B.A.P", "Baby V.O.X", "S.E.S.", "Fin.K.L",
  "Girls' Generation",
  "Wonder Girls", "2NE1", "4minute", "SISTAR", "GFRIEND", "CLC",
  "APRIL", "DIA", "I.O.I", "gugudan", "MOMOLAND", "PRISTIN", "IZ*ONE",
  "Cherry Bullet", "ANS", "HINAPIA", "HOT ISSUE", "NATURE", "Weki Meki",
];

/** 완전 제외 (DB에 이미 있으면 hidden 처리, 삭제하지 않음) */
export const EXCLUDED_GROUPS = [
  "Golden Child", "Rocket Punch", "Loossemble", "Lapillus", "PIXY",
  "Am8ic", "Backstage Boys", "Be Boys", "Blockxy", "DNA", "HIGHSSO",
  "idntt", "IXIA", "N.TOP", "OFF EQUALS", "PLAYNA", "PTMRS", "Skinz",
  "Smorz", "Sweet:ch", "TDYA", "TIMT", "Uspeer", "VVS", "ZooniZini",
  "ALPHA DRIVE ONE", "Epic Travelers", "FLARE U", "Galaxy Kids", "IDID",
  "KEYVITUP", "LNGSHOT", "RE:REVOLUTION", "SEVENTOEIGHT", "TARGET",
  "TST", "TUNEXX", "WATERFIRE", "YUHZ", "ablume", "ACAXIA",
  "ANGEL NOISE", "CrazAngel", "eite", "Free In Sass", "GeeGu",
  "Girls' Alert", "Girls' World", "H//PE Princess", "HONEYZ", "iii",
  "OWIS", "PRISM", "S.I.S", "UNCHILD",
];

// ─────────────────────────────────────────────────────────────
// 티어 설정 — "새로 생성되는 마켓"에만 적용 (기존 라이브 마켓 불변)
// ─────────────────────────────────────────────────────────────
export interface TierConfig {
  initialPriceRange: [number, number];
  initialVolumeRange: [number, number];
  volatilityRange: [number, number];
  botActivityWeight: number;
}

export const MARKET_TIER_CONFIG: Record<MarketTier, TierConfig> = {
  mega: {
    initialPriceRange: [10, 25],
    initialVolumeRange: [50000, 300000],
    volatilityRange: [0.01, 0.05],
    botActivityWeight: 1.8,
  },
  large: {
    initialPriceRange: [4, 12],
    initialVolumeRange: [20000, 120000],
    volatilityRange: [0.02, 0.08],
    botActivityWeight: 1.4,
  },
  mid: {
    initialPriceRange: [1, 5],
    initialVolumeRange: [5000, 40000],
    volatilityRange: [0.03, 0.12],
    botActivityWeight: 1.0,
  },
  rookie: {
    initialPriceRange: [0.3, 2],
    initialVolumeRange: [1000, 20000],
    volatilityRange: [0.06, 0.18],
    botActivityWeight: 1.2,
  },
  legacy: {
    initialPriceRange: [0.1, 1.5],
    initialVolumeRange: [500, 10000],
    volatilityRange: [0.01, 0.06],
    botActivityWeight: 0.4,
  },
  hidden: {
    initialPriceRange: [1, 1],
    initialVolumeRange: [0, 0],
    volatilityRange: [0, 0],
    botActivityWeight: 0,
  },
};

// ─────────────────────────────────────────────────────────────
// 이름 → 티어 해석 (이름 정규화 기반)
// ─────────────────────────────────────────────────────────────
const normTier = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힯]/g, "");

const TIER_LOOKUP = new Map<string, MarketTier>();
for (const [names, tier] of [
  [MEGA_TIER, "mega"],
  [LARGE_TIER, "large"],
  [MID_TIER, "mid"],
  [ROOKIE_TIER, "rookie"],
  [LEGACY_TIER, "legacy"],
] as [string[], MarketTier][]) {
  for (const n of names) TIER_LOOKUP.set(normTier(n), tier);
}
const EXCLUDED_SET = new Set(EXCLUDED_GROUPS.map(normTier));

/**
 * displayName(및 별칭)으로 티어 결정.
 * 제외 목록 → hidden, 큐레이션 리스트에 없음 → hidden.
 */
export function resolveTier(name: string, aliases?: string[]): MarketTier {
  const candidates = [name, ...(aliases ?? [])].map(normTier);
  for (const c of candidates) if (EXCLUDED_SET.has(c)) return "hidden";
  for (const c of candidates) {
    const t = TIER_LOOKUP.get(c);
    if (t) return t;
  }
  return "hidden";
}

/** 티어 → 시드 상태 매핑 (check는 더 이상 존재하지 않음) */
export function tierToStatus(
  tier: MarketTier
): "active_candidate" | "rookie_candidate" | "legacy_candidate" | "hidden" {
  switch (tier) {
    case "mega":
    case "large":
    case "mid":
      return "active_candidate";
    case "rookie":
      return "rookie_candidate";
    case "legacy":
      return "legacy_candidate";
    default:
      return "hidden";
  }
}

export function tierIsVisible(tier: MarketTier | undefined): boolean {
  return tier === "mega" || tier === "large" || tier === "mid" || tier === "rookie";
}

/** 큐레이션 리스트 중 실제 그룹 DB에 매칭되지 않은 이름 찾기 (개발용 점검) */
export function unmatchedCuratedNames(groupNames: string[][]): string[] {
  const have = new Set<string>();
  for (const names of groupNames) for (const n of names) have.add(normTier(n));
  const all = [...MEGA_TIER, ...LARGE_TIER, ...MID_TIER, ...ROOKIE_TIER, ...LEGACY_TIER];
  return all.filter((n) => !have.has(normTier(n)));
}
