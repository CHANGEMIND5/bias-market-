// ─────────────────────────────────────────────────────────────
// 스타터 팬덤 포트폴리오 (서버 전용)
//
// 신규 유저가 대표 팬덤 1 + 서브 팬덤 4를 고르면 총 Fan$ 1,000 상당의
// Fan Shares를 두 단계로 지급합니다 (선택 확정 500 + 온보딩 완료 500).
//
// 핵심 원칙:
//   - 지급은 AMM 매수가 아니라 "시스템 준비금 → 유저 보유" 직접 이전
//     → 가격/풀/거래량/배틀 점수에 영향 없음, BUY 거래로 기록되지 않음
//   - 기준가는 선택 확정 시점에 서버가 스냅샷 (15분 TWAP 우선, 스팟 폴백)
//     양 스테이지 모두 같은 저장된 기준가 사용 (시세 조작 방지)
//   - 모든 이전은 단일 트랜잭션 + RewardLedger 멱등 키 + 공급 불변식 검증
//   - 클라이언트가 보낸 가격/수량/자격은 절대 신뢰하지 않음
// ─────────────────────────────────────────────────────────────
import { prisma } from "./db";
import {
  assertSupplyInvariant,
  ECONOMY_VERSION,
  num,
  r8,
  referencePrice,
} from "./economy";
import { GROUP_MAP } from "./mockData";
import { seasonKey } from "./season";

export const STARTER_TOTAL_FAN = 1000;
export const MAIN_STAGE_FAN = 200; // 대표 팬덤: 스테이지당 200 (합계 400)
export const SUB_STAGE_FAN = 75; // 서브 팬덤: 스테이지당 75 (합계 150)
export const STARTER_VISIT_TARGET = 3; // 온보딩: 서로 다른 마켓 3곳 방문

const ELIGIBLE_TIERS = new Set(["mega", "large", "mid", "rookie"]);

/** 스타터 포트폴리오에 선택 가능한 마켓인지 (서버 기준 검증) */
export function isStarterEligible(groupId: string): boolean {
  const g = GROUP_MAP[groupId];
  return !!(
    g &&
    g.category === "group" &&
    g.defaultVisible !== false &&
    g.tier &&
    ELIGIBLE_TIERS.has(g.tier)
  );
}

export type StarterError =
  | "invalid_selection"
  | "already_claimed"
  | "economy_not_ready"
  | "insufficient_reserve"
  | "not_eligible_yet"
  | "server_error";

// ─── 선택 확정 + 스테이지 1 지급 (원자적) ───
export async function confirmStarterSelection(
  userId: string,
  mainId: string,
  subIds: string[]
): Promise<{ ok: true } | { ok: false; error: StarterError }> {
  // 1) 선택 검증: 5개, 중복 없음, 전부 선택 가능 마켓
  const ids = [mainId, ...subIds];
  if (subIds.length !== 4 || new Set(ids).size !== 5)
    return { ok: false, error: "invalid_selection" };
  if (!ids.every(isStarterEligible))
    return { ok: false, error: "invalid_selection" };

  // 2) 이미 확정했는지
  const existing = await prisma.starterPortfolio.findUnique({
    where: { userId },
  });
  if (existing) return { ok: false, error: "already_claimed" };

  // 3) 마켓 로드 (이코노미 v2 필수) + 서버 기준가 스냅샷
  const markets = await prisma.market.findMany({
    where: { groupId: { in: ids } },
  });
  if (markets.length !== 5) return { ok: false, error: "economy_not_ready" };
  const byId = new Map(markets.map((m: any) => [m.groupId, m]));

  type Alloc = {
    marketId: string;
    role: "MAIN" | "SUB";
    refPrice: number;
    stage1Fan: number;
    stage1Qty: number;
    stage2Fan: number;
    stage2Qty: number;
  };
  const allocs: Alloc[] = [];
  for (const gid of ids) {
    const m: any = byId.get(gid);
    if ((m.economyVersion ?? 1) < ECONOMY_VERSION)
      return { ok: false, error: "economy_not_ready" };
    const refPrice = await referencePrice(m);
    if (!isFinite(refPrice) || refPrice <= 0)
      return { ok: false, error: "server_error" };
    const isMain = gid === mainId;
    const stageFan = isMain ? MAIN_STAGE_FAN : SUB_STAGE_FAN;
    const qty = r8(stageFan / refPrice);
    allocs.push({
      marketId: gid,
      role: isMain ? "MAIN" : "SUB",
      refPrice: r8(refPrice),
      stage1Fan: stageFan,
      stage1Qty: qty,
      stage2Fan: stageFan,
      stage2Qty: qty, // 같은 기준가 → 같은 수량
    });
    // 준비금 충분성 (양 스테이지 모두 커버 가능해야 확정 허용)
    if (num(m.systemReserveShares) < qty * 2 + 1e-6) {
      console.error(
        `[ADMIN-ALERT][starter] insufficient reserve: market=${gid} reserve=${num(m.systemReserveShares)} needed=${qty * 2}`
      );
      return { ok: false, error: "insufficient_reserve" };
    }
  }

  // 4) 원자적 지급 — 하나라도 실패하면 전부 롤백
  try {
    await prisma.$transaction(async (tx) => {
      // 멱등 앵커: 동시 요청/더블클릭이면 여기서 unique 충돌 → 전체 롤백
      await tx.rewardLedger.create({
        data: {
          userId,
          sourceKey: `starter-selection:${userId}:${seasonKey()}`,
          rewardType: "STARTER_PORTFOLIO_SELECTION",
        },
      });
      const portfolio = await tx.starterPortfolio.create({
        data: {
          userId,
          status: "STAGE1_CLAIMED",
          selectionConfirmedAt: new Date(),
          stage1ClaimedAt: new Date(),
        },
      });
      for (const a of allocs) {
        await tx.starterPortfolioAllocation.create({
          data: {
            portfolioId: portfolio.id,
            marketId: a.marketId,
            role: a.role,
            referencePrice: a.refPrice,
            stage1FanValue: a.stage1Fan,
            stage1ShareQuantity: a.stage1Qty,
            stage2FanValue: a.stage2Fan,
            stage2ShareQuantity: a.stage2Qty,
            stage1Claimed: true,
          },
        });
        await transferFromReserve(tx, userId, a.marketId, a.stage1Qty, a.stage1Fan, a.refPrice, 1);
      }
      // 온보딩 진행 행 준비
      await tx.starterOnboardingProgress.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    });
    return { ok: true };
  } catch (e) {
    console.error("[starter] stage1 transaction failed:", e);
    return { ok: false, error: "already_claimed" };
  }
}

