import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkCommentRateLimit, MAX_COMMENT_LENGTH } from "@/lib/lounge";

/** GET /api/posts/[postId]/comments — 댓글 목록 */
export async function GET(
  _req: Request,
  { params }: { params: { postId: string } }
) {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id ?? null;
  const viewerIsAdmin = isAdminEmail(session?.user?.email);

  const comments = await prisma.comment.findMany({
    where: { postId: params.postId },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      user: { select: { name: true, image: true } },
      _count: { select: { reports: true } },
    },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      time: c.createdAt.toISOString(),
      author: { name: c.user?.name ?? "익명 팬", image: c.user?.image ?? null },
      mine: uid !== null && c.userId === uid,
      reportCount: viewerIsAdmin ? c._count.reports : undefined,
    })),
  });
}

/** POST /api/posts/[postId]/comments — 댓글 작성 (로그인 필요) */
export async function POST(
  req: Request,
  { params }: { params: { postId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Google 로그인 후 댓글을 쓸 수 있어요." },
      { status: 401 }
    );
  }

  const post = await prisma.post.findUnique({ where: { id: params.postId } });
  if (!post) {
    return NextResponse.json({ ok: false, error: "글을 찾을 수 없습니다." }, { status: 404 });
  }
  const admin = isAdminEmail(session?.user?.email);
  if (post.isLocked && !admin) {
    return NextResponse.json({ ok: false, error: "댓글이 잠긴 글이에요." }, { status: 403 });
  }

  const data = await req.json().catch(() => null);
  const body = typeof data?.body === "string" ? data.body.trim() : "";
  if (body.length === 0) {
    return NextResponse.json({ ok: false, error: "댓글 내용을 입력해 주세요." }, { status: 400 });
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { ok: false, error: `댓글은 최대 ${MAX_COMMENT_LENGTH}자까지 쓸 수 있어요.` },
      { status: 400 }
    );
  }
  // 프로필 이름 필수 + 레이트리밋 (서버 판정)
  const me = await prisma.user.findUnique({
    where: { id: userId }, select: { name: true },
  });
  if (!me?.name || me.name.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "프로필 이름을 먼저 설정해 주세요." }, { status: 403 }
    );
  }
  const rl = await checkCommentRateLimit(userId);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: rl.error }, { status: 429 });
  }

  const comment = await prisma.comment.create({
    data: { postId: params.postId, userId, body },
    include: { user: { select: { name: true, image: true } } },
  });

  return NextResponse.json({
    ok: true,
    comment: {
      id: comment.id,
      body: comment.body,
      time: comment.createdAt.toISOString(),
      author: { name: comment.user?.name ?? "익명 팬", image: comment.user?.image ?? null },
    },
  });
}
