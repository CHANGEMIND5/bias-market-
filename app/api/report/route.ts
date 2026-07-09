import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/report — 글/댓글 신고 (로그인 필요, 대상당 1회) */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Google 로그인 후 신고할 수 있어요." },
      { status: 401 }
    );
  }

  const data = await req.json().catch(() => null);
  const postId = typeof data?.postId === "string" ? data.postId : null;
  const commentId = typeof data?.commentId === "string" ? data.commentId : null;
  const reason =
    typeof data?.reason === "string" ? data.reason.trim().slice(0, 200) : null;

  if ((!postId && !commentId) || (postId && commentId)) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (postId) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ ok: false, error: "글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (post.userId === userId) {
      return NextResponse.json({ ok: false, error: "본인 글은 신고할 수 없어요." }, { status: 400 });
    }
  } else if (commentId) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return NextResponse.json({ ok: false, error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (comment.userId === userId) {
      return NextResponse.json({ ok: false, error: "본인 댓글은 신고할 수 없어요." }, { status: 400 });
    }
  }

  try {
    await prisma.report.create({
      data: { reporterId: userId, postId, commentId, reason },
    });
  } catch {
    // unique 제약 위반 = 이미 신고함
    return NextResponse.json({
      ok: false,
      error: "이미 신고한 게시물이에요. 운영자가 확인할 예정입니다.",
    });
  }

  return NextResponse.json({ ok: true });
}