/** 준비금 → 유저 보유 직접 이전 (가격·풀·거래량 불변) — 트랜잭션 내부 전용 */
async function transferFromReserve(
  tx: any,
  userId: string,
  groupId: string,
  qty: number,
  fanValue: number,
  refPrice: number,
  stage: 1 | 2
): Promise<void> {
  const holding = await tx.holding.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  const isNew = !holding || num(holding.shares) <= 0;

  // 조건부 + 원자적 감소 — 봇/다른 지급과 동시에 실행돼도
  // 준비금이 충분한 경우에만 성공하고, 절대 덮어쓰지 않음
  const res = await tx.market.updateMany({
    where: { groupId, systemReserveShares: { gte: qty } },
    data: {
      systemReserveShares: { decrement: qty },
      starterSharesDistributed: { increment: qty },
      holders: { increment: isNew ? 1 : 0 },
      // fanReserve/shareReserve/volume24h 절대 변경 없음 — 가격 영향 0
    },
  });
  if (res.count === 0) {
    console.error(
      `[ADMIN-ALERT][starter] reserve exhausted during transfer: market=${groupId}`
    );
    throw new Error(`insufficient reserve: ${groupId}`);
  }
  await tx.holding.upsert({
    where: { userId_groupId: { userId, groupId } },
    update: {
      // 원자적 증가 — 동시 거래와 충돌해도 수량이 유실되지 않음
      shares: { increment: qty },
      // 취득 원가: 저장된 기준가 × 수량 (0원 취득 아님 → 수익률 왜곡 방지)
      cost: { increment: fanValue },
    },
    create: { userId, groupId, shares: qty, cost: fanValue },
  });
  await tx.rewardLedger.create({
    data: {
      userId,
      sourceKey: `starter-stage${stage}:${userId}:${groupId}:${seasonKey()}`,
      rewardType: "STARTER_PORTFOLIO_REWARD",
      marketId: groupId,
      shareAmount: qty,
      referencePrice: refPrice,
      fan: 0, // Fan$ 지급 아님 (Fan Shares 지급)
    },
  });
  await assertSupplyInvariant(tx, groupId);
}

