import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { performCheckin } from "@/lib/rewards";

export const dynamic = "force-dynamic";

/**
 * POST /api/rewards/checkin — 일일 출석 체크 (7일 스트릭).
 * 스트릭 보상이 곧 일일 체크인 보상 (중복 지급 없음).
 * KST 기준 하루 1회, 하루 놓치면 1일차로 리셋.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }
  const result = await performCheckin(userId);
  return NextResponse.json(result);
}
