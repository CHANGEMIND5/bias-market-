import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureMarkets } from "@/lib/markets";
import { countSupporters, loungeEligible, resolveLoungeStatus } from "@/lib/lounge";
import { VISIBLE_GROUPS } from "@/lib/mockData";

export const dynamic = "force-dynamic";

/** GET /api/admin/lounges — 라운지 가능 그룹 목록 + 상태 + 서포터 수 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  await ensureMarkets();

  const groups = VISIBLE_GROUPS.filter((g) => loungeEligible(g));
  const markets = await prisma.market.findMany({
    where: { groupId: { in: groups.map((g) => g.id) } },
    select: { groupId: true, loungeStatus: true, loungeActivationReason: true },
  });
  const mMap = new Map(markets.map((m) => [m.groupId, m]));

  // 서포터 수는 병렬로 (그룹 수가 많으면 비용↑ — 상위 노출 그룹만이라 감당 가능)
  const rows = await Promise.all(
    groups.map(async (g) => {
      const supporters = await countSupporters(g.id);
      const m = mMap.get(g.id);
      return {
        groupId: g.id,
        name: g.name,
        tier: g.tier,
        stored: m?.loungeStatus ?? "AUTO",
        effective: resolveLoungeStatus(m?.loungeStatus, g, supporters),
        reason: m?.loungeActivationReason ?? null,
        supporters,
      };
    })
  );
  rows.sort((a, b) => {
    const order = { mega: 0, large: 1, mid: 2, rookie: 3 } as any;
    return (order[a.tier ?? "mid"] ?? 9) - (order[b.tier ?? "mid"] ?? 9);
  });

  return NextResponse.json({ ok: true, rows });
}

/**
 * POST /api/admin/lounges — 라운지 상태 오버라이드.
 * body: { groupId, status: AUTO|ACTIVE|LOCKED|DISABLED }
 * ACTIVE로 강제 시 최초 1회 활성화 시각/사유(ADMIN) 기록.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const data = await req.json().catch(() => null);
  const groupId = typeof data?.groupId === "string" ? data.groupId : "";
  const status = data?.status;
  if (!["AUTO", "ACTIVE", "LOCKED", "DISABLED"].includes(status)) {
    return NextResponse.json({ ok: false, error: "잘못된 상태예요." }, { status: 400 });
  }
  if (!loungeEligible({ id: groupId } as any) && !VISIBLE_GROUPS.some((g) => g.id === groupId)) {
    return NextResponse.json({ ok: false, error: "라운지 대상 그룹이 아니에요." }, { status: 400 });
  }

  const existing = await prisma.market.findUnique({
    where: { groupId }, select: { loungeActivatedAt: true },
  });
  await prisma.market.update({
    where: { groupId },
    data: {
      loungeStatus: status,
      ...(status === "ACTIVE" && !existing?.loungeActivatedAt
        ? { loungeActivatedAt: new Date(), loungeActivationReason: "ADMIN" }
        : {}),
    },
  });
  return NextResponse.json({ ok: true, groupId, status });
}
