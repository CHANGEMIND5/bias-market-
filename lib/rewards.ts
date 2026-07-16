// ─────────────────────────────────────────────────────────────
// 보상/미션 서버 로직 (서버 전용)
// - 모든 지급은 서버에서만, RewardLedger의 sourceKey(unique)로 멱등성 보장
// - 시스템 봇 거래는 여기로 절대 오지 않음 (/api/trade 유저 경로만 훅)
// - hidden/멤버 마켓 이벤트는 무시
// ─────────────────────────────────────────────────────────────
import { prisma } from "./db";
import { GROUP_MAP } from "./mockData";
import {
  kstDateKey,
  kstWeekKey,
  MissionDef,
  ONBOARDING_STEPS,
  pickDailyMissions,
  pickWeeklyMissions,
  REWARDS,
} from "./missions";
import { bumpStarterOnboarding } from "./starter";

/**
 * 멱등 보상 지급 — 같은 sourceKey로는 단 한 번만 지급됨.
 * 지급 성공 시 true, 이미 지급된 키면 false.
 */
export async function grantReward(
  userId: string,
  sourceKey: string,
  fan: number,
  xp: number,
  influence: number
): Promise<boolean> {
  try {
    await prisma.$transaction([
      prisma.rewardLedger.create({
        data: { userId, sourceKey, fan, xp, influence },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          ...(fan !== 0 ? { balance: { increment: fan } } : {}),
          ...(xp !== 0 ? { xp: { increment: xp } } : {}),
          ...(influence !== 0 ? { influence: { increment: influence } } : {}),
        },
      }),
    ]);
    return true;
  } catch {
    return false; // sourceKey unique 충돌 = 이미 지급
  }
}

