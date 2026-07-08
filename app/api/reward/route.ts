import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayString } from "@/lib/format";
import { DAILY_REWARD } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Google 로그인 후 받을 수 있어요." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "계정을 찾을 수 없습니다. 다시 로그인해 주세요." },
      { status: 401 }
    );
  }

  const today = todayString();
  if (user.lastRewardDate === today) {
    return NextResponse.json({
      ok: false,
      error: "오늘의 보상은 이미 받았어요. 내일 다시 오세요!",
    });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      balance: { increment: DAILY_REWARD },
      xp: { increment: 10 },
      lastRewardDate: today,
    },
  });

  return NextResponse.json({
    ok: true,
    balance: updated.balance,
    xp: updated.xp,
    lastRewardDate: updated.lastRewardDate,
  });
}
