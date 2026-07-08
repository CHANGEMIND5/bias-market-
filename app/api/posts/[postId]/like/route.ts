import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/posts/[postId]/like — 좋아요 토글 */
export async function POST(
  _req: Request,
  { params }: { params: { postId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Google 로그인 후 좋아요를 누를 수 있어요." },
      { status: 401 }
    );
  }

  const postId = params.postId;
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ ok: false, error: "글을 찾을 수 없습니다." }, { status: 404 });
  }

  const existing = await prisma.postLike.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (existing) {
    await prisma.postLike.delete({
      where: { userId_postId: { userId, postId } },
    });
  } else {
    await prisma.postLike.create({ data: { userId, postId } });
  }

  const likeCount = await prisma.postLike.count({ where: { postId } });
  return NextResponse.json({ ok: true, liked: !existing, likeCount });
}
