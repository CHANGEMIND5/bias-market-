import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  REPORT_HIDE_THRESHOLD,
  REPORT_MIN_ACCOUNT_AGE_MS,
} from "@/lib/lounge";

export const dynamic = "force-dynamic";

const REASONS = new Set([
  "harassment", "hate", "spam", "misinfo",
  "privacy", "manipulation", "inappropriate", "other",
]);

/**
 * 서로 다른 "24시간 이상 된 계정" 3건 신고가 쌓이면 글을 임시 검토(UNDER_REVIEW)로
 * 전환해 노출을 낮춤. 운영자는 언제든 복구 가능. 신규 계정 대량 신고로는
 * 자동 숨김되지 않음. (댓글은 임시 숨김 대상 아님 — 운영자 검토만)
 */
async function maybeTempHide(postId: string): Promise<void> {
  const reports = await prisma.report.findMany({
    where: { postId },
    select: { reporter: { select: { createdAt: true, id: true } } },
  });
  const cutoff = Date.now() - REPORT_MIN_ACCOUNT_AGE_MS;
  const distinctEstablished = new Set(
    reports
      .filter((r) => r.reporter && r.reporter.createdAt.getTime() < cutoff)
      .map((r) => r.reporter!.id)
  );
  if (distinctEstablished.size >= REPORT_HIDE_THRESHOLD) {
    await prisma.post.updateMany({
      where: { id: postId, moderationStatus: "VISIBLE" },
      data: { moderationStatus: "UNDER_REVIEW" },
    });
  }
}

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
  const rawReason = typeof data?.reason === "string" ? data.reason.trim() : "";
  const reason = REASONS.has(rawReason) ? rawReason : "other";
  const details =
    typeof data?.details === "string" ? data.details.trim().slice(0, 300) : null;

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
      data: { reporterId: userId, postId, commentId, reason, details },
    });
  } catch {
    // unique 제약 위반 = 이미 신고함
    return NextResponse.json({
      ok: false,
      error: "이미 신고한 게시물이에요. 운영자가 확인할 예정입니다.",
    });
  }

  // 서로 다른 established 계정 3건 → 임시 검토 상태로 노출 낮춤 (글만)
  if (postId) {
    try {
      await maybeTempHide(postId);
    } catch {
      // 자동 숨김 실패가 신고 접수를 막으면 안 됨
    }
  }

  return NextResponse.json({ ok: true });
}
