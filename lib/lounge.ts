// ─────────────────────────────────────────────────────────────
// 팬덤 라운지 (Fandom Lounge) — 서버 전용 로직
//
// 기존 커뮤니티(Post/Comment/Like/Report)를 재사용하고, 글에 scope를
// 추가해 GLOBAL(전체) / MARKET(그룹 라운지)로 분리합니다.
//
// 라운지 상태·서포터 집계·활성화·유저 라벨·레이트리밋을 담당하며,
// AMM·Fan$·보유·미션·보상 로직은 일절 건드리지 않습니다.
// ─────────────────────────────────────────────────────────────
import { prisma } from "./db";
import {
  loungeEligible,
  MIN_ACCOUNT_AGE_MS,
  RATE,
  SUPPORTER_TARGET,
  UserLabel,
} from "./loungeShared";
import { GROUP_MAP } from "./mockData";

// 서버 라우트가 한 곳에서 import할 수 있도록 공용 순수 항목 재노출
export * from "./loungeShared";

/**
 * 고유 서포터 수 — 아래 중 하나라도 만족하면 유저당 1회 카운트:
 *   · 관심 목록에 추가  · 스타터 포트폴리오에서 선택  · 현재 Fan Shares 보유(>0)
 * 시스템 계정은 holdings/favorite에 존재하지 않으므로 자동 제외.
 */
export async function countSupporters(groupId: string): Promise<number> {
  const [favs, holders, starters] = await Promise.all([
    prisma.favorite.findMany({ where: { groupId }, select: { userId: true } }),
    prisma.holding.findMany({
      where: { groupId, shares: { gt: 0 } },
      select: { userId: true },
    }),
    prisma.starterPortfolioAllocation.findMany({
      where: { marketId: groupId },
      select: { portfolio: { select: { userId: true } } },
    }),
  ]);
  const set = new Set<string>();
  for (const f of favs) set.add(f.userId);
  for (const h of holders) set.add(h.userId);
  for (const s of starters) if (s.portfolio?.userId) set.add(s.portfolio.userId);
  return set.size;
}

/**
 * mid/rookie 라운지가 서포터 임계값을 처음 넘겼을 때 영구 활성화 +
 * 시스템 환영글 1회 생성. 이미 활성화됐으면 아무것도 하지 않음(멱등).
 */
export async function maybeActivateLounge(
  groupId: string,
  supporterCount: number
): Promise<void> {
  const g = GROUP_MAP[groupId];
  if (!loungeEligible(g)) return;
  if (g.tier === "mega" || g.tier === "large") return; // 처음부터 ACTIVE
  if (supporterCount < SUPPORTER_TARGET) return;

  // AUTO 상태이고 아직 활성화 기록이 없을 때만 (경쟁 조건 방지: 조건부 갱신)
  const res = await prisma.market.updateMany({
    where: { groupId, loungeStatus: "AUTO", loungeActivatedAt: null },
    data: {
      loungeStatus: "ACTIVE",
      loungeActivatedAt: new Date(),
      loungeActivationReason: "COMMUNITY_THRESHOLD",
    },
  });
  if (res.count === 0) return; // 이미 활성화됨

  // 시스템 환영글 1회 — 운영자 공지 형태로 라운지 상단 고정
  const admin = await findSystemAuthor();
  if (admin) {
    await prisma.post.create({
      data: {
        userId: admin,
        scope: "MARKET",
        marketId: groupId,
        postType: "GENERAL",
        isPinned: true,
        isNotice: true,
        body: WELCOME_BODY,
      },
    });
  }
}

const WELCOME_BODY =
  "이 팬덤 라운지가 오픈되었습니다! 팬덤 이야기, Bias Market 차트, 팬덤 배틀에 대해 자유롭게 이야기해 보세요.";

/** 시스템 환영글 작성자 = 관리자 계정 우선, 없으면 생략 */
async function findSystemAuthor(): Promise<string | null> {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length === 0) return null;
  const u = await prisma.user.findFirst({
    where: { email: { in: admins } },
    select: { id: true },
  });
  return u?.id ?? null;
}

// ─── 유저 커뮤니티 라벨 (보유량·금액 노출 없음) ───
const EARLY_BETA_BEFORE = new Date("2026-09-01T00:00:00Z"); // 이 전 가입 = 얼리 베타

/**
 * 라운지 피드용 라벨 세트를 한 번에 계산 (작성자별 쿼리 폭발 방지).
 * groupId가 있으면 그룹 관련 라벨(스타터/홀더/단골)을, 없으면 얼리 베타만.
 */
