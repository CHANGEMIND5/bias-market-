import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { num } from "@/lib/economy";
import { GROUP_MAP } from "@/lib/mockData";

export const dynamic = "force-dynamic";

// 컬렉션·최대 보유자 배지에 인정되는 그룹인지 (노출 그룹만)
function eligible(groupId: string): boolean {
  const g = GROUP_MAP[groupId];
  return !!(g && g.category === "group" && g.defaultVisible !== false);
}

/**
 * GET /api/badges — 배지 데이터.
 *  collected: 한 번이라도 매수한 그룹(팔아도 유지) = 컬렉션 배지
 *  topHolder: 현재 그 그룹의 상위 3 보유자인 그룹 + 순위
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: true, collected: [], topHolder: [] });
  }

  const [buys, holdings] = await Promise.all([
    prisma.trade.findMany({
      where: { userId, side: "buy" },
      distinct: ["groupId"],
      select: { groupId: true },
    }),
    prisma.holding.findMany({
      where: { userId, shares: { gt: 0 } },
      select: { groupId: true, shares: true },
    }),
  ]);

  const collected = buys
    .map((b: { groupId: string }) => b.groupId)
    .filter(eligible);

  // 상위 3 보유자: 나보다 많이 가진 홀더 수 < 3 이면 top-3
  const topHolder: { groupId: string; rank: number }[] = [];
  for (const h of holdings) {
    if (!eligible(h.groupId)) continue;
    const better = await prisma.holding.count({
      where: { groupId: h.groupId, shares: { gt: num(h.shares) } },
    });
    if (better < 3) topHolder.push({ groupId: h.groupId, rank: better + 1 });
  }
  topHolder.sort((a, b) => a.rank - b.rank);

  return NextResponse.json({ ok: true, collected, topHolder });
}
