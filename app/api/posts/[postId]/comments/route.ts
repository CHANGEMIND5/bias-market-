import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_COMMENT_LENGTH = 300;

/** GET /api/posts/[postId]/comments — 댓글 목록 */
export async function GET(
  _req: Request,
  { params }: { params: { postId: string } }
) {
  const comments = await prisma.comment.findMany({
    where: { postId: params.postId },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { user: { select: { name: true, image: true } } },
  });

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      time: c.createdAt.toISOString(),
      author: { name: c.user?.name ?? "익명 팬", image: c.user?.image ?? null },
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
