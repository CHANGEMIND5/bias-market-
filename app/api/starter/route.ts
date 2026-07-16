import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStarterView } from "@/lib/starter";

export const dynamic = "force-dynamic";

/** 스타터 팬덤 포트폴리오 현황 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const view = await getStarterView(userId);
  return NextResponse.json({ ok: true, ...view });
}
