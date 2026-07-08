import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** DELETE /api/posts/[postId] — 내 글 또는 운영자만 삭제 가능 */
export async function DELETE(
  _req: Request,
  { params }: { params: { postId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }

  const post = await prisma.post.findUnique({ where: { id: params.postId } });
  if (!post) {
    return NextResponse.json({ ok: false, error: "글을 찾을 수 없습니다." }, { status: 404 });
  }

  const admin = isAdminEmail(session?.user?.email);
  if (post.userId !== userId && !admin) {
    return NextResponse.json(
      { ok: false, error: "본인 글 또는 운영자만 삭제할 수 있어요." },
      { status: 403 }
    );
  }

  await prisma.post.delete({ where: { id: params.postId } });
  return NextResponse.json({ ok: true });
}
