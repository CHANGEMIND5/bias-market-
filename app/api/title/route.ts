import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setUserTitle } from "@/lib/season";

export const dynamic = "force-dynamic";

/**
 * POST /api/title — 글에 표시할 칭호 설정.
 * body: { code: string | null }  (null이면 칭호 해제)
 * 보유한 시즌 배지만 칭호로 설정 가능 (서버 검증).
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "로그인이 필요해요." }, { status: 401 });
  }
  const data = await req.json().catch(() => null);
  const code = data?.code === null ? null : typeof data?.code === "string" ? data.code : undefined;
  if (code === undefined) {
    return NextResponse.json({ ok: false, error: "잘못된 요청이에요." }, { status: 400 });
  }
  const ok = await setUserTitle(userId, code);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "보유하지 않은 칭호예요." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, code });
}
