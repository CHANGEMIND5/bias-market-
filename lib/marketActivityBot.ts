// ─────────────────────────────────────────────────────────────
// marketActivityBot — 시스템 가상 거래 생성기 (서버 전용, 이코노미 v2)
//
// 유저가 적을 때도 마켓이 살아있게, 30분마다 소액의 가상 거래를
// 만들어 가격·거래량·차트·배틀 점수에 반영합니다.
//
// v2 준비금 회계:
//   SYSTEM 매도: systemReserveShares → 풀. 받은 Fan$는 systemTreasuryFan에 적립.
//   SYSTEM 매수: systemTreasuryFan으로 지불. 취득한 shares는 준비금으로 복귀.
//   → 무한 발행/무한 Fan$ 없음. 총량 1,000,000 보존.
//
// 안전 규칙:
//   - economyVersion 2 마켓만 거래 (프리베타 초기화 전에는 대기)
//   - 거래 1건당 가격 영향 ≤ 0.5%
//   - 마켓당 일일 매수/매도 건수 제한
//   - hidden/멤버/제외/legacy 마켓 절대 제외 (VISIBLE_GROUPS만)
//   - isSystem: true 로 명확히 표시, 유저 미션/영향력에 절대 미반영
// ─────────────────────────────────────────────────────────────
import { Prisma } from "@prisma/client";
import { quoteBuy, quoteSell } from "./amm";
import { prisma } from "./db";
import {
  assertSupplyInvariant,
  ECONOMY_VERSION,
  num,
  poolStateOf,
  r8,
} from "./economy";
import { MARKET_TIER_CONFIG } from "./marketTiers";
import { VISIBLE_GROUPS } from "./mockData";

const MAX_IMPACT_PCT = 0.5; // 시스템 거래 1건당 가격 영향 상한 (%)
const MIN_FAN = 50;
const MAX_FAN = 1500;
const BUY_PROBABILITY = 0.5; // 방향 편향 없음 (지속적 단방향 조작 방지)

/**
 * 봇 활동 강도 — 환경변수 BOT_ACTIVE_MODE=true 면 베타용 "활발" 모드.
 * 재배포 없이 Vercel 환경변수만 켜고 끄면 즉시 전환됩니다.
 *   기본:   30분 주기, 라운드당 2~5개, 일일 방향별 30건
 *   활발:   10분 주기, 라운드당 6~8개, 일일 방향별 80건
 * 가격 영향 상한(0.5%)은 두 모드 모두 동일 — 급변 방지.
 */
function botConfig() {
  const active = process.env.BOT_ACTIVE_MODE === "true";
  return active
    ? { intervalMs: 10 * 60_000, maxCatchup: 6, minMarkets: 6, maxMarkets: 8, dailyPerSide: 80 }
    : { intervalMs: 30 * 60_000, maxCatchup: 3, minMarkets: 2, maxMarkets: 5, dailyPerSide: 30 };
}

