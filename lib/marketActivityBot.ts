// ─────────────────────────────────────────────────────────────
// marketActivityBot — 시스템 가상 거래 생성기 (서버 전용)
//
// 유저가 적을 때도 마켓이 살아있게, 30분마다 소액의 가상 거래를
// 만들어 가격·거래량·차트·배틀 점수에 반영합니다.
// 시스템 거래는 isSystem: true 로 명확히 표시되며,
// 어떤 유저의 잔액/보유량/뱃지/영향력에도 영향을 주지 않습니다.
//
// 실행 방식: 별도 크론이 없어 /api/state 요청 시 경과 시간을 확인해
// 밀린 라운드를 생성합니다 (최대 3회 캐치업, DB 기준이라 중복 최소화).
// TODO: Move marketActivityBot to backend cron job when Supabase/server is added.
// ─────────────────────────────────────────────────────────────
import { quoteBuy, quoteSell } from "./amm";
import { prisma } from "./db";
import { GROUPS } from "./mockData";

const INTERVAL_MS = 30 * 60_000; // 30분
const MAX_CATCHUP = 3; // 밀린 라운드 최대 생성 수
const MAX_IMPACT_PCT = 0.5; // 시스템 거래 1건당 가격 영향 상한 (%)
const MIN_FAN = 50;
const MAX_FAN = 1500;
const BUY_PROBABILITY = 0.6;

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

async function runOneRound(roundAtMs: number): Promise<void> {
  // 특정 그룹만 조작하지 않도록 전체 종목에서 무작위 2~5개 선택
  const count = 2 + Math.floor(Math.random() * 4);
  const ids = GROUPS.map((g) => g.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  for (const groupId of ids) {
    const m = await prisma.market.findUnique({ where: { groupId } });
    if (!m) continue;
    const price = m.fanReserve / m.shareReserve;
    // 라운드 시각에서 0~8분 이전으로 분산 (미래 시각 방지)
    const at = new Date(
      Math.min(Date.now(), roundAtMs) - Math.floor(Math.random() * 8 * 60_000)
    );
    const isBuy = Math.random() < BUY_PROBABILITY;

    try {
      if (isBuy) {
        // 매수: Fan$ 50~1,500, 가격 영향 0.5% 이하로 제한
        let amount = MIN_FAN + Math.random() * (MAX_FAN - MIN_FAN);
        amount = Math.min(amount, m.fanReserve * (MAX_IMPACT_PCT / 100));
        let q = quoteBuy(m, amount);
        while (q && q.priceImpact > MAX_IMPACT_PCT && amount > 20) {
          amount /= 2; // 영향이 크면 금액 축소
          q = quoteBuy(m, amount);
        }
        if (!q || q.priceImpact > MAX_IMPACT_PCT) continue;

        await prisma.$transaction([
          prisma.market.update({
            where: { groupId },
            data: {
              fanReserve: q.newFanReserve,
              shareReserve: q.newShareReserve,
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
        // 매도: Fan$ 50~1,500 상당의 Fan Shares, 가격 영향 0.5% 이하
        let shares = (MIN_FAN + Math.random() * (MAX_FAN - MIN_FAN)) / price;
        shares = Math.min(shares, m.shareReserve * (MAX_IMPACT_PCT / 100));
        let q = quoteSell(m, shares);
        while (q && q.priceImpact > MAX_IMPACT_PCT && shares * price > 20) {
          shares /= 2;
          q = quoteSell(m, shares);
        }
        if (!q || q.priceImpact > MAX_IMPACT_PCT) continue;

        await prisma.$transaction([
          prisma.market.update({
            where: { groupId },
            data: {
              fanReserve: q.newFanReserve,
              shareReserve: q.newShareReserve,
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
