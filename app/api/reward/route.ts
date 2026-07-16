import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { performCheckin } from "@/lib/rewards";

export const dynamic = "force-dynamic";

/**
 * POST /api/reward — (구) 일일 보상 엔드포인트.
 * 이제 출석 체크(/api/rewards/checkin)와 동일하게 동작합니다 (하위 호환).
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Google 로그인 후 받을 수 있어요." },
      { status: 401 }
    );
  }
  const result = await performCheckin(userId);
  if (!result.ok) return NextResponse.json(result);
  return NextResponse.json({
    ...result,
    lastRewardDate: null, // 구 필드 — 신규 클라이언트는 사용하지 않음
  });
}
