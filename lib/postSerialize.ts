// 게시글 직렬화 공용 헬퍼 — 라운지/전체 커뮤니티 응답을 동일 형태로.
import { isAdminEmail } from "./admin";
import { buildLabelResolver, UserLabel } from "./lounge";

export interface SerializedPost {
  id: string;
  body: string;
  title: string | null;
  scope: string;
  marketId: string | null;
  postType: string;
  isNotice: boolean;
  isPinned: boolean;
  isLocked: boolean;
  moderationStatus: string;
  time: string;
  author: { name: string; image: string | null; isAdmin: boolean; labels: UserLabel[]; title: string | null };
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  mine: boolean;
  reportCount?: number;
  poll?: {
    closesAt: string;
    closedAt: string | null;
    closed: boolean;
    totalVotes: number;
    myOptionId: string | null;
    options: { id: string; text: string; votes: number }[];
  };
}

export async function serializePosts(
  posts: any[],
  uid: string | null,
  viewerIsAdmin: boolean,
  groupId: string | null
): Promise<SerializedPost[]> {
  const labelOf = await buildLabelResolver(
    posts.map((p) => p.userId),
    groupId
  );
  return posts.map((p) => {
    let poll: SerializedPost["poll"] | undefined;
    if (p.poll) {
      const votes: any[] = p.poll.votes ?? [];
      const counts = new Map<string, number>();
      let myOptionId: string | null = null;
      for (const v of votes) {
        counts.set(v.optionId, (counts.get(v.optionId) ?? 0) + 1);
        if (uid && v.userId === uid) myOptionId = v.optionId;
      }
      const closed =
        !!p.poll.closedAt || new Date(p.poll.closesAt).getTime() <= Date.now();
      poll = {
        closesAt: p.poll.closesAt.toISOString(),
        closedAt: p.poll.closedAt ? p.poll.closedAt.toISOString() : null,
        closed,
        totalVotes: votes.length,
        myOptionId,
        options: (p.poll.options ?? [])
          .slice()
          .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
          .map((o: any) => ({ id: o.id, text: o.text, votes: counts.get(o.id) ?? 0 })),
      };
    }
    return {
      id: p.id,
      body: p.body,
      title: p.title ?? null,
      scope: p.scope,
      marketId: p.marketId ?? null,
      postType: p.postType,
      isNotice: p.isNotice,
      isPinned: p.isPinned,
      isLocked: p.isLocked,
      moderationStatus: p.moderationStatus,
      time: p.createdAt.toISOString(),
      author: {
        name: p.user?.name ?? "익명 팬",
        image: p.user?.image ?? null,
        isAdmin: isAdminEmail(p.user?.email),
        labels: labelOf(p.userId),
        title: p.user?.selectedTitle ?? null,
      },
      likeCount: p._count?.likes ?? 0,
      commentCount: p._count?.comments ?? 0,
      likedByMe: (p.likes?.length ?? 0) > 0,
      mine: uid !== null && p.userId === uid,
      reportCount: viewerIsAdmin ? p._count?.reports : undefined,
      poll,
    };
  });
}
