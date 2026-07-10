import { IDOL_SEEDS } from "./idolSeeds";
import { hashString, mulberry32 } from "./rng";
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

// 친구 초대 보상 — 초대받은 유저가 "첫 거래"를 완료해야 지급 (어뷰징 방지)
export const REF_INVITER_BONUS = 2_000; // 초대자 보상 (Fan$)
export const REF_INVITEE_BONUS = 1_000; // 초대받은 유저 보상 (Fan$)
export const REF_MAX_REWARDS = 10; // 초대자 Fan$ 보상 상한 (이후엔 카운트만 증가)
export const TOTAL_SHARES = 1_000_000; // total Fan Shares per asset (for 팬덤 가치)

// FAIR START: 모든 종목이 1 Fan$, 거래량 0, 보유자 0에서 똑같이 출발합니다.
// 랭킹은 오직 팬들의 실제 거래로만 움직여요.
const FAIR_START_PRICE = 1;

// ─────────────────────────────────────────────────────────────
// GROUP SEEDS — 그룹 추가/삭제는 여기서
// ─────────────────────────────────────────────────────────────
interface GroupSeed {
  id: string;
  name: string;
  fandom: string;
  debut: string;
  platforms: string;
  followers: number;
  lastComeback: string;
  gradient: [string, string];
}

const GROUP_SEEDS: GroupSeed[] = [
  { id: "bts", name: "BTS", fandom: "ARMY", debut: "2013-06-13", platforms: "Weverse / YouTube / X", followers: 32_450_000, lastComeback: "2025-05-17", gradient: ["#a78bfa", "#f0abfc"] },
  { id: "blackpink", name: "BLACKPINK", fandom: "BLINK", debut: "2016-08-08", platforms: "YouTube / Instagram / X", followers: 28_930_000, lastComeback: "2025-11-07", gradient: ["#f9a8d4", "#111827"] },
  { id: "seventeen", name: "SEVENTEEN", fandom: "CARAT", debut: "2015-05-26", platforms: "Weverse / YouTube / X", followers: 18_760_000, lastComeback: "2025-09-29", gradient: ["#f9a8d4", "#93c5fd"] },
  { id: "straykids", name: "Stray Kids", fandom: "STAY", debut: "2018-03-25", platforms: "YouTube / Instagram / X", followers: 16_320_000, lastComeback: "2026-01-16", gradient: ["#f87171", "#111827"] },
  { id: "twice", name: "TWICE", fandom: "ONCE", debut: "2015-10-20", platforms: "YouTube / Instagram / TikTok", followers: 17_540_000, lastComeback: "2025-12-12", gradient: ["#fbcfe8", "#fdba74"] },
  { id: "ive", name: "IVE", fandom: "DIVE", debut: "2021-12-01", platforms: "YouTube / Instagram / TikTok", followers: 12_840_000, lastComeback: "2026-02-02", gradient: ["#fca5a5", "#fcd34d"] },
  { id: "aespa", name: "aespa", fandom: "MY", debut: "2020-11-17", platforms: "Weverse / YouTube / TikTok", followers: 14_210_000, lastComeback: "2025-10-21", gradient: ["#67e8f9", "#818cf8"] },
  { id: "lesserafim", name: "LE SSERAFIM", fandom: "FEARNOT", debut: "2022-05-02", platforms: "Weverse / YouTube / TikTok", followers: 11_090_000, lastComeback: "2025-08-25", gradient: ["#bfdbfe", "#a5b4fc"] },
  { id: "newjeans", name: "NewJeans", fandom: "Bunnies", debut: "2022-07-22", platforms: "YouTube / Instagram / TikTok", followers: 10_870_000, lastComeback: "2025-06-27", gradient: ["#93c5fd", "#6ee7b7"] },
  { id: "nmixx", name: "NMIXX", fandom: "NSWER", debut: "2022-02-22", platforms: "YouTube / Instagram / TikTok", followers: 6_420_000, lastComeback: "2026-03-09", gradient: ["#c4b5fd", "#5eead4"] },
  { id: "exo", name: "EXO", fandom: "EXO-L", debut: "2012-04-08", platforms: "YouTube / Instagram / X", followers: 15_800_000, lastComeback: "2025-04-10", gradient: ["#94a3b8", "#e2e8f0"] },
  { id: "nctdream", name: "NCT DREAM", fandom: "시즈니", debut: "2016-08-25", platforms: "YouTube / Instagram / TikTok", followers: 9_400_000, lastComeback: "2025-07-14", gradient: ["#86efac", "#22d3ee"] },
  { id: "txt", name: "TXT", fandom: "MOA", debut: "2019-03-04", platforms: "Weverse / YouTube / X", followers: 12_100_000, lastComeback: "2025-11-03", gradient: ["#a5f3fc", "#f9a8d4"] },
  { id: "enhypen", name: "ENHYPEN", fandom: "ENGENE", debut: "2020-11-30", platforms: "Weverse / YouTube / TikTok", followers: 11_600_000, lastComeback: "2026-01-19", gradient: ["#fda4af", "#111827"] },
  { id: "ateez", name: "ATEEZ", fandom: "ATINY", debut: "2018-10-24", platforms: "YouTube / Instagram / X", followers: 8_700_000, lastComeback: "2025-12-05", gradient: ["#fdba74", "#ef4444"] },
  { id: "itzy", name: "ITZY", fandom: "MIDZY", debut: "2019-02-12", platforms: "YouTube / Instagram / TikTok", followers: 9_900_000, lastComeback: "2025-06-09", gradient: ["#fde047", "#fb7185"] },
  { id: "gidle", name: "i-dle", fandom: "네버랜드", debut: "2018-05-02", platforms: "YouTube / Instagram / TikTok", followers: 10_200_000, lastComeback: "2025-05-19", gradient: ["#f472b6", "#7c3aed"] },
  { id: "redvelvet", name: "Red Velvet", fandom: "ReVeluv", debut: "2014-08-01", platforms: "YouTube / Instagram / X", followers: 11_300_000, lastComeback: "2025-06-30", gradient: ["#fca5a5", "#fecdd3"] },
  { id: "riize", name: "RIIZE", fandom: "BRIIZE", debut: "2023-09-04", platforms: "YouTube / Instagram / TikTok", followers: 7_100_000, lastComeback: "2026-02-23", gradient: ["#7dd3fc", "#fbbf24"] },
  { id: "babymonster", name: "BABYMONSTER", fandom: "MONSTIES", debut: "2023-11-27", platforms: "YouTube / Instagram / TikTok", followers: 8_900_000, lastComeback: "2025-10-10", gradient: ["#fb7185", "#111827"] },
];