export async function runMarketActivityBot(): Promise<void> {
  const cfg = botConfig();
  const last = await prisma.trade.findFirst({
    where: { isSystem: true },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const now = Date.now();
  let rounds: number;
  if (!last) {
    rounds = 1; // 첫 실행
  } else {
    rounds = Math.floor((now - last.createdAt.getTime()) / cfg.intervalMs);
    if (rounds <= 0) return;
    rounds = Math.min(rounds, cfg.maxCatchup);
  }

  for (let i = 0; i < rounds; i++) {
    // 밀린 라운드는 과거 시각으로 기록해 차트가 자연스럽게 채워지게 함
    const roundAt = now - (rounds - 1 - i) * cfg.intervalMs;
    await runOneRound(roundAt, cfg);
  }
}

/** KST 자정 (일일 한도 기준) */
function kstDayStart(): Date {
  const kst = new Date(Date.now() + 9 * 3600_000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 3600_000);
}

async function runOneRound(
  roundAtMs: number,
  cfg: ReturnType<typeof botConfig>
): Promise<void> {
  // 메인 노출 그룹(mega/large/mid/rookie)에서만 무작위 선택.
  // 티어별 botActivityWeight 가중치 적용 (멤버·hidden·legacy 절대 제외)
  const weighted: string[] = [];
  for (const g of VISIBLE_GROUPS) {
    const w = MARKET_TIER_CONFIG[g.tier ?? "mid"].botActivityWeight;
    const copies = Math.max(0, Math.round(w * 5));
    for (let i = 0; i < copies; i++) weighted.push(g.id);
  }
  const span = cfg.maxMarkets - cfg.minMarkets + 1;
  const count = cfg.minMarkets + Math.floor(Math.random() * span);
  const ids: string[] = [];
  const shuffled = weighted.sort(() => Math.random() - 0.5);
  for (const id of shuffled) {
    if (!ids.includes(id)) ids.push(id);
    if (ids.length >= count) break;
  }

  const dayStart = kstDayStart();

  for (const groupId of ids) {
    const m = await prisma.market.findUnique({ where: { groupId } });
    if (!m) continue;
    // 프리베타 초기화(v2) 전에는 봇이 절대 거래하지 않음
    if ((m.economyVersion ?? 1) < ECONOMY_VERSION) continue;

    const pool = poolStateOf(m);
    const reserve = num(m.systemReserveShares);
    const treasury = num(m.systemTreasuryFan);
    const price = pool.fanReserve / pool.shareReserve;
    // 라운드 시각에서 0~8분 이전으로 분산 (미래 시각 방지)
    const at = new Date(
      Math.min(Date.now(), roundAtMs) - Math.floor(Math.random() * 8 * 60_000)
    );

    // 방향 결정: 준비금 없으면 매도 불가, 금고 없으면 매수 불가
    const wantsBuy = Math.random() < BUY_PROBABILITY;
    const canSell = reserve > 1;
    const canBuy = treasury > MIN_FAN;
    let isBuy: boolean;
    if (wantsBuy && canBuy) isBuy = true;
    else if (!wantsBuy && canSell) isBuy = false;
    else if (canSell) isBuy = false;
    else if (canBuy) isBuy = true;
    else continue; // 준비금·금고 모두 소진 — 이 마켓은 이번 라운드 스킵

    try {
      // 일일 한도 확인
      const sideStr = isBuy ? "buy" : "sell";
      const todayCount = await prisma.trade.count({
        where: {
          groupId, isSystem: true, side: sideStr,
          createdAt: { gte: dayStart },
        },
      });
      if (todayCount >= cfg.dailyPerSide) continue;

      if (isBuy) {
        // 매수: 금고 Fan$ 한도 내, 가격 영향 0.5% 이하
        let amount = MIN_FAN + Math.random() * (MAX_FAN - MIN_FAN);
        amount = Math.min(amount, treasury);
        amount = Math.min(amount, pool.fanReserve * (MAX_IMPACT_PCT / 100));
        let q = quoteBuy(pool, amount);
        while (q && q.priceImpact > MAX_IMPACT_PCT && amount > 20) {
          amount /= 2; // 영향이 크면 금액 축소
          q = quoteBuy(pool, amount);
        }
        if (!q || q.priceImpact > MAX_IMPACT_PCT || amount < 1) continue;
        const qb = q;

        // Serializable + 조건부/원자적 갱신 — 유저 거래·스타터 지급과
        // 동시에 실행돼도 준비금/금고를 덮어쓰지 않음 (충돌 시 이번 라운드 스킵)
        await prisma.$transaction(
          async (tx) => {
            const res = await tx.market.updateMany({
              where: { groupId, systemTreasuryFan: { gte: amount } },
              data: {
                fanReserve: r8(qb.newFanReserve),
                shareReserve: r8(qb.newShareReserve),
                systemReserveShares: { increment: r8(qb.sharesOut) }, // 풀 → 준비금 복귀
                systemTreasuryFan: { decrement: amount }, // 금고에서 지불
                systemBotNetShares: { decrement: r8(qb.sharesOut) },
                volume24h: { increment: amount },
              },
            });
            if (res.count === 0) throw new Error("treasury changed — skip");
            await tx.trade.create({
              data: {
                groupId, side: "buy",
                price: qb.execPrice, shares: qb.sharesOut, fan: amount, fee: qb.fee,
                isSystem: true, createdAt: at,
              },
            });
            await tx.pricePoint.create({
              data: {
                groupId,
                price: qb.newFanReserve / qb.newShareReserve,
                createdAt: at,
              },
            });
            await assertSupplyInvariant(tx, groupId);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
      } else {
        // 매도: 준비금 한도 내에서만 (발행 없음), 가격 영향 0.5% 이하
        let shares = (MIN_FAN + Math.random() * (MAX_FAN - MIN_FAN)) / price;
        shares = Math.min(shares, reserve);
        shares = Math.min(shares, pool.shareReserve * (MAX_IMPACT_PCT / 100));
        let q = quoteSell(pool, shares);
        while (q && q.priceImpact > MAX_IMPACT_PCT && shares * price > 20) {
          shares /= 2;
          q = quoteSell(pool, shares);
        }
        if (!q || q.priceImpact > MAX_IMPACT_PCT || shares <= 0) continue;
        const qs = q;
        const sellShares = r8(shares);

        await prisma.$transaction(
          async (tx) => {
            const res = await tx.market.updateMany({
              where: { groupId, systemReserveShares: { gte: sellShares } },
              data: {
                fanReserve: r8(qs.newFanReserve),
                shareReserve: r8(qs.newShareReserve),
                systemReserveShares: { decrement: sellShares }, // 준비금 → 풀
                systemTreasuryFan: { increment: r8(qs.fanOut) }, // 받은 Fan$ 금고 적립
                systemBotNetShares: { increment: sellShares },
                volume24h: { increment: qs.fanOutBeforeFee },
              },
            });
            if (res.count === 0) throw new Error("reserve changed — skip");
            await tx.trade.create({
              data: {
                groupId, side: "sell",
                price: qs.execPrice, shares: sellShares, fan: qs.fanOut, fee: qs.fee,
                isSystem: true, createdAt: at,
              },
            });
            await tx.pricePoint.create({
              data: {
                groupId,
                price: qs.newFanReserve / qs.newShareReserve,
                createdAt: at,
              },
            });
            await assertSupplyInvariant(tx, groupId);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
      }
    } catch {
      // 한 종목 실패해도 나머지는 계속
    }
  }
}
