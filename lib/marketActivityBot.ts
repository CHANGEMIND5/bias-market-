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
import { quoteBuy, quoteSell } from "./amm";
import { prisma } from "./db";
import { ECONOMY_VERSION, num, poolStateOf, r8 } from "./economy";
import { MARKET_TIER_CONFIG } from "./marketTiers";
import { VISIBLE_GROUPS } from "./mockData";

const INTERVAL_MS = 30 * 60_000; // 30분
const MAX_CATCHUP = 3; // 밀린 라운드 최대 생성 수
const MAX_IMPACT_PCT = 0.5; // 시스템 거래 1건당 가격 영향 상한 (%)
const MIN_FAN = 50;
const MAX_FAN = 1500;
const BUY_PROBABILITY = 0.5; // 방향 편향 없음 (지속적 단방향 조작 방지)
const MAX_DAILY_TRADES_PER_SIDE = 30; // 마켓당 일일 매수/매도 건수 상한

export async function runMarketActivityBot(): Promise<void> {
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
    rounds = Math.floor((now - last.createdAt.getTime()) / INTERVAL_MS);
    if (rounds <= 0) return;
    rounds = Math.min(rounds, MAX_CATCHUP);
  }

  for (let i = 0; i < rounds; i++) {
    // 밀린 라운드는 과거 시각으로 기록해 차트가 자연스럽게 채워지게 함
    const roundAt = now - (rounds - 1 - i) * INTERVAL_MS;
    await runOneRound(roundAt);
  }
}

/** KST 자정 (일일 한도 기준) */
function kstDayStart(): Date {
  const kst = new Date(Date.now() + 9 * 3600_000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 3600_000);
}

async function runOneRound(roundAtMs: number): Promise<void> {
  // 메인 노출 그룹(mega/large/mid/rookie)에서만 무작위 2~5개 선택.
  // 티어별 botActivityWeight 가중치 적용 (멤버·hidden·legacy 절대 제외)
  const weighted: string[] = [];
  for (const g of VISIBLE_GROUPS) {
    const w = MARKET_TIER_CONFIG[g.tier ?? "mid"].botActivityWeight;
    const copies = Math.max(0, Math.round(w * 5));
    for (let i = 0; i < copies; i++) weighted.push(g.id);
  }
  const count = 2 + Math.floor(Math.random() * 4);
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
      if (todayCount >= MAX_DAILY_TRADES_PER_SIDE) continue;

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

        await prisma.$transaction([
          prisma.market.update({
            where: { groupId },
            data: {
              fanReserve: r8(q.newFanReserve),
              shareReserve: r8(q.newShareReserve),
              systemReserveShares: r8(reserve + q.sharesOut), // 풀 → 준비금 복귀
              systemTreasuryFan: r8(treasury - amount), // 금고에서 지불
              systemBotNetShares: { decrement: r8(q.sharesOut) },
              volume24h: { increment: amount },
            },
          }),
          prisma.trade.create({
            data: {
              groupId, side: "buy",
              price: q.execPrice, shares: q.sharesOut, fan: amount, fee: q.fee,
              isSystem: true, createdAt: at,
            },
          }),
          prisma.pricePoint.create({
            data: {
              groupId,
              price: q.newFanReserve / q.newShareReserve,
              createdAt: at,
            },
          }),
        ]);
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

        await prisma.$transaction([
          prisma.market.update({
            where: { groupId },
            data: {
              fanReserve: r8(q.newFanReserve),
              shareReserve: r8(q.newShareReserve),
              systemReserveShares: r8(reserve - shares), // 준비금 → 풀
              systemTreasuryFan: r8(treasury + q.fanOut), // 받은 Fan$ 금고 적립
              systemBotNetShares: { increment: r8(shares) },
              volume24h: { increment: q.fanOutBeforeFee },
            },
          }),
          prisma.trade.create({
            data: {
              groupId, side: "sell",
              price: q.execPrice, shares, fan: q.fanOut, fee: q.fee,
              isSystem: true, createdAt: at,
            },
          }),
          prisma.pricePoint.create({
            data: {
              groupId,
              price: q.newFanReserve / q.newShareReserve,
              createdAt: at,
            },
          }),
        ]);
      }
    } catch {
      // 한 종목 실패해도 나머지는 계속
    }
  }
}