// ─────────────────────────────────────────────────────────────
// MEMBER SEEDS — 멤버 개인 종목 추가/삭제는 여기서
// [id, 소속 그룹 id, 이름, 팔로워]
// ─────────────────────────────────────────────────────────────
const MEMBER_SEEDS: [string, string, string, number][] = [
  // BTS
  ["bts-rm", "bts", "RM", 12_400_000],
  ["bts-jin", "bts", "진", 13_100_000],
  ["bts-suga", "bts", "슈가", 11_800_000],
  ["bts-jhope", "bts", "제이홉", 12_200_000],
  ["bts-jimin", "bts", "지민", 16_900_000],
  ["bts-v", "bts", "뷔", 17_300_000],
  ["bts-jungkook", "bts", "정국", 18_200_000],
  // BLACKPINK
  ["bp-jisoo", "blackpink", "지수", 14_500_000],
  ["bp-jennie", "blackpink", "제니", 16_800_000],
  ["bp-rose", "blackpink", "로제", 15_900_000],
  ["bp-lisa", "blackpink", "리사", 19_400_000],
  // TWICE
  ["tw-nayeon", "twice", "나연", 7_200_000],
  ["tw-jeongyeon", "twice", "정연", 5_100_000],
  ["tw-momo", "twice", "모모", 6_800_000],
  ["tw-sana", "twice", "사나", 7_000_000],
  ["tw-jihyo", "twice", "지효", 5_600_000],
  ["tw-mina", "twice", "미나", 6_100_000],
  ["tw-dahyun", "twice", "다현", 6_500_000],
  ["tw-chaeyoung", "twice", "채영", 5_300_000],
  ["tw-tzuyu", "twice", "쯔위", 7_400_000],
  // IVE
  ["ive-yujin", "ive", "안유진", 6_900_000],
  ["ive-gaeul", "ive", "가을", 3_800_000],
  ["ive-rei", "ive", "레이", 4_200_000],
  ["ive-wonyoung", "ive", "장원영", 9_800_000],
  ["ive-liz", "ive", "리즈", 4_400_000],
  ["ive-leeseo", "ive", "이서", 5_200_000],
  // aespa
  ["ae-karina", "aespa", "카리나", 9_200_000],
  ["ae-giselle", "aespa", "지젤", 5_400_000],
  ["ae-winter", "aespa", "윈터", 8_100_000],
  ["ae-ningning", "aespa", "닝닝", 6_300_000],
  // LE SSERAFIM
  ["lsf-chaewon", "lesserafim", "김채원", 5_800_000],
  ["lsf-sakura", "lesserafim", "사쿠라", 7_600_000],
  ["lsf-yunjin", "lesserafim", "허윤진", 5_200_000],
  ["lsf-kazuha", "lesserafim", "카즈하", 6_400_000],
  ["lsf-eunchae", "lesserafim", "홍은채", 4_100_000],
  // NewJeans
  ["nj-minji", "newjeans", "민지", 6_700_000],
  ["nj-hanni", "newjeans", "하니", 6_900_000],
  ["nj-danielle", "newjeans", "다니엘", 6_200_000],
  ["nj-haerin", "newjeans", "해린", 5_900_000],
  ["nj-hyein", "newjeans", "혜인", 4_800_000],
];

