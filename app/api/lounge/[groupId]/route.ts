import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureMarkets } from "@/lib/markets";
import {
  countSupporters,
  loungeEligible,
  maybeActivateLounge,
  resolveLoungeStatus,
  SUPPORTER_TARGET,
} from "@/lib/lounge";
import { GROUP_MAP } from "@/lib/mockData";

export const dynamic = "force-dynamic";

/** GET /api/lounge/[groupId] — 라운지 헤더/상태/서포터 진행도 */
export async function GET(
  _req: Request,
  { params }: { params: { groupId: string } }
) {
  const g = GROUP_MAP[params.groupId];
  if (!loungeEligible(g)) {
    return NextResponse.json({ ok: false, status: "DISABLED" }, { status: 404 });
  }
  await ensureMarkets();

  const supporters = await countSupporters(params.groupId);
  // mid/rookie가 임계값을 넘겼으면 영구 활성화 + 환영글 (멱등)
  await maybeActivateLounge(params.groupId, supporters);

  const market = await prisma.market.findUnique({
    where: { groupId: params.groupId },
    select: { loungeStatus: true, loungeActivatedAt: true },
  });
  const status = resolveLoungeStatus(market?.loungeStatus, g, supporters);

  return NextResponse.json({
    ok: true,
    groupId: g.id,
    name: g.name,
    koreanName: g.koreanName ?? null,
    fandom: g.fandom && g.fandom !== "-" ? g.fandom : null,
    tier: g.tier,
    status,
    supporters,
    supporterTarget: SUPPORTER_TARGET,
    activatedAt: market?.loungeActivatedAt?.toISOString() ?? null,
  });
}
