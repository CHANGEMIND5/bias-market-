import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { forceRollover, seasonKey } from "@/lib/season";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/season — 관리자 수동 시즌 롤오버 (테스트용).
 * body: { seasonKey?: string }  없으면 "직전 달" 키로 실행.
 * 청산·마켓 리셋을 실제로 수행하므로 신중히.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  // 기본: 이번 달 키로 마감(테스트에서 즉시 시즌 종료 효과)
  const key = typeof body?.seasonKey === "string" ? body.seasonKey : seasonKey();
  try {
    await forceRollover(key);
  } catch (e) {
    console.error("[admin/season] rollover failed:", e);
    return NextResponse.json({ ok: false, error: "롤오버 실패" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, seasonKey: key });
}
