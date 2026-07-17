import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GROUP_MAP } from "@/lib/mockData";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reports — 미처리(OPEN) 신고를 대상(글/댓글)별로 묶어서 반환.
 * 신고 수·사유·작성자·내용 미리보기·현재 노출 상태 포함.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      reporter: { select: { name: true, email: true, createdAt: true } },
      post: {
        select: {
          id: true, body: true, scope: true, marketId: true,
          moderationStatus: true, isLocked: true, createdAt: true,
          user: { select: { name: true, email: true } },
        },
      },
      comment: {
        select: {
          id: true, body: true, postId: true, createdAt: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  // 대상별 그룹화
  const map = new Map<string, any>();
  for (const r of reports) {
    const key = r.postId ? `post:${r.postId}` : `comment:${r.commentId}`;
    if (!map.has(key)) {
      const isPost = !!r.postId;
      const target: any = isPost ? r.post : r.comment;
      if (!target) continue; // 대상이 이미 삭제됨
      const g = isPost && target.marketId ? GROUP_MAP[target.marketId] : null;
      map.set(key, {
        type: isPost ? "post" : "comment",
        id: target.id,
        postId: isPost ? target.id : target.postId,
        body: (target.body ?? "").slice(0, 280),
        author: {
          name: target.user?.name ?? "익명 팬",
          isAdmin: isAdminEmail(target.user?.email),
        },
        scope: isPost ? target.scope : "COMMENT",
        loungeName: g?.name ?? null,
        moderationStatus: isPost ? target.moderationStatus : null,
        isLocked: isPost ? target.isLocked : null,
        createdAt: target.createdAt.toISOString(),
        reportCount: 0,
        reasons: {} as Record<string, number>,
        reporters: [] as { name: string; agedOk: boolean }[],
      });
    }
    const item = map.get(key);
    if (!item) continue;
    item.reportCount += 1;
    const reason = r.reason ?? "other";
    item.reasons[reason] = (item.reasons[reason] ?? 0) + 1;
    const agedOk =
      !!r.reporter &&
      Date.now() - r.reporter.createdAt.getTime() > 24 * 3600_000;
    item.reporters.push({ name: r.reporter?.name ?? "?", agedOk });
  }

  const items = Array.from(map.values()).sort(
    (a, b) => b.reportCount - a.reportCount
  );
  return NextResponse.json({ ok: true, items, openCount: reports.length });
}

/**
 * POST /api/admin/reports — 신고 처리 액션.
 * body: { action: hide|restore|deletePost|deleteComment|dismiss, postId?, commentId? }
 * 처리 후 관련 신고를 REVIEWED로 마킹 (dismiss는 DISMISSED).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const reviewerId = session!.user!.id;
  const data = await req.json().catch(() => null);
  const action = data?.action;
  const postId = typeof data?.postId === "string" ? data.postId : null;
  const commentId = typeof data?.commentId === "string" ? data.commentId : null;

  const closeReports = async (finalStatus: "REVIEWED" | "DISMISSED") => {
    await prisma.report.updateMany({
      where: {
        status: "OPEN",
        ...(postId ? { postId } : {}),
        ...(commentId ? { commentId } : {}),
      },
      data: { status: finalStatus, reviewedAt: new Date(), reviewedById: reviewerId },
    });
  };

  try {
    switch (action) {
      case "hide":
        if (!postId) return bad();
        await prisma.post.update({ where: { id: postId }, data: { moderationStatus: "HIDDEN" } });
        await closeReports("REVIEWED");
        break;
      case "restore":
        if (!postId) return bad();
        await prisma.post.update({ where: { id: postId }, data: { moderationStatus: "VISIBLE" } });
        await closeReports("REVIEWED");
        break;
      case "deletePost":
        if (!postId) return bad();
        await prisma.post.delete({ where: { id: postId } }); // 신고는 cascade 삭제
        break;
      case "deleteComment":
        if (!commentId) return bad();
        await prisma.comment.delete({ where: { id: commentId } });
        break;
      case "dismiss":
        await closeReports("DISMISSED");
        break;
      default:
        return bad();
    }
  } catch (e) {
    console.error("[admin/reports] action failed:", e);
    return NextResponse.json({ ok: false, error: "처리 중 오류가 발생했어요." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

function bad() {
  return NextResponse.json({ ok: false, error: "잘못된 요청이에요." }, { status: 400 });
}
