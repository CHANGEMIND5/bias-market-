import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/polls/[postId]/vote — 투표 (유저당 1표, 마감 전 변경 가능).
 * body: { optionId }. Fan Shares 보유량과 무관하게 1인 1표.
 */
export async function POST(
  req: Request,
  { params }: { params: { postId: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Google 로그인 후 투표할 수 있어요." },
      { status: 401 }
    );
  }

  const data = await req.json().catch(() => null);
  const optionId = typeof data?.optionId === "string" ? data.optionId : "";

  const poll = await prisma.communityPoll.findUnique({
    where: { postId: params.postId },
    include: { options: { select: { id: true } } },
  });
  if (!poll) {
    return NextResponse.json({ ok: false, error: "투표를 찾을 수 없어요." }, { status: 404 });
  }
  const closed = !!poll.closedAt || poll.closesAt.getTime() <= Date.now();
  if (closed) {
    return NextResponse.json({ ok: false, error: "마감된 투표예요." }, { status: 400 });
  }
  if (!poll.options.some((o: { id: string }) => o.id === optionId)) {
    return NextResponse.json({ ok: false, error: "잘못된 항목이에요." }, { status: 400 });
  }

  // 1인 1표: 있으면 항목 변경, 없으면 생성 (경쟁 조건은 unique로 방지)
  await prisma.communityPollVote.upsert({
    where: { pollId_userId: { pollId: poll.id, userId } },
    update: { optionId },
    create: { pollId: poll.id, optionId, userId },
  });

  const votes = await prisma.communityPollVote.findMany({
    where: { pollId: poll.id },
    select: { optionId: true },
  });
  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v.optionId, (counts.get(v.optionId) ?? 0) + 1);

  return NextResponse.json({
    ok: true,
    myOptionId: optionId,
    totalVotes: votes.length,
    counts: Object.fromEntries(counts),
  });
}
