import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AVATAR_PRESETS } from "@/lib/avatars";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MIN_NAME = 2;
const MAX_NAME = 20;

/**
 * PATCH /api/profile — 프로필 수정
 * body: { name?: string, avatar?: number }
 *   avatar: 0 ~ (프리셋 수-1) → 프리셋 아바타로 변경
 *   avatar: -1 → 구글 프로필 사진으로 되돌리기
 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }

  const data = await req.json().catch(() => null);
  const update: { name?: string; image?: string | null } = {};

  if (data?.name !== undefined) {
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (name.length < MIN_NAME || name.length > MAX_NAME) {
      return NextResponse.json(
        { ok: false, error: `닉네임은 ${MIN_NAME}~${MAX_NAME}자로 입력해 주세요.` },
        { status: 400 }
      );
    }
    update.name = name;
  }

  if (data?.avatar !== undefined) {
    const avatar = Number(data.avatar);
    if (avatar === -1) {
      // 구글 프로필 사진으로 복원
      update.image = session?.user?.image ?? null;
    } else if (
      Number.isInteger(avatar) &&
      avatar >= 0 &&
      avatar < AVATAR_PRESETS.length
    ) {
      update.image = `preset:${avatar}`;
    } else {
      return NextResponse.json(
        { ok: false, error: "존재하지 않는 아바타입니다." },
        { status: 400 }
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "변경할 내용이 없어요." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: update,
  });

  return NextResponse.json({ ok: true, name: updated.name, image: updated.image });
}
