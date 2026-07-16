import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordEvent } from "@/lib/rewards";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "market_viewed",
  "battle_viewed",
  "portfolio_viewed",
  "post_opened",
]);

/**
 * POST /api/missions/event — 클라이언트 행동 이벤트 (조회형만).
 * 거래/관심 추가는 각 서버 경로에서 직접 기록되므로 여기서 받지 않음
 * (클라이언트가 거래 완료를 위조할 수 없게).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const data = await req.json().catch(() => null);
  const type = typeof data?.type === "string" ? data.type : "";
  const key =
    typeof data?.key === "string" ? data.key.slice(0, 64) : undefined;
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await recordEvent(userId, type as never, key);
  } catch {
    // 미션 기록 실패는 조용히 무시
  }
  return NextResponse.json({ ok: true });
}
