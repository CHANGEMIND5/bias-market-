import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canCreatePost,
  checkPostRateLimit,
  loungeEligible,
  MAX_POST_LENGTH,
  MAX_TITLE_LENGTH,
  POST_TYPES,
  PostType,
  resolveLoungeStatus,
  countSupporters,
} from "@/lib/lounge";
import { GROUP_MAP } from "@/lib/mockData";
import { serializePosts } from "@/lib/postSerialize";

export const dynamic = "force-dynamic";

const GLOBAL_MAX_LENGTH = 500; // 전체 커뮤니티는 기존 짧은 제한 유지
const POLL_DURATIONS = new Set([1, 3, 7]);

const postInclude = (uid: string | null) => ({
  user: { select: { name: true, image: true, email: true, selectedTitle: true } },
  _count: { select: { likes: true, comments: true, reports: true } },
  likes: uid
    ? { where: { userId: uid }, select: { userId: true } }
    : { where: { userId: "-" }, select: { userId: true } },
  poll: { include: { options: true, votes: { select: { optionId: true, userId: true } } } },
});

/**
 * GET /api/posts?scope=GLOBAL|MARKET&marketId=bts&filter=latest|popular|polls|market_talk
 * 한 글은 하나의 scope에만 속함. MARKET은 marketId로만 조회됨.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id ?? null;
  const viewerIsAdmin = isAdminEmail(session?.user?.email);

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "MARKET" ? "MARKET" : "GLOBAL";
  const marketId = url.searchParams.get("marketId");
  const filter = url.searchParams.get("filter") ?? "latest";

  const where: any = { scope };
  if (scope === "MARKET") {
    if (!marketId || !loungeEligible(GROUP_MAP[marketId])) {
      return NextResponse.json({ posts: [] });
    }
    where.marketId = marketId;
  }
  // 숨김 처리된 글은 운영자에게만 노출
  if (!viewerIsAdmin) where.moderationStatus = { not: "HIDDEN" };
  if (filter === "polls") where.postType = "POLL";
  if (filter === "market_talk") where.postType = "MARKET_TALK";

  const posts = await prisma.post.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { isNotice: "desc" }, { createdAt: "desc" }],
    take: 40,
    include: postInclude(uid),
  });

  let serialized = await serializePosts(
    posts, uid, viewerIsAdmin, scope === "MARKET" ? marketId : null
  );

  // 인기순: 좋아요+댓글 가중 + 최신성 감쇠 (Fan Shares 수량은 절대 사용 안 함)
  if (filter === "popular") {
    const now = Date.now();
    serialized = serialized
      .map((p) => {
        const ageH = (now - new Date(p.time).getTime()) / 3600_000;
        const decay = 1 / Math.pow(ageH + 2, 0.6);
        const score = (p.likeCount * 2 + p.commentCount * 3) * decay;
        return { p, score, pinned: p.isPinned || p.isNotice };
      })
      .sort((a, b) =>
        a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.score - a.score
      )
      .map((x) => x.p);
  }

  return NextResponse.json({ posts: serialized });
}

/**
 * POST /api/posts — 글 작성.
 * body: { body, title?, scope, marketId?, postType, isNotice?, poll? }
 * poll: { options: string[2..4], durationDays: 1|3|7 }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Google 로그인 후 글을 쓸 수 있어요." },
      { status: 401 }
    );
  }
  const admin = isAdminEmail(session?.user?.email);

  const data = await req.json().catch(() => null);
  const body = typeof data?.body === "string" ? data.body.trim() : "";
  const title =
    typeof data?.title === "string" ? data.title.trim().slice(0, MAX_TITLE_LENGTH) : null;
  const scope = data?.scope === "MARKET" ? "MARKET" : "GLOBAL";
  const marketId = typeof data?.marketId === "string" ? data.marketId : null;
  let postType: PostType = POST_TYPES.includes(data?.postType) ? data.postType : "GENERAL";
  const wantsNotice = data?.isNotice === true;
  const pollInput = data?.poll;

  if (body.length === 0)
    return NextResponse.json({ ok: false, error: "내용을 입력해 주세요." }, { status: 400 });

  const maxLen = scope === "MARKET" ? MAX_POST_LENGTH : GLOBAL_MAX_LENGTH;
  if (body.length > maxLen)
    return NextResponse.json(
      { ok: false, error: `글은 최대 ${maxLen}자까지 쓸 수 있어요.` },
      { status: 400 }
    );

  // MARKET 글: 활성 라운지에만 작성 가능
  if (scope === "MARKET") {
    const g = GROUP_MAP[marketId ?? ""];
    if (!loungeEligible(g))
      return NextResponse.json({ ok: false, error: "존재하지 않는 라운지입니다." }, { status: 400 });
    const market = await prisma.market.findUnique({ where: { groupId: marketId! } });
    const status = resolveLoungeStatus(
      market?.loungeStatus, g, await countSupporters(marketId!)
    );
    if (status !== "ACTIVE")
      return NextResponse.json({ ok: false, error: "아직 열리지 않은 라운지예요." }, { status: 403 });
  }

  // 공지는 운영자만
  if (wantsNotice && !admin)
    return NextResponse.json({ ok: false, error: "공지는 운영자만 올릴 수 있어요." }, { status: 403 });

  // 작성 권한 + 레이트리밋 (서버 판정)
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return NextResponse.json({ ok: false, error: "계정을 찾을 수 없어요." }, { status: 401 });
  const perm = canCreatePost(me, admin);
  if (!perm.ok) return NextResponse.json({ ok: false, error: perm.error }, { status: 403 });
  const rl = await checkPostRateLimit(userId, body);
  if (!rl.ok) return NextResponse.json({ ok: false, error: rl.error }, { status: 429 });

  // 투표 검증
  let pollData: { options: string[]; closesAt: Date } | null = null;
  if (pollInput) {
    postType = "POLL";
    const opts: string[] = Array.isArray(pollInput.options)
      ? pollInput.options
          .filter((o: unknown) => typeof o === "string" && o.trim().length > 0)
          .map((o: string) => o.trim().slice(0, 80))
      : [];
    const dur = Number(pollInput.durationDays);
    if (opts.length < 2 || opts.length > 4)
      return NextResponse.json({ ok: false, error: "투표 항목은 2~4개여야 해요." }, { status: 400 });
    if (!POLL_DURATIONS.has(dur))
      return NextResponse.json({ ok: false, error: "투표 기간은 1일·3일·7일 중 선택해 주세요." }, { status: 400 });
    pollData = { options: opts, closesAt: new Date(Date.now() + dur * 86_400_000) };
  }

  const post = await prisma.post.create({
    data: {
      userId, body, title,
      scope,
      marketId: scope === "MARKET" ? marketId : null,
      postType,
      isNotice: wantsNotice && admin,
      isPinned: wantsNotice && admin && scope === "MARKET",
      ...(pollData
        ? {
            poll: {
              create: {
                closesAt: pollData.closesAt,
                options: {
                  create: pollData.options.map((text, i) => ({ text, sortOrder: i })),
                },
              },
            },
          }
        : {}),
    },
    include: postInclude(userId),
  });

  const [serialized] = await serializePosts(
    [post], userId, admin, scope === "MARKET" ? marketId : null
  );
  return NextResponse.json({ ok: true, post: serialized });
}
