import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSeasonView } from "@/lib/season";

export const dynamic = "force-dynamic";

/** GET /api/season — 현재 시즌 카운트다운 + 지난 시즌 명예의 전당 + 내 시즌 배지 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const view = await getSeasonView(session?.user?.id ?? null);
  return NextResponse.json({ ok: true, ...view });
}
