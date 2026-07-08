import { Group } from "./types";

// ─────────────────────────────────────────────────────────────
// ECONOMY SETTINGS — edit these to tune the simulator
// ─────────────────────────────────────────────────────────────
export const STARTING_BALANCE = 10_000; // Fan$ granted on first visit
export const DAILY_REWARD = 2_000; // Fan$ per daily claim
export const FEE_RATE = 0.003; // 0.3% swap fee
export const MIN_BUY = 10; // minimum buy in Fan$
export const MIN_SELL = 1; // minimum sell in Fan Shares
export const INITIAL_POOL = 1_000_000; // 1,000,000 Fan$ + 1,000,000 Fan Shares at price 1
export const TOTAL_SHARES = 1_000_000; // total Fan Shares per group (for 팬덤 가치)

// Every market starts from the spec pool (1,000,000 Fan$ × 1,000,000 Fan Shares,
// k = 1e12, price = 1 Fan$). `seedPrice` simulates fan trading that already
// happened before the user arrives: reserves are derived on the constant-product
// curve as x = INITIAL_POOL·√p, y = INITIAL_POOL/√p so k stays exactly 1e12.
// Set every seedPrice to 1 if you want all groups to start fresh at 1 Fan$.

// ─────────────────────────────────────────────────────────────
// GROUPS — add or remove groups here (no official logos/photos;
// emblems are abstract CSS gradients defined by `gradient`)
// ─────────────────────────────────────────────────────────────
export const GROUPS: Group[] = [
  {
    id: "bts", name: "BTS", fandom: "ARMY", debut: "2013-06-13",
    platforms: "Weverse / YouTube / X", followers: 32_450_000,
    lastComeback: "2025-05-17", status: "활동 중",
    gradient: ["#a78bfa", "#f0abfc"],
    seedPrice: 52.34, seedChange1h: -0.21, seedChange24h: 6.28, seedChange7d: 14.35,
    seedVolume24h: 1_312_450, seedHolders: 128_450,
  },
  {
    id: "blackpink", name: "BLACKPINK", fandom: "BLINK", debut: "2016-08-08",
    platforms: "YouTube / Instagram / X", followers: 28_930_000,
    lastComeback: "2025-11-07", status: "활동 중",
    gradient: ["#f9a8d4", "#111827"],
    seedPrice: 41.78, seedChange1h: 0.18, seedChange24h: 3.47, seedChange7d: 9.72,
    seedVolume24h: 1_041_870, seedHolders: 112_030,
  },
  {
    id: "ive", name: "IVE", fandom: "DIVE", debut: "2021-12-01",
    platforms: "YouTube / Instagram / TikTok", followers: 12_840_000,
    lastComeback: "2026-02-02", status: "활동 중",
    gradient: ["#fca5a5", "#fcd34d"],
    seedPrice: 28.61, seedChange1h: -0.37, seedChange24h: 2.11, seedChange7d: 7.33,
    seedVolume24h: 778_920, seedHolders: 84_210,
  },
  {
    id: "aespa", name: "aespa", fandom: "MY", debut: "2020-11-17",
    platforms: "Weverse / YouTube / TikTok", followers: 14_210_000,
    lastComeback: "2025-10-21", status: "활동 중",
    gradient: ["#67e8f9", "#818cf8"],
    seedPrice: 26.14, seedChange1h: 0.41, seedChange24h: -1.24, seedChange7d: 1.88,
    seedVolume24h: 653_240, seedHolders: 79_540,
  },
  {
    id: "seventeen", name: "SEVENTEEN", fandom: "CARAT", debut: "2015-05-26",
    platforms: "Weverse / YouTube / X", followers: 18_760_000,
    lastComeback: "2025-09-29", status: "활동 중",
    gradient: ["#f9a8d4", "#93c5fd"],
    seedPrice: 24.87, seedChange1h: 0.12, seedChange24h: 1.63, seedChange7d: 4.21,
    seedVolume24h: 612_330, seedHolders: 88_760,
  },
  {
    id: "straykids", name: "Stray Kids", fandom: "STAY", debut: "2018-03-25",
    platforms: "YouTube / Instagram / X", followers: 16_320_000,
    lastComeback: "2026-01-16", status: "활동 중",
    gradient: ["#f87171", "#111827"],
    seedPrice: 22.53, seedChange1h: -0.08, seedChange24h: 2.94, seedChange7d: 6.02,
    seedVolume24h: 588_410, seedHolders: 82_390,
  },
  {
    id: "twice", name: "TWICE", fandom: "ONCE", debut: "2015-10-20",
    platforms: "YouTube / Instagram / TikTok", followers: 17_540_000,
    lastComeback: "2025-12-12", status: "활동 중",
    gradient: ["#fbcfe8", "#fdba74"],
    seedPrice: 19.76, seedChange1h: 0.22, seedChange24h: -0.87, seedChange7d: 2.45,
    seedVolume24h: 501_270, seedHolders: 76_880,
  },
  {
    id: "lesserafim", name: "LE SSERAFIM", fandom: "FEARNOT", debut: "2022-05-02",
    platforms: "Weverse / YouTube / TikTok", followers: 11_090_000,
    lastComeback: "2025-08-25", status: "활동 중",
    gradient: ["#bfdbfe", "#a5b4fc"],
    seedPrice: 18.92, seedChange1h: -0.12, seedChange24h: 0.94, seedChange7d: -0.55,
    seedVolume24h: 401_330, seedHolders: 61_420,
  },
  {
    id: "newjeans", name: "NewJeans", fandom: "Bunnies", debut: "2022-07-22",
    platforms: "YouTube / Instagram / TikTok", followers: 10_870_000,
    lastComeback: "2025-06-27", status: "활동 중",
    gradient: ["#93c5fd", "#6ee7b7"],
    seedPrice: 17.41, seedChange1h: 0.09, seedChange24h: -2.61, seedChange7d: -2.05,
    seedVolume24h: 396_770, seedHolders: 59_310,
  },
  {
    id: "nmixx", name: "NMIXX", fandom: "NSWER", debut: "2022-02-22",
    platforms: "YouTube / Instagram / TikTok", followers: 6_420_000,
    lastComeback: "2026-03-09", status: "활동 중",
    gradient: ["#c4b5fd", "#5eead4"],
    seedPrice: 8.42, seedChange1h: 0.31, seedChange24h: 4.12, seedChange7d: 11.08,
    seedVolume24h: 214_560, seedHolders: 34_050,
  },
];

export const GROUP_MAP: Record<string, Group> = Object.fromEntries(
  GROUPS.map((g) => [g.id, g])
);

export const DISCLAIMER_KO =
  "Bias Market은 비공식 팬메이드 K-pop 팬덤 배틀 시뮬레이터입니다. Fan$와 Fan Shares는 실제 금전적 가치가 없으며, 출금·판매·양도·교환할 수 없습니다. 본 서비스는 어떠한 아티스트, 소속사, 레이블, 엔터테인먼트 회사와도 제휴·후원·공식 관계가 없습니다.";

export const DISCLAIMER_EN =
  "Bias Market is an unofficial fan-made K-pop fandom battle simulator. Fan$ and Fan Shares have no real-world value and cannot be withdrawn, sold, transferred, or exchanged. This service is not affiliated with, endorsed by, sponsored by, or officially connected to any artist, agency, label, or entertainment company.";
