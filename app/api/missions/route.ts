import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  kstDateKey,
  kstWeekKey,
  msToKstMidnight,
  ONBOARDING_STEPS,
  pickDailyMissions,
  pickWeeklyMissions,
} from "@/lib/missions";
import { backfillOnboarding } from "@/lib/rewards";

export const dynamic = "force-dynamic";

/** GET /api/missions — 오늘의/주간/온보딩 미션 상태 + 보상 상태 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }

  const dateKey = kstDateKey();
  const weekKey = kstWeekKey();
  const dKey = `D:${dateKey}`;
  const wKey = `W:${weekKey}`;

  await backfillOnboarding(userId);

  const rows = await prisma.missionProgress.findMany({
    where: { userId, periodKey: { in: [dKey, wKey, "ONB"] } },
  });
  const rowMap = new Map(rows.map((r) => [`${r.periodKey}:${r.missionType}`, r]));

  const toView = (periodKey: string) => (def: { type: string; titleKey: string; target: number }) => {
    const r = rowMap.get(`${periodKey}:${def.type}`);
    return {
      type: def.type,
      titleKey: def.titleKey,
      target: def.target,
      progress: Math.min(r?.progress ?? 0, def.target),
      completed: r?.completed ?? false,
    };
  };

  const state = await prisma.userRewardState.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  return NextResponse.json({
    ok: true,
    dateKey,
    weekKey,
    resetInMs: msToKstMidnight(),
    daily: pickDailyMissions(dateKey).map(toView(dKey)),
    weekly: pickWeeklyMissions(weekKey).map(toView(wKey)),
    onboarding: ONBOARDING_STEPS.map(toView("ONB")),
    rewardState: {
      streak: state.currentStreak,
      checkedInToday: state.lastCheckInDate === dateKey,
      dailyAllClaimed: state.dailyAllClaimedDate === dateKey,
      dailyBonusClaimed: state.dailyBonusClaimedDate === dateKey,
      weeklyClaimed: state.weeklyClaimedKey === weekKey,
      onboardingClaimed: state.onboardingRewardClaimed,
    },
  });
}
