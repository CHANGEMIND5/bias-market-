import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runMarketActivityBot } from "@/lib/marketActivityBot";
import { ensureMarkets } from "@/lib/markets";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/bot — 시스템 봇 정기 실행 (Vercel Cron 전용).
 *
 * 방문자가 없어도 마켓이 살아있도록 vercel.json의 cron이 주기적으로 호출.
 * Vercel Cron은 요청에 `Authorization: Bearer $CRON_SECRET` 헤더를 붙임
 * (Vercel이 CRON_SECRET 환경변수를 자동 주입). 없으면 인증 생략 불가 →
 * 외부에서 임의로 봇을 돌리지 못하게 CRON_SECRET이 설정된 경우 검증.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    await ensureMarkets();
    await runMarketActivityBot();
  } catch (e) {
    console.error("[cron/bot] failed:", e);
    return NextResponse.json({ ok: false, error: "bot run failed" }, { status: 500 });
  }

  // 마지막 시스템 거래 시각을 리포트 (모니터링용)
  const last = await prisma.trade.findFirst({
    where: { isSystem: true },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    lastSystemTrade: last?.createdAt.toISOString() ?? null,
  });
}
