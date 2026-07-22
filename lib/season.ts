// ─────────────────────────────────────────────────────────────
// 월간 시즌제 (서버 전용)
//
// 매월 말(KST 1일 0시) 롤오버:
//   1) 각 노출 그룹의 #1 보유자에게 그 시즌 영구 배지 (SeasonBadge)
//   2) 모든 보유 주식을 그 순간 시세로 Fan$ 정산 (AMM 미경유 → 폭락 없음)
//   3) 마켓을 초기 상태로 리셋 (가격 초기화, 보유 0)
//   4) 명예의 전당(총 자산 순위) 기록 + 상위 3명 보상(영향력 + 챔피언 배지)
//
// 총 자산(잔액+보유가치)은 보존됨 — 청산은 보유가치를 잔액으로 옮길 뿐.
// 전 단계가 멱등이라 중간 실패 후 재실행해도 안전.
// ─────────────────────────────────────────────────────────────
import { prisma } from "./db";
import { ECONOMY_VERSION, num, r8 } from "./economy";
import { v2MarketInit } from "./markets";
import { GROUP_MAP, GROUPS, VISIBLE_GROUPS } from "./mockData";

const KST = 9 * 3600_000;

/** KST 기준 시즌 키 "YYYY-MM" */
export function seasonKey(now = Date.now()): string {
  return new Date(now + KST).toISOString().slice(0, 7);
}

/** 이번 시즌 종료(다음 달 1일 0시 KST)까지 남은 ms */
export function msToSeasonEnd(now = Date.now()): number {
  const k = new Date(now + KST);
  const endKst = Date.UTC(k.getUTCFullYear(), k.getUTCMonth() + 1, 1, 0, 0, 0);
  return endKst - (now + KST);
}

const CHAMPION_INFLUENCE = [500, 300, 200]; // 1~3위 영향력 보상

/**
 * 지난 시즌이 아직 마감 안 됐으면 롤오버 실행 (멱등).
 * force=true 면 마감 여부와 무관하게 "직전 시즌" 롤오버를 다시 시도(관리자 테스트용).
 */
export async function runSeasonRolloverIfNeeded(force = false): Promise<{
  ran: boolean;
  seasonKey?: string;
}> {
  // 직전 달 = 이번 달 1일에서 하루 전
  const nowKst = new Date(Date.now() + KST);
  const firstOfThisMonthKstMs = Date.UTC(
    nowKst.getUTCFullYear(), nowKst.getUTCMonth(), 1, 0, 0, 0
  );
  const prevKey = seasonKey(firstOfThisMonthKstMs - KST - 86_400_000);

  const existing = await prisma.season.findUnique({ where: { seasonKey: prevKey } });
  if (existing && existing.status === "closed" && !force) {
    return { ran: false };
  }

  await rollover(prevKey);
  return { ran: true, seasonKey: prevKey };
}

/** 특정 시즌 키로 롤오버 강제 실행 (관리자 수동) */
export async function forceRollover(key: string): Promise<void> {
  await rollover(key);
}

