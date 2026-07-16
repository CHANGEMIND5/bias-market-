import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { claimStarterStage2, getStarterView } from "@/lib/starter";

export const dynamic = "force-dynamic";

/** 스테이지 2 수령 — 온보딩 4개 조건 서버 검증 후 원자적 이전 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const result = await claimStarterStage2(userId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  const view = await getStarterView(userId);
  return NextResponse.json({ ok: true, ...view });
}
