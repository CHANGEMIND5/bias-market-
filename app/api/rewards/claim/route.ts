import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  kstDateKey,
  kstWeekKey,
  ONBOARDING_STEPS,
  pickDailyMissions,
  pickWeeklyMissions,
  REWARDS,
} from "@/lib/missions";
import { grantReward } from "@/lib/rewards";

export const dynamic = "force-dynamic";

function bad(error: string) {
  return NextResponse.json({ ok: false, error });
}

/**
 * POST /api/rewards/claim — 보상 번들 수령
 * kind: "daily_all" | "daily_bonus" | "weekly" | "onboarding"
 * 서버가 자격 검증 → 멱등 지급 → 상태 갱신 (클라이언트 금액은 신뢰하지 않음)
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }

  const data = await req.json().catch(() => null);
  const kind = typeof data?.kind === "string" ? data.kind : "";

  const dateKey = kstDateKey();
  const weekKey = kstWeekKey();
  const state = await prisma.userRewardState.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const allCompleted = async (periodKey: string, types: string[]) => {
    const rows = await prisma.missionProgress.findMany({
      where: { userId, periodKey, missionType: { in: types }, completed: true },
    });
    return rows.length >= types.length;
  };

  let fan = 0, xp = 0, influence = 0;

  if (kind === "daily_all") {
    if (state.dailyAllClaimedDate === dateKey) return bad("이미 받았어요.");
    const types = pickDailyMissions(dateKey).map((m) => m.type);
    if (!(await allCompleted(`D:${dateKey}`, types)))
      return bad("아직 오늘의 미션이 남아 있어요.");
    fan = REWARDS.dailyAllFan; xp = REWARDS.dailyAllXp; influence = REWARDS.dailyAllInfluence;
    const ok = await grantReward(userId, `daily-completion:${userId}:${dateKey}`, fan, xp, influence);
    if (!ok) return bad("이미 받았어요.");
    await prisma.userRewardState.update({
      where: { userId },
      data: { dailyAllClaimedDate: dateKey },
    });
  } else if (kind === "daily_bonus") {
    if (state.dailyBonusClaimedDate === dateKey) return bad("이미 받았어요.");
    if (state.lastCheckInDate !== dateKey) return bad("먼저 출석 체크를 해주세요.");
    if (state.dailyAllClaimedDate !== dateKey)
      return bad("오늘의 미션 완료 보상을 먼저 받아주세요.");
    fan = REWARDS.dailyBonusFan;
    const ok = await grantReward(userId, `daily-bonus:${userId}:${dateKey}`, fan, 0, 0);
    if (!ok) return bad("이미 받았어요.");
    await prisma.userRewardState.update({
      where: { userId },
      data: { dailyBonusClaimedDate: dateKey },
    });
  } else if (kind === "weekly") {
    if (state.weeklyClaimedKey === weekKey) return bad("이번 주 보상은 이미 받았어요.");
    const types = pickWeeklyMissions(weekKey).map((m) => m.type);
    if (!(await allCompleted(`W:${weekKey}`, types)))
      return bad("아직 주간 미션이 남아 있어요.");
    fan = REWARDS.weeklyFan; xp = REWARDS.weeklyXp; influence = REWARDS.weeklyInfluence;
    const ok = await grantReward(userId, `weekly-completion:${userId}:${weekKey}`, fan, xp, influence);
    if (!ok) return bad("이미 받았어요.");
    await prisma.userRewardState.update({
      where: { userId },
      data: { weeklyClaimedKey: weekKey },
    });
  } else if (kind === "onboarding") {
    if (state.onboardingRewardClaimed) return bad("이미 받았어요.");
    const types = ONBOARDING_STEPS.map((m) => m.type);
    if (!(await allCompleted("ONB", types)))
      return bad("아직 시작하기 단계가 남아 있어요.");
    fan = REWARDS.onboardingFan; xp = REWARDS.onboardingXp; influence = REWARDS.onboardingInfluence;
    const ok = await grantReward(userId, `onboarding-completion:${userId}`, fan, xp, influence);
    if (!ok) return bad("이미 받았어요.");
    await prisma.userRewardState.update({
      where: { userId },
      data: { onboardingRewardClaimed: true },
    });
  } else {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return NextResponse.json({
    ok: true,
    fan,
    xp,
    influence,
    balance: user?.balance ?? 0,
  });
}
