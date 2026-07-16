// ─────────────────────────────────────────────────────────────
// 이코노미 v2 — 공급 원장 유틸 (서버 전용)
//
// 모든 마켓의 총 Fan Shares는 1,000,000으로 고정:
//   풀(shareReserve) + 시스템 준비금(systemReserveShares) + 전체 유저 보유 = 1,000,000
// 발행/소각 없음. DB는 Decimal(30,8)이 최종 진실이며,
// JS에서 계산할 때는 Number로 읽고 저장 전 r8()로 8자리 반올림합니다.
// ─────────────────────────────────────────────────────────────
import { prisma } from "./db";

export const ECONOMY_VERSION = 2;
export const TOTAL_FAN_SHARES = 1_000_000;
export const INITIAL_POOL_SHARES = 600_000;
export const INITIAL_RESERVE_SHARES = 400_000;
export const MIN_SHARE_UNIT = 0.001;
/** 공급 불변식 허용 오차 (부동소수점 연산 라운딩 대비) */
export const INVARIANT_EPS = 0.01;

/** Prisma Decimal | number | string → number */
export function num(v: unknown): number {
  return Number(v ?? 0);
}

/** 8자리 반올림 — Decimal(30,8) 저장 전 정규화 */
export function r8(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

/** 시장 행 → AMM 계산용 숫자 상태 */
export function poolStateOf(m: {
  fanReserve: unknown;
  shareReserve: unknown;
}): { fanReserve: number; shareReserve: number } {
  return { fanReserve: num(m.fanReserve), shareReserve: num(m.shareReserve) };
}

/** 시장 행 → 클라이언트 직렬화 (Decimal → number) */
export function serializeMarket(m: any): any {
  return {
    groupId: m.groupId,
    fanReserve: num(m.fanReserve),
    shareReserve: num(m.shareReserve),
    totalFanShares: num(m.totalFanShares),
    systemReserveShares: num(m.systemReserveShares),
    starterSharesDistributed: num(m.starterSharesDistributed),
    economyVersion: m.economyVersion ?? 1,
    baseline1h: m.baseline1h,
    baseline24h: m.baseline24h,
    baseline7d: m.baseline7d,
    volume24h: m.volume24h,
    holders: m.holders,
  };
}

/**
 * 공급 불변식 검증 — 트랜잭션 내부에서 마지막에 호출.
 * 실패 시 throw → 전체 트랜잭션 롤백. 절대 조용히 보정하지 않음.
 * economyVersion 2 마켓에만 적용 (구 이코노미는 리셋 전까지 통과).
 */
export async function assertSupplyInvariant(
  tx: any,
  groupId: string
): Promise<void> {
  const m = await tx.market.findUnique({ where: { groupId } });
  if (!m || (m.economyVersion ?? 1) < ECONOMY_VERSION) return;
  const agg = await tx.holding.aggregate({
    where: { groupId },
    _sum: { shares: true },
  });
  const held = num(agg._sum?.shares);
  const total =
    num(m.shareReserve) + num(m.systemReserveShares) + held;
  if (Math.abs(total - num(m.totalFanShares)) > INVARIANT_EPS) {
    // 관리자 확인용 크리티컬 로그 — 트랜잭션은 롤백됨
    console.error(
      `[CRITICAL][supply-invariant] market=${groupId} pool=${num(m.shareReserve)} reserve=${num(m.systemReserveShares)} held=${held} total=${total} expected=${num(m.totalFanShares)}`
    );
    throw new Error(`supply invariant violated: ${groupId}`);
  }
}

/**
 * 서버 기준 가격 — 최근 15분 TWAP(가격 포인트 3개 이상)이 있으면 사용,
 * 없으면 현재 서버 스팟 가격. 클라이언트 가격은 절대 신뢰하지 않음.
 */
export async function referencePrice(m: {
  groupId: string;
  fanReserve: unknown;
  shareReserve: unknown;
}): Promise<number> {
  const spot = num(m.fanReserve) / num(m.shareReserve);
  try {
    const since = new Date(Date.now() - 15 * 60_000);
    const points = await prisma.pricePoint.findMany({
      where: { groupId: m.groupId, createdAt: { gte: since } },
      select: { price: true },
    });
    if (points.length >= 3) {
      const avg =
        points.reduce((s: number, p: { price: number }) => s + p.price, 0) /
        points.length;
      if (isFinite(avg) && avg > 0) return avg;
    }
  } catch {
    // TWAP 실패 시 스팟 폴백
  }
  return spot;
}
