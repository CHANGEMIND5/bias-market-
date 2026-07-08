import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_POST_LENGTH = 500;

/** GET /api/posts — 공지 우선 + 최신순 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id ?? null;

  const posts = await prisma.post.findMany({
    orderBy: [{ isNotice: "desc" }, { createdAt: "desc" }],
    take: 30,
    include: {
      user: { select: { name: true, image: true, email: true } },
      _count: { select: { likes: true, comments: true } },
      likes: uid
        ? { where: { userId: uid }, select: { userId: true } }
        : { where: { userId: "-" }, select: { userId: true } },
    },
  });

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      body: p.body,
      isNotice: p.isNotice,
      time: p.createdAt.toISOString(),
      author: {
        name: p.user?.name ?? "익명 팬",
        image: p.user?.image ?? null,
        isAdmin: isAdminEmail(p.user?.email),
      },
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      likedByMe: p.likes.length > 0,
      mine: uid !== null && p.userId === uid,
    })),
  });
}

/** POST /api/posts — 글 작성 (공지는 운영자만) */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Google 로그인 후 글을 쓸 수 있어요." },
      { status: 401 }
    );
  }

  const data = await req.json().catch(() => null);
  const body = typeof data?.body === "string" ? data.body.trim() : "";
  const wantsNotice = data?.isNotice === true;
  const admin = isAdminEmail(session?.user?.email);

  if (body.length === 0) {
    return NextResponse.json({ ok: false, error: "내용을 입력해 주세요." }, { status: 400 });
  }
  if (body.length > MAX_POST_LENGTH) {
    return NextResponse.json(
      { ok: false, error: `글은 최대 ${MAX_POST_LENGTH}자까지 쓸 수 있어요.` },
      { status: 400 }
    );
  }
  if (wantsNotice && !admin) {
    return NextResponse.json(
      { ok: false, error: "공지는 운영자만 올릴 수 있어요." },
      { status: 403 }
    );
  }

  const post = await prisma.post.create({
    data: { userId, body, isNotice: wantsNotice && admin },
    include: { user: { select: { name: true, image: true, email: true } } },
  });

  return NextResponse.json({
    ok: true,
    post: {
      id: post.id,
      body: post.body,
      isNotice: post.isNotice,
      time: post.createdAt.toISOString(),
      author: {
        name: post.user?.name ?? "익명 팬",
        image: post.user?.image ?? null,
        isAdmin: admin,
      },
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      mine: true,
    },
  });
}
