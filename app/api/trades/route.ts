import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GROUP_MAP } from "@/lib/mockData";

export const dynamic = "force-dynamic";

/** GET /api/trades?groupId=bts — 해당 종목의 실제 최근 거래 (모든 유저, 익명) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId") ?? "";
  if (!GROUP_MAP[groupId]) {
    return NextResponse.json({ error: "존재하지 않는 그룹입니다." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const uid = session?.user?.id ?? null;

  const trades = await prisma.trade.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    trades: trades.map((t) => ({
      id: t.id,
      side: t.side,
      price: t.price,
      shares: t.shares,
      fan: t.fan,
      time: t.createdAt.toISOString(),
      isSystem: t.isSystem,
      actor: t.isSystem ? "SYSTEM" : null,
      mine: uid !== null && t.userId === uid,
    })),
  });
}