export async function buildLabelResolver(
  authorIds: string[],
  groupId: string | null
): Promise<(userId: string) => UserLabel[]> {
  const ids = Array.from(new Set(authorIds));
  if (ids.length === 0) return () => [];

  const [holders, starters, early, regulars] = await Promise.all([
    groupId
      ? prisma.holding.findMany({
          where: { groupId, shares: { gt: 0 }, userId: { in: ids } },
          select: { userId: true },
        })
      : Promise.resolve([]),
    groupId
      ? prisma.starterPortfolioAllocation.findMany({
          where: { marketId: groupId, portfolio: { userId: { in: ids } } },
          select: { portfolio: { select: { userId: true } } },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { id: { in: ids }, createdAt: { lt: EARLY_BETA_BEFORE } },
      select: { id: true },
    }),
    groupId
      ? prisma.post.groupBy({
          by: ["userId"],
          where: { scope: "MARKET", marketId: groupId, userId: { in: ids } },
          _count: { _all: true },
        })
      : Promise.resolve([] as { userId: string; _count: { _all: number } }[]),
  ]);

  const holderSet = new Set(holders.map((h: any) => h.userId));
  const starterSet = new Set(
    starters.map((s: any) => s.portfolio?.userId).filter(Boolean)
  );
  const earlySet = new Set(early.map((u: any) => u.id));
  const regularSet = new Set(
    (regulars as any[]).filter((r) => (r._count?._all ?? 0) >= 5).map((r) => r.userId)
  );

  return (userId: string): UserLabel[] => {
    const labels: UserLabel[] = [];
    if (starterSet.has(userId)) labels.push("STARTER_FANDOM");
    if (holderSet.has(userId)) labels.push("FAN_SHARE_HOLDER");
    if (regularSet.has(userId)) labels.push("LOUNGE_REGULAR");
    else if (earlySet.has(userId)) labels.push("EARLY_BETA");
    return labels.slice(0, 2); // 최대 2개만 (도배 방지)
  };
}

// ─── 레이트 리밋 / 작성 권한 (전부 서버 판정) ───
export function earlyBetaPostingEnabled(): boolean {
  return process.env.EARLY_BETA_POSTING === "true";
}

export type PermCheck = { ok: true } | { ok: false; error: string };

/** 글 작성 권한: 로그인 + (얼리베타 or 관리자 or 계정 12시간 경과) */
export function canCreatePost(
  user: { createdAt: Date; name: string | null },
  isAdmin: boolean
): PermCheck {
  if (!user.name || user.name.trim().length === 0)
    return { ok: false, error: "프로필 이름을 먼저 설정해 주세요." };
  if (isAdmin || earlyBetaPostingEnabled()) return { ok: true };
  if (Date.now() - user.createdAt.getTime() < MIN_ACCOUNT_AGE_MS)
    return { ok: false, error: "가입 후 12시간이 지나면 글을 쓸 수 있어요." };
  return { ok: true };
}

/** 글 레이트리밋 + 동일 내용 도배 검사 */
export async function checkPostRateLimit(
  userId: string,
  body: string
): Promise<PermCheck> {
  const now = Date.now();
  const [recent, today, dupe] = await Promise.all([
    prisma.post.count({
      where: { userId, createdAt: { gte: new Date(now - 10 * 60_000) } },
    }),
    prisma.post.count({
      where: { userId, createdAt: { gte: new Date(now - 24 * 3600_000) } },
    }),
    prisma.post.findFirst({
      where: {
        userId, body,
        createdAt: { gte: new Date(now - 6 * 3600_000) },
      },
      select: { id: true },
    }),
  ]);
  if (dupe) return { ok: false, error: "같은 내용을 반복해서 올릴 수 없어요." };
  if (recent >= RATE.postPer10Min)
    return { ok: false, error: "글은 10분에 1개까지 쓸 수 있어요." };
  if (today >= RATE.postPerDay)
    return { ok: false, error: "하루 글 작성 한도(10개)를 초과했어요." };
  return { ok: true };
}

/** 댓글 레이트리밋 */
export async function checkCommentRateLimit(userId: string): Promise<PermCheck> {
  const now = Date.now();
  const [recent, today] = await Promise.all([
    prisma.comment.count({
      where: { userId, createdAt: { gte: new Date(now - 60_000) } },
    }),
    prisma.comment.count({
      where: { userId, createdAt: { gte: new Date(now - 24 * 3600_000) } },
    }),
  ]);
  if (recent >= RATE.commentPerMin)
    return { ok: false, error: "댓글이 너무 빨라요. 잠시 후 다시 시도해 주세요." };
  if (today >= RATE.commentPerDay)
    return { ok: false, error: "하루 댓글 한도(100개)를 초과했어요." };
  return { ok: true };
}
