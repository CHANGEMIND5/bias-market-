import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MIN_NAME = 2;
const MAX_NAME = 20;

/** PATCH /api/profile — 닉네임 변경 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }

  const data = await req.json().catch(() => null);
  const name = typeof data?.name === "string" ? data.name.trim() : "";
  if (name.length < MIN_NAME || name.length > MAX_NAME) {
    return NextResponse.json(
      { ok: false, error: `닉네임은 ${MIN_NAME}~${MAX_NAME}자로 입력해 주세요.` },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name },
  });

  return NextResponse.json({ ok: true, name: updated.name });
}
