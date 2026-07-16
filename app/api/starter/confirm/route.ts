import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureMarkets } from "@/lib/markets";
import { confirmStarterSelection, getStarterView } from "@/lib/starter";

export const dynamic = "force-dynamic";

/**
 * 스타터 포트폴리오 선택 확정 + 스테이지 1 지급 (원자적).
 * body: { mainId: string, subIds: string[4] }
 * 기준가·수량·자격은 전부 서버가 계산 — 클라이언트 값은 선택 id만 사용.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const mainId = typeof body?.mainId === "string" ? body.mainId : "";
  const subIds = Array.isArray(body?.subIds)
    ? body.subIds.filter((s: unknown) => typeof s === "string")
    : [];

  await ensureMarkets();
  const result = await confirmStarterSelection(userId, mainId, subIds);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  const view = await getStarterView(userId);
  return NextResponse.json({ ok: true, ...view });
}
