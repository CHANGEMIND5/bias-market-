import { NextResponse } from "next/server";
import { getLastWeekFandom, snapshotWeeklyFandomIfNeeded } from "@/lib/weeklyFandom";

export const dynamic = "force-dynamic";

/** GET /api/weekly-fandom — 지난주 팬덤 배틀 결과 (스냅샷) */
export async function GET() {
  try {
    await snapshotWeeklyFandomIfNeeded();
  } catch {
    // 스냅샷 실패가 조회를 막지 않게
  }
  const last = await getLastWeekFandom();
  return NextResponse.json({ ok: true, lastWeek: last });
}
