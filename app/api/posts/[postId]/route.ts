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

/**
 * PATCH /api/posts/[postId] — 운영자 전용 관리 액션.
 * body.action: pin | unpin | lock | unlock | hide | restore | closePoll
 */
export async function PATCH(
  req: Request,
  { params }: { params: { postId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "운영자만 사용할 수 있어요." }, { status: 403 });
  }
  const post = await prisma.post.findUnique({ where: { id: params.postId } });
  if (!post) {
    return NextResponse.json({ ok: false, error: "글을 찾을 수 없습니다." }, { status: 404 });
  }

  const data = await req.json().catch(() => null);
  const action = data?.action;
  const map: Record<string, any> = {
    pin: { isPinned: true },
    unpin: { isPinned: false },
    lock: { isLocked: true },
    unlock: { isLocked: false },
    hide: { moderationStatus: "HIDDEN" },
    restore: { moderationStatus: "VISIBLE" },
  };

  if (action === "closePoll") {
    await prisma.communityPoll.updateMany({
      where: { postId: params.postId, closedAt: null },
      data: { closedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }
  if (!map[action]) {
    return NextResponse.json({ ok: false, error: "알 수 없는 동작이에요." }, { status: 400 });
  }
  await prisma.post.update({ where: { id: params.postId }, data: map[action] });
  return NextResponse.json({ ok: true, ...map[action] });
}
