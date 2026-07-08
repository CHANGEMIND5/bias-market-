"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import UserAvatar from "./UserAvatar";
import { useStore } from "@/lib/store";

interface Author {
  name: string;
  image: string | null;
  isAdmin?: boolean;
}

interface PostItem {
  id: string;
  body: string;
  isNotice: boolean;
  time: string;
  author: Author;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  mine: boolean;
}

interface CommentItem {
  id: string;
  body: string;
  time: string;
  author: Author;
}

const POLL_MS = 30_000;
const MAX_POST_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "방금 전";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

function Avatar({ author }: { author: Author }) {
  return <UserAvatar image={author.image} size={32} />;
}

export default function CommunityView() {
  const { loggedIn, isAdmin, showToast } = useStore();
  const [posts, setPosts] = useState<PostItem[] | null>(null);
  const [draft, setDraft] = useState("");
  const [asNotice, setAsNotice] = useState(false);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, CommentItem[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.posts)) setPosts(data.posts);
    } catch {
      // keep last data
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const submitPost = async () => {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, isNotice: asNotice }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast("error", data.error ?? "글 작성에 실패했습니다.");
        return;
      }
      setPosts((p) =>
        data.post.isNotice
          ? [data.post, ...(p ?? [])]
          : [
              ...(p ?? []).filter((x) => x.isNotice),
              data.post,
              ...(p ?? []).filter((x) => !x.isNotice),
            ]
      );
      setDraft("");
      setAsNotice(false);
      showToast("success", data.post.isNotice ? "공지가 게시됐어요!" : "글이 게시됐어요!");
    } catch {
      showToast("error", "서버에 연결할 수 없습니다.");
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!loggedIn) {
      showToast("info", "좋아요는 Google 로그인 후 누를 수 있어요.");
      return;
    }
    // optimistic
    setPosts((ps) =>
      (ps ?? []).map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likeCount: p.likeCount + (p.likedByMe ? -1 : 1),
            }
          : p
      )
    );
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setPosts((ps) =>
          (ps ?? []).map((p) =>
            p.id === postId
              ? { ...p, likedByMe: data.liked, likeCount: data.likeCount }
              : p
          )
        );
      }
    } catch {
      // next poll reconciles
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm("이 글을 삭제할까요?")) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        showToast("error", data.error ?? "삭제에 실패했습니다.");
        return;
      }
      setPosts((ps) => (ps ?? []).filter((p) => p.id !== postId));
      showToast("success", "글을 삭제했어요.");
    } catch {
      showToast("error", "서버에 연결할 수 없습니다.");
    }
  };

  const loadComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        setComments((c) => ({ ...c, [postId]: data.comments }));
      }
    } catch {
      // ignore
    }
  };

  const toggleComments = (postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else {
        next.add(postId);
        if (!comments[postId]) loadComments(postId);
      }
      return next;
    });
  };

  const submitComment = async (postId: string) => {
    const body = (commentDrafts[postId] ?? "").trim();
    if (!body) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast("error", data.error ?? "댓글 작성에 실패했습니다.");
        return;
      }
      setComments((c) => ({
        ...c,
        [postId]: [...(c[postId] ?? []), data.comment],
      }));
      setPosts((ps) =>
        (ps ?? []).map((p) =>
          p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
        )
      );
      setCommentDrafts((d) => ({ ...d, [postId]: "" }));
    } catch {
      showToast("error", "서버에 연결할 수 없습니다.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <h2 className="text-lg font-bold">커뮤니티</h2>
      <p className="text-sm text-gray-500 mt-0.5">
        팬덤 트레이더들의 이야기 — 최애 자랑, 전략 공유, 랭킹 배틀 선전포고까지.
      </p>

      {/* Composer */}
      {loggedIn ? (
        <div className="mt-4 rounded-xl border border-gray-200 p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_POST_LENGTH))}
            placeholder="지금 내 최애 이야기를 들려주세요..."
            rows={3}
            className="w-full text-sm outline-none resize-none bg-transparent"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-400">
                {draft.length} / {MAX_POST_LENGTH}
              </span>
              {isAdmin && (
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={asNotice}
                    onChange={(e) => setAsNotice(e.target.checked)}
                    className="accent-amber-500"
                  />
                  📢 공지로 게시
                </label>
              )}
            </div>
            <button
              onClick={submitPost}
              disabled={posting || draft.trim().length === 0}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition-colors"
            >
              {posting ? "게시 중..." : "게시하기"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => signIn("google")}
          className="mt-4 w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Google로 로그인하고 글쓰기
        </button>
      )}

      {/* Feed */}
      <div className="mt-4 flex flex-col gap-3">
        {posts === null && (
          <p className="py-8 text-center text-sm text-gray-300">불러오는 중...</p>
        )}
        {posts !== null && posts.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">
            아직 글이 없어요. 첫 글의 주인공이 되어보세요!
          </p>
        )}
        {(posts ?? []).map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border p-4 ${
              p.isNotice
                ? "border-amber-200 bg-amber-50/50"
                : "border-gray-100"
            }`}
          >
            {p.isNotice && (
              <p className="text-[11px] font-bold text-amber-600 mb-2">📢 공지</p>
            )}
            <div className="flex items-center gap-2.5">
              <Avatar author={p.author} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {p.author.name}
                  {p.author.isAdmin && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-[10px] text-amber-700 font-bold">
                      운영자
                    </span>
                  )}
                  {p.mine && (
                    <span className="ml-1.5 text-[10px] text-violet-500 font-semibold">나</span>
                  )}
                </p>
                <p className="text-[11px] text-gray-400">{timeAgo(p.time)}</p>
              </div>
              {(p.mine || isAdmin) && (
                <button
                  onClick={() => deletePost(p.id)}
                  className="text-[11px] text-gray-300 hover:text-red-400 shrink-0"
                >
                  삭제
                </button>
              )}
            </div>
            <p className="text-sm mt-3 leading-relaxed whitespace-pre-wrap break-words">
              {p.body}
            </p>
            <div className="flex gap-4 mt-3 text-xs">
              <button
                onClick={() => toggleLike(p.id)}
                className={`flex items-center gap-1 transition-colors ${
                  p.likedByMe ? "text-rose-500 font-semibold" : "text-gray-400 hover:text-rose-400"
                }`}
              >
                {p.likedByMe ? "❤️" : "🤍"} {p.likeCount}
              </button>
              <button
                onClick={() => toggleComments(p.id)}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                💬 {p.commentCount}
              </button>
            </div>

            {/* Comments */}
            {openComments.has(p.id) && (
              <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2.5">
                {(comments[p.id] ?? []).map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar author={c.author} />
                    <div className="min-w-0 flex-1 rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-xs">
                        <span className="font-semibold">{c.author.name}</span>
                        <span className="text-gray-400 ml-1.5 text-[10px]">
                          {timeAgo(c.time)}
                        </span>
                      </p>
                      <p className="text-xs mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                        {c.body}
                      </p>
                    </div>
                  </div>
                ))}
                {comments[p.id] && comments[p.id].length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-1">
                    첫 댓글을 남겨보세요!
                  </p>
                )}
                {loggedIn ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={commentDrafts[p.id] ?? ""}
                      onChange={(e) =>
                        setCommentDrafts((d) => ({
                          ...d,
                          [p.id]: e.target.value.slice(0, MAX_COMMENT_LENGTH),
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                          submitComment(p.id);
                        }
                      }}
                      placeholder="댓글 달기..."
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                    />
                    <button
                      onClick={() => submitComment(p.id)}
                      className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800"
                    >
                      등록
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => signIn("google")}
                    className="text-xs text-gray-400 hover:text-gray-600 text-left"
                  >
                    댓글은 Google 로그인 후 쓸 수 있어요 →
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
