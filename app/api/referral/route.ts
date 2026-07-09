import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/referral — 초대 코드 적용 (신규 유저만)
 * 조건: 로그인, 아직 초대 관계 없음, 거래 이력 0, 자기 자신 아님
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }

  const data = await req.json().catch(() => null);
  const code =
    typeof data?.code === "string" ? data.code.trim().toUpperCase() : "";
  if (!code || code.length > 12) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  if (me.referredBy) return NextResponse.json({ ok: false }); // 이미 적용됨

  // 신규 유저만: 거래 이력이 있으면 기존 유저로 간주
  const tradeCount = await prisma.trade.count({ where: { userId } });
  if (tradeCount > 0) return NextResponse.json({ ok: false });

  const inviter = await prisma.user.findUnique({ where: { refCode: code } });
  if (!inviter || inviter.id === userId) {
    return NextResponse.json({ ok: false });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { referredBy: inviter.id },
  });

  return NextResponse.json({ ok: true });
}