async function rollover(key: string): Promise<void> {
  const visibleIds = VISIBLE_GROUPS.map((g) => g.id);

  // ── 1) 각 그룹 #1 보유자 영구 배지 ──
  for (const gid of visibleIds) {
    const top = await prisma.holding.findFirst({
      where: { groupId: gid, shares: { gt: 0 } },
      orderBy: { shares: "desc" },
      select: { userId: true },
    });
    if (!top) continue;
    try {
      await prisma.seasonBadge.create({
        data: { userId: top.userId, seasonKey: key, groupId: gid, kind: "GROUP_TOP", rank: 1 },
      });
    } catch {
      // unique(seasonKey, groupId) 충돌 = 이미 부여됨
    }
  }

  // ── 2) 총 자산 계산 (청산 전이든 후든 잔액+보유가치는 불변) ──
  const [markets, holdings, users] = await Promise.all([
    prisma.market.findMany(),
    prisma.holding.findMany({ where: { shares: { gt: 0 } } }),
    prisma.user.findMany({ select: { id: true, name: true, balance: true } }),
  ]);
  const spot = new Map<string, number>();
  for (const m of markets) {
    const sh = num(m.shareReserve);
    spot.set(m.groupId, sh > 0 ? num(m.fanReserve) / sh : 0);
  }
  const holdValue = new Map<string, number>(); // userId → 보유 가치
  for (const h of holdings) {
    const v = num(h.shares) * (spot.get(h.groupId) ?? 0);
    holdValue.set(h.userId, (holdValue.get(h.userId) ?? 0) + v);
  }
  const wealth = users
    .map((u) => ({
      userId: u.id,
      name: u.name ?? "익명 팬",
      wealth: r8(u.balance + (holdValue.get(u.id) ?? 0)),
    }))
    .sort((a, b) => b.wealth - a.wealth);

  // ── 3) 청산: 유저별 보유가치를 잔액으로 옮기고 보유 삭제 (원자적) ──
  const usersWithHoldings = Array.from(
    new Set(holdings.map((h) => h.userId))
  );
  for (const uid of usersWithHoldings) {
    const gain = holdValue.get(uid) ?? 0;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: uid },
        data: { balance: { increment: r8(gain) } },
      }),
      prisma.holding.deleteMany({ where: { userId: uid } }),
    ]);
  }

  // ── 4) 마켓 초기화 (가격 리셋, 보유 0) ──
  for (let i = 0; i < GROUPS.length; i += 50) {
    const chunk = GROUPS.slice(i, i + 50);
    await prisma.$transaction(
      chunk.map((g) => {
        const init = v2MarketInit(g);
        const { groupId, ...data } = init;
        return prisma.market.updateMany({
          where: { groupId, economyVersion: ECONOMY_VERSION },
          data,
        });
      })
    );
  }

  // ── 5) 상위 3명 보상 (영향력 + 챔피언 배지, 멱등) ──
  for (let rank = 1; rank <= Math.min(3, wealth.length); rank++) {
    const w = wealth[rank - 1];
    // 영향력 보상 (RewardLedger 멱등)
    try {
      await prisma.$transaction([
        prisma.rewardLedger.create({
          data: {
            userId: w.userId,
            sourceKey: `season-reward:${key}:${rank}`,
            rewardType: "SEASON_CHAMPION",
            influence: CHAMPION_INFLUENCE[rank - 1],
          },
        }),
        prisma.user.update({
          where: { id: w.userId },
          data: { influence: { increment: CHAMPION_INFLUENCE[rank - 1] } },
        }),
      ]);
    } catch {
      // 이미 지급됨
    }
    // 챔피언 영구 배지
    try {
      await prisma.seasonBadge.create({
        data: {
          userId: w.userId, seasonKey: key,
          groupId: `__champion_${rank}__`, kind: "CHAMPION", rank,
        },
      });
    } catch {
      // 이미 부여됨
    }
  }

  // ── 6) 시즌 마감 기록 (명예의 전당 상위 10) ──
  const hallOfFame = wealth.slice(0, 10).map((w, i) => ({
    userId: w.userId, name: w.name, wealth: w.wealth, rank: i + 1,
  }));
  await prisma.season.upsert({
    where: { seasonKey: key },
    update: { status: "closed", hallOfFame: JSON.stringify(hallOfFame), closedAt: new Date() },
    create: { seasonKey: key, status: "closed", hallOfFame: JSON.stringify(hallOfFame) },
  });
}

// ── 조회용 ──
export interface SeasonBadgeView {
  seasonKey: string;
  groupId: string;
  kind: string;
  rank: number;
  groupName: string | null;
}

export async function getSeasonView(userId: string | null) {
  const [lastSeason, myBadges] = await Promise.all([
    prisma.season.findFirst({
      where: { status: "closed" },
      orderBy: { seasonKey: "desc" },
    }),
    userId
      ? prisma.seasonBadge.findMany({
          where: { userId },
          orderBy: [{ seasonKey: "desc" }, { rank: "asc" }],
          take: 60,
        })
      : Promise.resolve([]),
  ]);

  let hallOfFame: any[] = [];
  if (lastSeason?.hallOfFame) {
    try {
      hallOfFame = JSON.parse(lastSeason.hallOfFame);
    } catch {
      hallOfFame = [];
    }
  }

  const badges: SeasonBadgeView[] = (myBadges as any[]).map((b) => ({
    seasonKey: b.seasonKey,
    groupId: b.groupId,
    kind: b.kind,
    rank: b.rank,
    groupName: b.kind === "GROUP_TOP" ? GROUP_MAP[b.groupId]?.name ?? null : null,
  }));

  return {
    currentSeason: seasonKey(),
    endsInMs: msToSeasonEnd(),
    lastSeasonKey: lastSeason?.seasonKey ?? null,
    hallOfFame,
    myBadges: badges,
  };
}