// 멤버 엠블럼용 그라데이션 팔레트 (순환)
const MEMBER_PALETTE: [string, string][] = [
  ["#fda4af", "#fde68a"],
  ["#a7f3d0", "#67e8f9"],
  ["#c4b5fd", "#f0abfc"],
  ["#fcd34d", "#fb923c"],
  ["#93c5fd", "#c4b5fd"],
  ["#6ee7b7", "#a3e635"],
  ["#f9a8d4", "#c084fc"],
  ["#7dd3fc", "#34d399"],
];

const fairStart = {
  seedPrice: FAIR_START_PRICE,
  seedChange1h: 0,
  seedChange24h: 0,
  seedChange7d: 0,
  seedVolume24h: 0,
  seedHolders: 0,
};

// ─────────────────────────────────────────────────────────────
// 기존 라이브 마켓 20팀의 메타데이터 보강 (id는 절대 바꾸지 말 것 — 라이브 마켓 키)
// seedStatus 기본값은 active_candidate / defaultVisible true이며 여기서 덮어씀
// ─────────────────────────────────────────────────────────────
const ENRICH: Record<string, Partial<Group>> = {
  bts: { koreanName: "방탄소년단", aliases: ["방탄소년단", "Bangtan Boys", "Bangtan"], gender: "boy" },
  blackpink: { koreanName: "블랙핑크", aliases: ["블랙핑크", "블핑"], gender: "girl" },
  seventeen: { koreanName: "세븐틴", aliases: ["세븐틴", "세븐틴", "SVT"], gender: "boy" },
  straykids: { koreanName: "스트레이 키즈", aliases: ["스트레이 키즈", "스키즈", "SKZ"], gender: "boy" },
  twice: { koreanName: "트와이스", aliases: ["트와이스"], gender: "girl" },
  ive: { koreanName: "아이브", aliases: ["아이브"], gender: "girl" },
  aespa: { koreanName: "에스파", aliases: ["에스파"], gender: "girl" },
  lesserafim: { koreanName: "르세라핌", aliases: ["르세라핌", "LE SSERAFIM"], gender: "girl" },
  newjeans: {
    koreanName: "뉴진스", aliases: ["뉴진스", "NJZ"], gender: "girl",
    seedStatus: "check", defaultVisible: false,
    sourceNote: "활동 상태 확인 필요 (내부 분류)",
  },
  nmixx: { koreanName: "엔믹스", aliases: ["엔믹스"], gender: "girl" },
  exo: { koreanName: "엑소", aliases: ["엑소"], gender: "boy" },
  nctdream: { koreanName: "엔시티 드림", aliases: ["엔시티 드림", "엔드림"], gender: "boy" },
  txt: {
    koreanName: "투모로우바이투게더",
    aliases: ["투모로우바이투게더", "Tomorrow X Together", "투바투"],
    gender: "boy",
  },
  enhypen: { koreanName: "엔하이픈", aliases: ["엔하이픈"], gender: "boy" },
  ateez: { koreanName: "에이티즈", aliases: ["에이티즈"], gender: "boy" },
  itzy: { koreanName: "있지", aliases: ["있지"], gender: "girl" },
  gidle: {
    koreanName: "아이들",
    aliases: ["아이들", "여자아이들", "(G)I-DLE", "GIDLE"],
    gender: "girl",
  },
  redvelvet: { koreanName: "레드벨벳", aliases: ["레드벨벳", "레벨"], gender: "girl" },
  riize: { koreanName: "라이즈", aliases: ["라이즈"], gender: "boy" },
  babymonster: { koreanName: "베이비몬스터", aliases: ["베이비몬스터", "베몬"], gender: "girl" },
};