async function getOrCreateRewardState(userId: string) {
  return prisma.userRewardState.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function getOrCreateMission(
  userId: string,
  periodKey: string,
  def: MissionDef
) {
  return prisma.missionProgress.upsert({
    where: {
      userId_periodKey_missionType: {
        userId,
        periodKey,
        missionType: def.type,
      },
    },
    update: {},
    create: { userId, periodKey, missionType: def.type, target: def.target },
  });
}

/** 진행 +1 (dedupeKey가 meta에 이미 있으면 무시). 완료되면 미션 보상 자동 지급. */
async function bumpMission(
  userId: string,
  periodKey: string,
  def: MissionDef,
  dedupeKey: string | null,
  isDaily: boolean
): Promise<boolean> {
  const row = await getOrCreateMission(userId, periodKey, def);
  if (row.completed) return false;

  let meta = row.meta ?? "";
  if (dedupeKey) {
    const seen = meta.split(",").filter(Boolean);
    if (seen.includes(dedupeKey)) return false; // 새로고침/반복 행동 방지
    seen.push(dedupeKey);
    meta = seen.join(",");
  }

  const progress = row.progress + 1;
  const completed = progress >= row.target;
  await prisma.missionProgress.update({
    where: { id: row.id },
    data: { progress, completed, meta: dedupeKey ? meta : row.meta },
  });

  if (completed && isDaily) {
    // 일일 미션 완료 → 영향력/XP 자동 지급 (Fan$ 아님)
    await grantReward(
      userId,
      `daily-mission:${userId}:${periodKey}:${def.type}`,
      0,
      REWARDS.perMissionXp,
      REWARDS.perMissionInfluence
    );
    // 주간 "일일 미션 12개" 진행
    const weekKey = `W:${kstWeekKey()}`;
    const wDef = pickWeeklyMissions(kstWeekKey()).find(
      (d) => d.type === "w_daily_missions_12"
    );
    if (wDef) {
      await bumpMission(userId, weekKey, wDef, `${periodKey}:${def.type}`, false);
    }
  }
  return completed;
}

/**
 * 유저 행동 이벤트 → 관련된 오늘의/주간/온보딩 미션 진행 반영.
 * 실패해도 호출부(거래 등)를 막지 않도록 반드시 try/catch로 감싸서 호출할 것.
 */
export async function recordEvent(
  userId: string,
  type:
    | "market_viewed"
    | "watchlist_added"
    | "trade_completed"
    | "battle_viewed"
    | "portfolio_viewed"
    | "post_opened",
  key?: string
): Promise<void> {
  const dateKey = kstDateKey();
  const dKey = `D:${dateKey}`;
  const wKey = `W:${kstWeekKey()}`;
  const daily = pickDailyMissions(dateKey);
  const weekly = pickWeeklyMissions(kstWeekKey());
  const d = (t: string) => daily.find((m) => m.type === t);
  const w = (t: string) => weekly.find((m) => m.type === t);
  const ob = (t: string) => ONBOARDING_STEPS.find((m) => m.type === t)!;

  switch (type) {
    case "market_viewed": {
      const g = key ? GROUP_MAP[key] : undefined;
      // hidden·멤버 마켓은 미션 진행으로 인정하지 않음
      if (!g || g.category !== "group" || g.defaultVisible === false) return;
      const dm = d("visit_markets_3");
      if (dm) await bumpMission(userId, dKey, dm, `${dateKey}:${g.id}`, true);
      const dc = d("view_charts_2");
      if (dc) await bumpMission(userId, dKey, dc, `${dateKey}:${g.id}`, true);
      if (g.tier === "rookie") {
        const dr = d("visit_rookie_1");
        if (dr) await bumpMission(userId, dKey, dr, `${dateKey}:${g.id}`, true);
        const wr = w("w_rookie_3");
        if (wr) await bumpMission(userId, wKey, wr, g.id, false);
      }
      const wv = w("w_visit_markets_10");
      if (wv) await bumpMission(userId, wKey, wv, g.id, false);
      await bumpMission(userId, "ONB", ob("ob_market_visit"), null, false);
      await bumpStarterOnboarding(userId, "market_visit", g.id);
      break;
    }
    case "watchlist_added": {
      if (!key) return;
      const dm = d("add_watchlist_1");
      if (dm) await bumpMission(userId, dKey, dm, `${dateKey}:${key}`, true);
      const wm = w("w_watchlist_5");
      if (wm) await bumpMission(userId, wKey, wm, key, false);
      await bumpMission(userId, "ONB", ob("ob_fav_first"), key, false);
      await bumpMission(userId, "ONB", ob("ob_fav_3"), key, false);
      break;
    }
    case "trade_completed": {
      const dm = d("trade_1");
      if (dm) await bumpMission(userId, dKey, dm, null, true);
      const wd = w("w_trade_days_3");
      if (wd) await bumpMission(userId, wKey, wd, dateKey, false);
      const wt = w("w_trades_5");
      if (wt) await bumpMission(userId, wKey, wt, null, false);
      await bumpMission(userId, "ONB", ob("ob_first_trade"), null, false);
      await bumpStarterOnboarding(userId, "trade");
      break;
    }
    case "battle_viewed": {
      const dm = d("view_battle");
      if (dm) await bumpMission(userId, dKey, dm, dateKey, true);
      const wm = w("w_battle_days_4");
      if (wm) await bumpMission(userId, wKey, wm, dateKey, false);
      await bumpMission(userId, "ONB", ob("ob_battle"), null, false);
      await bumpStarterOnboarding(userId, "battle");
      break;
    }
    case "portfolio_viewed": {
      const dm = d("view_portfolio");
      if (dm) await bumpMission(userId, dKey, dm, dateKey, true);
      const wm = w("w_portfolio_days_4");
      if (wm) await bumpMission(userId, wKey, wm, dateKey, false);
      await bumpMission(userId, "ONB", ob("ob_portfolio"), null, false);
      await bumpStarterOnboarding(userId, "portfolio");
      break;
    }
    case "post_opened": {
      if (!key) return;
      const dm = d("read_post_1");
      if (dm) await bumpMission(userId, dKey, dm, `${dateKey}:${key}`, true);
      const wm = w("w_read_posts_5");
      if (wm) await bumpMission(userId, wKey, wm, key, false);
      break;
    }
  }
}

/** 일일 출석 체크 (7일 스트릭) — /api/rewards/checkin과 구 /api/reward 공용 */
export async function performCheckin(userId: string): Promise<
  | { ok: true; streak: number; fan: number; xp: number; balance: number }
  | { ok: false; error: string }
> {
  const today = kstDateKey();
  const yesterday = kstDateKey(Date.now() - 86_400_000);

  const state = await prisma.userRewardState.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  if (state.lastCheckInDate === today) {
    return { ok: false, error: "오늘의 보상은 이미 받았어요. 내일 다시 오세요!" };
  }

  const day =
    state.lastCheckInDate === yesterday && state.currentStreak < 7
      ? state.currentStreak + 1
      : 1;
  const fan = REWARDS.streakFan[day - 1];
  const xp = REWARDS.streakXp[day - 1];

  const granted = await grantReward(
    userId,
    `daily-checkin:${userId}:${today}`,
    fan,
    xp,
    0
  );
  if (!granted) {
    return { ok: false, error: "오늘의 보상은 이미 받았어요. 내일 다시 오세요!" };
  }

  await prisma.userRewardState.update({
    where: { userId },
    data: { currentStreak: day, lastCheckInDate: today },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return { ok: true, streak: day, fan, xp, balance: user?.balance ?? 0 };
}

/** 기존 유저 온보딩 백필 — 이미 한 행동은 완료로 인정 (보상은 별도 수령) */
export async function backfillOnboarding(userId: string): Promise<void> {
  const existing = await prisma.missionProgress.findMany({
    where: { userId, periodKey: "ONB" },
  });
  if (existing.length >= ONBOARDING_STEPS.length) return;

  const [favCount, tradeCount] = await Promise.all([
    prisma.favorite.count({ where: { userId } }),
    prisma.trade.count({ where: { userId } }),
  ]);
  const have = new Set(existing.map((m) => m.missionType));
  const init: Record<string, number> = {
    ob_fav_first: Math.min(favCount, 1),
    ob_fav_3: Math.min(favCount, 3),
    ob_market_visit: tradeCount > 0 ? 1 : 0, // 거래했다면 마켓 방문도 한 것
    ob_first_trade: Math.min(tradeCount, 1),
    ob_portfolio: 0,
    ob_battle: 0,
  };
  for (const def of ONBOARDING_STEPS) {
    if (have.has(def.type)) continue;
    const p = Math.min(init[def.type] ?? 0, def.target);
    await prisma.missionProgress.create({
      data: {
        userId,
        periodKey: "ONB",
        missionType: def.type,
        progress: p,
        target: def.target,
        completed: p >= def.target,
      },
    });
  }
}
