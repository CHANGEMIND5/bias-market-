import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** DELETE /api/comments/[commentId] — 내 댓글 또는 운영자만 삭제 가능 */
export async function DELETE(
  _req: Request,
  { params }: { params: { commentId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id: params.commentId },
  });
  if (!comment) {
    return NextResponse.json({ ok: false, error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  const admin = isAdminEmail(session?.user?.email);
  if (comment.userId !== userId && !admin) {
    return NextResponse.json(
      { ok: false, error: "본인 댓글 또는 운영자만 삭제할 수 있어요." },
      { status: 403 }
    );
  }

  await prisma.comment.delete({ where: { id: params.commentId } });
  return NextResponse.json({ ok: true, postId: comment.postId });
}
