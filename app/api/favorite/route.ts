import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GROUP_MAP } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Google 로그인 후 사용할 수 있어요." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const groupId: string = body?.groupId;
  if (!groupId || !GROUP_MAP[groupId]) {
    return NextResponse.json(
      { ok: false, error: "존재하지 않는 그룹입니다." },
      { status: 400 }
    );
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (existing) {
    await prisma.favorite.delete({
      where: { userId_groupId: { userId, groupId } },
    });
  } else {
    await prisma.favorite.create({ data: { userId, groupId } });
  }

  const favorites = await prisma.favorite.findMany({ where: { userId } });
  return NextResponse.json({
    ok: true,
    favorites: favorites.map((f) => f.groupId),
  });
}