const groupAssets: Group[] = GROUP_SEEDS.map((g) => ({
  ...g,
  category: "group" as const,
  status: "활동 중",
  ...fairStart,
  seedStatus: "active_candidate" as const,
  defaultVisible: true,
  ...ENRICH[g.id],
}));

const groupSeedMap = new Map(GROUP_SEEDS.map((g) => [g.id, g]));

const memberAssets: Group[] = MEMBER_SEEDS.map(([id, parent, name, followers], i) => {
  const pg = groupSeedMap.get(parent)!;
  const pe = ENRICH[parent] ?? {};
  return {
    id,
    name,
    category: "member" as const,
    parentGroup: parent,
    fandom: pg.fandom,
    debut: pg.debut,
    platforms: pg.platforms,
    followers,
    lastComeback: pg.lastComeback,
    status: "활동 중",
    gradient: MEMBER_PALETTE[i % MEMBER_PALETTE.length],
    gender: pe.gender,
    // 소속 그룹이 check/비노출이면 멤버도 동일하게
    seedStatus: pe.seedStatus ?? ("active_candidate" as const),
    defaultVisible: pe.defaultVisible ?? true,
    ...fairStart,
  };
});

// ─────────────────────────────────────────────────────────────
// 대형 시드 DB(lib/idolSeeds.ts) → Group 변환
// - 슬러그/이름 정규화로 기존 라이브 마켓과 dedupe (기존 데이터 보존)
// - 모든 신규 마켓은 1 Fan$ · 1,000,000 Shares 공평 출발
// ─────────────────────────────────────────────────────────────
const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힯]/g, "");
const slugifyName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const SEED_PALETTE = MEMBER_PALETTE;

function buildSeedAssets(): Group[] {
  const takenNames = new Set<string>();
  const takenIds = new Set<string>();
  for (const g of [...groupAssets, ...memberAssets]) {
    takenNames.add(normName(g.name));
    if (g.koreanName) takenNames.add(normName(g.koreanName));
    for (const a of g.aliases ?? []) takenNames.add(normName(a));
    takenIds.add(g.id);
  }

  const out: Group[] = [];
  for (const [name, gender, seedStatus, kor, fandom, aliases] of IDOL_SEEDS) {
    const n = normName(name);
    if (takenNames.has(n)) continue; // 기존 마켓/이전 항목과 중복 → 건너뜀
    takenNames.add(n);
    if (kor) takenNames.add(normName(kor));
    for (const a of aliases ?? []) takenNames.add(normName(a));

    let id = slugifyName(name) || `g${hashString(name).toString(36)}`;
    while (takenIds.has(id)) id = `${id}-2`;
    takenIds.add(id);

    const rand = mulberry32(hashString(name));
    const visible = seedStatus === "active_candidate" || seedStatus === "rookie_candidate";
    const allAliases = [...(kor ? [kor] : []), ...(aliases ?? [])];

    out.push({
      id,
      name,
      category: "group",
      koreanName: kor ?? undefined,
      aliases: allAliases,
      gender,
      seedStatus,
      defaultVisible: visible,
      fandom: fandom ?? "-",
      debut: "-",
      platforms: "YouTube / Instagram",
      followers: Math.round(100_000 + rand() * 2_900_000),
      lastComeback: "-",
      status: "활동 중",
      gradient: SEED_PALETTE[hashString(name) % SEED_PALETTE.length],
      ...fairStart,
    });
  }
  return out;
}

export const GROUPS: Group[] = [...groupAssets, ...memberAssets, ...buildSeedAssets()];

/** 메인 마켓 기본 노출 대상 (active + rookie) — 배틀/봇/랭킹도 이 목록 기준 */
export const VISIBLE_GROUPS: Group[] = GROUPS.filter(
  (g) => g.defaultVisible !== false
);

export const GROUP_MAP: Record<string, Group> = Object.fromEntries(
  GROUPS.map((g) => [g.id, g])
);

export const DISCLAIMER_KO =
  "Bias Market은 비공식 팬메이드 K-pop 팬덤 배틀 시뮬레이터입니다. Fan$와 Fan Shares는 실제 금전적 가치가 없으며, 출금·판매·양도·교환할 수 없습니다. 본 서비스는 어떠한 아티스트, 소속사, 레이블, 엔터테인먼트 회사와도 제휴·후원·공식 관계가 없습니다.";

export const DISCLAIMER_EN =
  "Bias Market is an unofficial fan-made K-pop fandom battle simulator. Fan$ and Fan Shares have no real-world value and cannot be withdrawn, sold, transferred, or exchanged. This service is not affiliated with, endorsed by, sponsored by, or officially connected to any artist, agency, label, or entertainment company.";