// ─── 스테이지 2 지급 (온보딩 완료 후, 원자적) ───
export async function claimStarterStage2(
  userId: string
): Promise<{ ok: true } | { ok: false; error: StarterError }> {
  const [portfolio, progress] = await Promise.all([
    prisma.starterPortfolio.findUnique({
      where: { userId },
      include: { allocations: true },
    }),
    prisma.starterOnboardingProgress.findUnique({ where: { userId } }),
  ]);
  if (!portfolio || portfolio.status === "NOT_STARTED")
    return { ok: false, error: "invalid_selection" };
  if (portfolio.status === "COMPLETED")
    return { ok: false, error: "already_claimed" };
  if (!isStarterOnboardingComplete(progress))
    return { ok: false, error: "not_eligible_yet" };

  try {
    await prisma.$transaction(async (tx) => {
      // 멱등 앵커
      await tx.rewardLedger.create({
        data: {
          userId,
          sourceKey: `starter-stage2:${userId}:${seasonKey()}`,
          rewardType: "STARTER_PORTFOLIO_STAGE2",
        },
      });
      for (const a of portfolio.allocations) {
        if (a.stage2Claimed) continue;
        await transferFromReserve(
          tx, userId, a.marketId,
          num(a.stage2ShareQuantity), num(a.stage2FanValue),
          num(a.referencePrice), 2
        );
        await tx.starterPortfolioAllocation.update({
          where: { id: a.id },
          data: { stage2Claimed: true },
        });
      }
      await tx.starterPortfolio.update({
        where: { userId },
        data: {
          status: "COMPLETED",
          onboardingCompletedAt: progress?.completedAt ?? new Date(),
          stage2ClaimedAt: new Date(),
        },
      });
    });
    return { ok: true };
  } catch (e) {
    console.error("[starter] stage2 transaction failed:", e);
    return { ok: false, error: "already_claimed" };
  }
}

// ─── 온보딩 진행 추적 (신뢰된 서버 이벤트에서만 호출) ───
export function isStarterOnboardingComplete(
  p: {
    visitedMarkets: string;
    portfolioViewed: boolean;
    firstTradeCompleted: boolean;
    battleViewed: boolean;
  } | null
): boolean {
  if (!p) return false;
  const visits = p.visitedMarkets.split(",").filter(Boolean).length;
  return (
    visits >= STARTER_VISIT_TARGET &&
    p.portfolioViewed &&
    p.firstTradeCompleted &&
    p.battleViewed
  );
}

/**
 * 스타터 온보딩 이벤트 반영. lib/rewards.ts recordEvent에서 호출됨.
 * market_visit은 노출 그룹 마켓만, 같은 마켓 재방문/새로고침은 무시.
 */
export async function bumpStarterOnboarding(
  userId: string,
  kind: "market_visit" | "portfolio" | "trade" | "battle",
  groupId?: string
): Promise<void> {
  const p = await prisma.starterOnboardingProgress.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  if (p.completedAt) return;

  const data: Record<string, unknown> = {};
  if (kind === "market_visit") {
    const g = groupId ? GROUP_MAP[groupId] : undefined;
    // hidden/멤버/legacy 마켓은 인정하지 않음
    if (!g || !isStarterEligible(g.id)) return;
    const seen = p.visitedMarkets.split(",").filter(Boolean);
    if (seen.includes(g.id)) return; // 같은 마켓 반복 방문 무시
    seen.push(g.id);
    data.visitedMarkets = seen.join(",");
  } else if (kind === "portfolio") {
    if (p.portfolioViewed) return;
    data.portfolioViewed = true;
  } else if (kind === "trade") {
    if (p.firstTradeCompleted) return;
    data.firstTradeCompleted = true;
  } else {
    if (p.battleViewed) return;
    data.battleViewed = true;
  }

  const updated = await prisma.starterOnboardingProgress.update({
    where: { userId },
    data,
  });
  if (isStarterOnboardingComplete(updated) && !updated.completedAt) {
    await prisma.starterOnboardingProgress.update({
      where: { userId },
      data: { completedAt: new Date() },
    });
  }
}

// ─── 클라이언트용 현황 (JSON-safe) ───
export async function getStarterView(userId: string) {
  const [portfolio, progress] = await Promise.all([
    prisma.starterPortfolio.findUnique({
      where: { userId },
      include: { allocations: true },
    }),
    prisma.starterOnboardingProgress.findUnique({ where: { userId } }),
  ]);
  const visits = (progress?.visitedMarkets ?? "").split(",").filter(Boolean);
  return {
    status: portfolio?.status ?? "NOT_STARTED",
    allocations: (portfolio?.allocations ?? []).map((a: any) => ({
      marketId: a.marketId,
      role: a.role,
      referencePrice: num(a.referencePrice),
      stage1FanValue: num(a.stage1FanValue),
      stage1ShareQuantity: num(a.stage1ShareQuantity),
      stage2FanValue: num(a.stage2FanValue),
      stage2ShareQuantity: num(a.stage2ShareQuantity),
      stage1Claimed: a.stage1Claimed,
      stage2Claimed: a.stage2Claimed,
    })),
    onboarding: {
      marketVisits: Math.min(visits.length, STARTER_VISIT_TARGET),
      marketVisitTarget: STARTER_VISIT_TARGET,
      portfolioViewed: progress?.portfolioViewed ?? false,
      firstTradeCompleted: progress?.firstTradeCompleted ?? false,
      battleViewed: progress?.battleViewed ?? false,
      complete: isStarterOnboardingComplete(progress),
    },
  };
}
