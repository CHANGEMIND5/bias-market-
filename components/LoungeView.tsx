"use client";

// ─────────────────────────────────────────────────────────────
// 팬덤 라운지 피드 — 기존 커뮤니티 API(/api/posts 등)를 scope=MARKET로 재사용.
// 잠금 상태(서포터 모으기), 글 유형, 투표, 필터, 유저 라벨, 운영자 관리 포함.
// Fan Shares 수량·금액은 절대 노출하지 않습니다.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import Emblem from "./Emblem";
import TitleBadge from "./TitleBadge";
import UserAvatar from "./UserAvatar";
import { sendJSON } from "@/lib/data/api";
import { TKey, trServer, useLang } from "@/lib/i18n";
import {
  MAX_POST_LENGTH,
  POST_TYPES,
  PostType,
  UserLabel,
} from "@/lib/loungeShared";
import { useStore } from "@/lib/store";
import { Group } from "@/lib/types";

interface Author {
  name: string;
  image: string | null;
  isAdmin?: boolean;
  labels?: UserLabel[];
  title?: string | null;
}
interface Poll {
  closesAt: string;
  closedAt: string | null;
  closed: boolean;
  totalVotes: number;
  myOptionId: string | null;
  options: { id: string; text: string; votes: number }[];
}
interface PostItem {
  id: string;
  body: string;
  title: string | null;
  postType: string;
  isNotice: boolean;
  isPinned: boolean;
  isLocked: boolean;
  moderationStatus: string;
  time: string;
  author: Author;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  mine: boolean;
  reportCount?: number;
  poll?: Poll;
}
interface CommentItem {
  id: string;
  body: string;
  time: string;
  author: Author;
  mine?: boolean;
  reportCount?: number;
}
interface LoungeMeta {
  status: "ACTIVE" | "LOCKED" | "DISABLED";
  name: string;
  koreanName: string | null;
  fandom: string | null;
  supporters: number;
  supporterTarget: number;
}

const POLL_MS = 30_000;
const FILTERS = ["latest", "popular", "polls", "market_talk"] as const;
type Filter = (typeof FILTERS)[number];

function timeAgo(iso: string, t: (k: TKey, v?: any) => string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return t("time.now");
  if (s < 3600) return t("time.min", { n: Math.floor(s / 60) });
  if (s < 86400) return t("time.hour", { n: Math.floor(s / 3600) });
  return t("time.day", { n: Math.floor(s / 86400) });
}

const REPORT_REASONS = [
  "harassment", "hate", "spam", "misinfo",
  "privacy", "manipulation", "inappropriate", "other",
] as const;

// group 없이 쓰면 전체 커뮤니티(scope=GLOBAL) 모드로 동작.
export default function LoungeView({ group }: { group?: Group }) {
  const { loggedIn, isAdmin, showToast, state, toggleFavorite } = useStore();
  const { t } = useLang();
  const isGlobal = !group;
  const gid = group?.id ?? null;
  const scope: "GLOBAL" | "MARKET" = isGlobal ? "GLOBAL" : "MARKET";

  const [meta, setMeta] = useState<LoungeMeta | null>(null);
  const [posts, setPosts] = useState<PostItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("latest");

  const fav = gid ? state.favorites.includes(gid) : false;

  const loadMeta = useCallback(async () => {
    if (!gid) return;
    try {
      const res = await fetch(`/api/lounge/${gid}`, { cache: "no-store" });
      if (res.ok) setMeta(await res.json());
    } catch {
      // ignore
    }
  }, [gid]);

  const loadPosts = useCallback(async () => {
    try {
      const url = isGlobal
        ? `/api/posts?scope=GLOBAL&filter=${filter}`
        : `/api/posts?scope=MARKET&marketId=${gid}&filter=${filter}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.posts)) setPosts(data.posts);
    } catch {
      // keep last
    }
  }, [isGlobal, gid, filter]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);
  useEffect(() => {
    loadPosts();
    const id = setInterval(loadPosts, POLL_MS);
    return () => clearInterval(id);
  }, [loadPosts]);

  // 전체 커뮤니티는 항상 열려 있음(ACTIVE), 라운지는 상태에 따름
  const active = isGlobal || meta?.status === "ACTIVE";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {isGlobal ? (
          <div
            className="rounded-2xl p-5 text-white shadow-card"
            style={{ background: "linear-gradient(135deg,#7c3aed,#d946ef)" }}
          >
            <h1 className="text-lg font-extrabold drop-shadow">💬 {t("nav.community")}</h1>
            <p className="text-[12px] text-white/85 drop-shadow mt-0.5">{t("comm.subtitle")}</p>
          </div>
        ) : (
          <LoungeHeader group={group!} meta={meta} fav={fav} onFav={() => gid && toggleFavorite(gid)} />
        )}

        {!isGlobal && meta?.status === "LOCKED" && <LockedCard meta={meta} />}

        {active && (
          <>
            <Composer group={group} onCreated={(p) => setPosts((ps) => [p, ...(ps ?? [])])} />
            <Filters value={filter} onChange={setFilter} />
            <Feed
              posts={posts}
              setPosts={setPosts}
              loggedIn={loggedIn}
              isAdmin={isAdmin}
              showToast={showToast}
              t={t}
            />
          </>
        )}
      </div>

      {/* 데스크톱 우측: 규칙 */}
      <aside className="lg:w-72 shrink-0">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
          <p className="text-sm font-bold">{t("lt.rulesTitle")}</p>
          <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed whitespace-pre-line">
            {t("lt.rules")}
          </p>
        </div>
      </aside>
    </div>
  );
}

function LoungeHeader({
  group, meta, fav, onFav,
}: {
  group: Group;
  meta: LoungeMeta | null;
  fav: boolean;
  onFav: () => void;
}) {
  const { t } = useLang();
  return (
    <div
      className="rounded-2xl p-5 text-white shadow-card"
      style={{ background: `linear-gradient(135deg, ${group.gradient[0]}, ${group.gradient[1]})` }}
    >
      <div className="flex items-center gap-3">
        <Emblem group={group} size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold drop-shadow">
            {group.name} {t("lt.title")}
          </h1>
          <p className="text-[12px] text-white/85 drop-shadow">
            {[
              meta?.fandom ? `${t("detail.fandom")} ${meta.fandom}` : null,
              meta ? t("lt.supportersN", { n: meta.supporters }) : null,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          onClick={onFav}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold backdrop-blur transition-colors"
        >
          {fav ? "★ " : "☆ "}{t("lt.watchlist")}
        </button>
      </div>
    </div>
  );
}

function LockedCard({ meta }: { meta: LoungeMeta }) {
  const { t } = useLang();
  const pct = Math.min(100, (meta.supporters / meta.supporterTarget) * 100);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6 text-center">
      <p className="text-3xl">🔒</p>
      <p className="mt-2 font-bold">{t("lt.lockedTitle")}</p>
      <p className="mt-1 text-sm text-gray-500 whitespace-pre-line">{t("lt.lockedDesc")}</p>
      <div className="mt-4 max-w-xs mx-auto">
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs font-semibold text-violet-600">
          {t("lt.supportProgress", { a: meta.supporters, b: meta.supporterTarget })}
        </p>
      </div>
    </div>
  );
}

function Filters({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  const { t } = useLang();
  const label: Record<Filter, TKey> = {
    latest: "lt.filter.latest",
    popular: "lt.filter.popular",
    polls: "lt.filter.polls",
    market_talk: "lt.filter.marketTalk",
  };
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            value === f
              ? "bg-violet-600 text-white"
              : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          {t(label[f])}
        </button>
      ))}
    </div>
  );
}

function Composer({
  group, onCreated,
}: {
  group?: Group;
  onCreated: (p: PostItem) => void;
}) {
  const { loggedIn, isAdmin, showToast } = useStore();
  const { t } = useLang();
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<PostType>("GENERAL");
  const [asNotice, setAsNotice] = useState(false);
  const [pollMode, setPollMode] = useState(false);
  const [pollOpts, setPollOpts] = useState<string[]>(["", ""]);
  const [pollDays, setPollDays] = useState(3);
  const [posting, setPosting] = useState(false);

  const typeLabel: Record<PostType, TKey> = {
    GENERAL: "lt.type.general",
    MARKET_TALK: "lt.type.marketTalk",
    BATTLE: "lt.type.battle",
    POLL: "lt.type.poll",
  };

  if (!loggedIn) {
    return (
      <button
        onClick={() => signIn("google")}
        className="w-full py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50"
      >
        {t("comm.loginWrite")}
      </button>
    );
  }

  const submit = async () => {
    const b = body.trim();
    if (!b || posting) return;
    const poll = pollMode
      ? {
          options: pollOpts.map((o) => o.trim()).filter(Boolean),
          durationDays: pollDays,
        }
      : undefined;
    if (poll && poll.options.length < 2) {
      showToast("error", t("lt.pollNeed2"));
      return;
    }
    setPosting(true);
    try {
      const d = await sendJSON("/api/posts", {
        body: b,
        title: title.trim() || undefined,
        scope: group ? "MARKET" : "GLOBAL",
        marketId: group ? group.id : undefined,
        postType: pollMode ? "POLL" : type,
        isNotice: asNotice,
        poll,
      });
      if (!d?.ok) {
        showToast("error", trServer(t, d?.error, "err.network"));
        return;
      }
      onCreated(d.post);
      setBody(""); setTitle(""); setType("GENERAL");
      setAsNotice(false); setPollMode(false); setPollOpts(["", ""]);
      showToast("success", t("comm.posted"));
    } catch {
      showToast("error", t("err.network"));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
      {/* 글 유형 */}
      <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
        {POST_TYPES.filter((pt) => pt !== "POLL").map((pt) => (
          <button
            key={pt}
            onClick={() => setType(pt)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
              type === pt && !pollMode
                ? "bg-gray-900 text-white"
                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {t(typeLabel[pt])}
          </button>
        ))}
        <button
          onClick={() => setPollMode((v) => !v)}
          className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
            pollMode ? "bg-violet-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
          }`}
        >
          {t("lt.type.poll")}
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 120))}
        placeholder={t("lt.titlePlaceholder")}
        className="w-full text-sm font-semibold outline-none bg-transparent mb-1"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_POST_LENGTH))}
        placeholder={t("lt.bodyPlaceholder")}
        rows={3}
        className="w-full text-sm outline-none resize-none bg-transparent"
      />

      {pollMode && (
        <div className="mt-2 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
          <p className="text-[11px] font-bold text-violet-600 mb-1.5">{t("lt.pollOptions")}</p>
          {pollOpts.map((o, i) => (
            <input
              key={i}
              value={o}
              onChange={(e) =>
                setPollOpts((arr) => arr.map((x, j) => (j === i ? e.target.value.slice(0, 80) : x)))
              }
              placeholder={t("lt.pollOptionN", { n: i + 1 })}
              className="w-full mb-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-violet-400"
            />
          ))}
          <div className="flex items-center justify-between mt-1">
            <div className="flex gap-1">
              {pollOpts.length < 4 && (
                <button
                  onClick={() => setPollOpts((a) => [...a, ""])}
                  className="text-[11px] font-semibold text-violet-600"
                >
                  + {t("lt.pollAdd")}
                </button>
              )}
              {pollOpts.length > 2 && (
                <button
                  onClick={() => setPollOpts((a) => a.slice(0, -1))}
                  className="text-[11px] font-semibold text-gray-400 ml-2"
                >
                  − {t("lt.pollRemove")}
                </button>
              )}
            </div>
            <select
              value={pollDays}
              onChange={(e) => setPollDays(Number(e.target.value))}
              className="text-[11px] rounded-lg border border-gray-200 px-2 py-1 bg-white"
            >
              <option value={1}>{t("lt.poll1d")}</option>
              <option value={3}>{t("lt.poll3d")}</option>
              <option value={7}>{t("lt.poll7d")}</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-400">{body.length} / {MAX_POST_LENGTH}</span>
          {isAdmin && (
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 cursor-pointer select-none">
              <input type="checkbox" checked={asNotice} onChange={(e) => setAsNotice(e.target.checked)} className="accent-amber-500" />
              {t("comm.asNotice")}
            </label>
          )}
        </div>
        <button
          onClick={submit}
          disabled={posting || body.trim().length === 0}
          className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold transition-colors"
        >
          {posting ? t("comm.posting") : t("lt.createPost")}
        </button>
      </div>
    </div>
  );
}

function LabelChips({ labels }: { labels?: UserLabel[] }) {
  const { t } = useLang();
  if (!labels || labels.length === 0) return null;
  const label: Record<UserLabel, TKey> = {
    STARTER_FANDOM: "lt.label.starter",
    FAN_SHARE_HOLDER: "lt.label.holder",
    EARLY_BETA: "lt.label.early",
    LOUNGE_REGULAR: "lt.label.regular",
  };
  return (
    <>
      {labels.map((l) => (
        <span key={l} className="ml-1.5 px-1.5 py-0.5 rounded bg-violet-50 text-[10px] text-violet-600 font-semibold">
          {t(label[l])}
        </span>
      ))}
    </>
  );
}

function PollBox({ post, onVote }: { post: PostItem; onVote: (optionId: string) => void }) {
  const { t } = useLang();
  const poll = post.poll!;
  const total = poll.totalVotes;
  return (
    <div className="mt-3 rounded-xl border border-gray-100 p-3 flex flex-col gap-1.5">
      {poll.options.map((o) => {
        const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
        const mine = poll.myOptionId === o.id;
        return (
          <button
            key={o.id}
            disabled={poll.closed}
            onClick={() => onVote(o.id)}
            className={`relative w-full text-left rounded-lg border px-3 py-2 text-xs overflow-hidden ${
              mine ? "border-violet-400" : "border-gray-200"
            } ${poll.closed ? "cursor-default" : "hover:border-violet-300"}`}
          >
            <div
              className="absolute inset-0 bg-violet-50"
              style={{ width: `${pct}%` }}
            />
            <span className="relative flex justify-between font-semibold">
              <span>{mine ? "● " : ""}{o.text}</span>
              <span className="text-gray-400">{pct}%</span>
            </span>
          </button>
        );
      })}
      <p className="text-[10px] text-gray-400 mt-0.5">
        {t("lt.pollVotes", { n: total })}
        {poll.closed ? ` · ${t("lt.pollClosed")}` : ""}
      </p>
    </div>
  );
}

function Feed({
  posts, setPosts, loggedIn, isAdmin, showToast, t,
}: {
  posts: PostItem[] | null;
  setPosts: React.Dispatch<React.SetStateAction<PostItem[] | null>>;
  loggedIn: boolean;
  isAdmin: boolean;
  showToast: (type: "success" | "error" | "info", text: string) => void;
  t: (k: TKey, v?: any) => string;
}) {
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, CommentItem[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { missionEvent } = useStore();

  const patch = (id: string, fn: (p: PostItem) => PostItem) =>
    setPosts((ps) => (ps ?? []).map((p) => (p.id === id ? fn(p) : p)));

  const toggleLike = async (id: string) => {
    if (!loggedIn) return showToast("info", t("comm.loginLike"));
    patch(id, (p) => ({ ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }));
    try {
      const d = await (await fetch(`/api/posts/${id}/like`, { method: "POST" })).json();
      if (d.ok) patch(id, (p) => ({ ...p, likedByMe: d.liked, likeCount: d.likeCount }));
    } catch { /* poll reconciles */ }
  };

  const vote = async (postId: string, optionId: string) => {
    if (!loggedIn) return showToast("info", t("comm.loginLike"));
    try {
      const d = await sendJSON(`/api/polls/${postId}/vote`, { optionId });
      if (!d?.ok) return showToast("error", trServer(t, d?.error, "err.network"));
      patch(postId, (p) => {
        if (!p.poll) return p;
        const options = p.poll.options.map((o) => ({ ...o, votes: d.counts[o.id] ?? 0 }));
        return { ...p, poll: { ...p.poll, options, totalVotes: d.totalVotes, myOptionId: d.myOptionId } };
      });
    } catch {
      showToast("error", t("err.network"));
    }
  };

  const report = async (target: { postId?: string; commentId?: string }) => {
    if (!loggedIn) return showToast("info", t("comm.loginReport"));
    const reason = window.prompt(t("lt.reportPrompt"));
    if (reason === null) return;
    try {
      const d = await sendJSON("/api/report", { ...target, reason: reason.trim() || "other" });
      if (d?.ok) showToast("success", t("comm.reported"));
      else showToast("info", trServer(t, d?.error, "err.network"));
    } catch { showToast("error", t("err.network")); }
  };

  const adminAction = async (id: string, action: string) => {
    try {
      const d = await sendJSON(`/api/posts/${id}`, { action }, "PATCH");
      if (!d?.ok) return showToast("error", trServer(t, d?.error, "err.network"));
      if (action === "pin" || action === "unpin") patch(id, (p) => ({ ...p, isPinned: action === "pin" }));
      if (action === "lock" || action === "unlock") patch(id, (p) => ({ ...p, isLocked: action === "lock" }));
      if (action === "restore") patch(id, (p) => ({ ...p, moderationStatus: "VISIBLE" }));
      if (action === "closePoll")
        patch(id, (p) => (p.poll ? { ...p, poll: { ...p.poll, closed: true } } : p));
      showToast("success", t("lt.done"));
    } catch { showToast("error", t("err.network")); }
  };

  const deletePost = async (id: string) => {
    if (!window.confirm(t("comm.confirmDelPost"))) return;
    try {
      const d = await (await fetch(`/api/posts/${id}`, { method: "DELETE" })).json();
      if (!d.ok) return showToast("error", trServer(t, d.error, "err.network"));
      setPosts((ps) => (ps ?? []).filter((p) => p.id !== id));
      showToast("success", t("comm.deletedPost"));
    } catch { showToast("error", t("err.network")); }
  };

  const loadComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.comments)) setComments((c) => ({ ...c, [postId]: data.comments }));
    } catch { /* ignore */ }
  };

  const toggleComments = (postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else {
        next.add(postId);
        if (!comments[postId]) loadComments(postId);
        missionEvent("post_opened", postId);
      }
      return next;
    });
  };

  const submitComment = async (postId: string) => {
    const body = (drafts[postId] ?? "").trim();
    if (!body) return;
    try {
      const d = await sendJSON(`/api/posts/${postId}/comments`, { body });
      if (!d?.ok) return showToast("error", trServer(t, d?.error, "err.network"));
      setComments((c) => ({ ...c, [postId]: [...(c[postId] ?? []), d.comment] }));
      patch(postId, (p) => ({ ...p, commentCount: p.commentCount + 1 }));
      setDrafts((dd) => ({ ...dd, [postId]: "" }));
    } catch { showToast("error", t("err.network")); }
  };

  const deleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm(t("comm.confirmDelComment"))) return;
    try {
      const d = await (await fetch(`/api/comments/${commentId}`, { method: "DELETE" })).json();
      if (!d.ok) return showToast("error", trServer(t, d.error, "err.network"));
      setComments((c) => ({ ...c, [postId]: (c[postId] ?? []).filter((x) => x.id !== commentId) }));
      patch(postId, (p) => ({ ...p, commentCount: Math.max(0, p.commentCount - 1) }));
    } catch { showToast("error", t("err.network")); }
  };

  if (posts === null)
    return <p className="py-8 text-center text-sm text-gray-300">{t("trades.loading")}</p>;
  if (posts.length === 0)
    return <p className="py-8 text-center text-sm text-gray-400">{t("lt.empty")}</p>;

  return (
    <div className="flex flex-col gap-3">
      {posts.map((p) => (
        <div
          key={p.id}
          className={`bg-white rounded-2xl border p-4 shadow-card ${
            p.isPinned || p.isNotice ? "border-amber-200 bg-amber-50/40" : "border-gray-100"
          }`}
        >
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {p.isPinned && <span className="text-[10px] font-bold text-amber-600">📌 {t("lt.pinned")}</span>}
            {p.moderationStatus === "UNDER_REVIEW" && (
              <span className="text-[10px] font-bold text-red-500">⚠️ {t("lt.underReview")}</span>
            )}
            {p.postType !== "GENERAL" && (
              <span className="text-[10px] font-semibold text-violet-500">
                {t(("lt.type." + ({ MARKET_TALK: "marketTalk", BATTLE: "battle", POLL: "poll" } as any)[p.postType]) as TKey)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <UserAvatar image={p.author.image} size={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">
                {p.author.name}
                {p.author.isAdmin && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-[10px] text-amber-700 font-bold">
                    {t("comm.admin")}
                  </span>
                )}
                <LabelChips labels={p.author.labels} />
                <TitleBadge code={p.author.title} />
              </p>
              <p className="text-[11px] text-gray-400">{timeAgo(p.time, t)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (p.reportCount ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-500 text-[10px] font-bold">
                  🚩 {p.reportCount}
                </span>
              )}
              {loggedIn && !p.mine && (
                <button onClick={() => report({ postId: p.id })} className="text-[11px] text-gray-300 hover:text-amber-500">
                  {t("comm.report")}
                </button>
              )}
              {(p.mine || isAdmin) && (
                <button onClick={() => deletePost(p.id)} className="text-[11px] text-gray-300 hover:text-red-400">
                  {t("comm.delete")}
                </button>
              )}
            </div>
          </div>

          {p.title && <p className="text-sm font-bold mt-2">{p.title}</p>}
          <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap break-words">{p.body}</p>

          {p.poll && <PollBox post={p} onVote={(o) => vote(p.id, o)} />}

          <div className="flex gap-4 mt-3 text-xs items-center">
            <button
              onClick={() => toggleLike(p.id)}
              className={`flex items-center gap-1 transition-colors ${
                p.likedByMe ? "text-rose-500 font-semibold" : "text-gray-400 hover:text-rose-400"
              }`}
            >
              {p.likedByMe ? "❤️" : "🤍"} {p.likeCount}
            </button>
            <button onClick={() => toggleComments(p.id)} className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
              💬 {p.commentCount}
            </button>
            {isAdmin && (
              <span className="ml-auto flex gap-2 text-[11px] text-gray-300">
                <button onClick={() => adminAction(p.id, p.isPinned ? "unpin" : "pin")} className="hover:text-amber-500">
                  {p.isPinned ? t("lt.unpin") : t("lt.pin")}
                </button>
                <button onClick={() => adminAction(p.id, p.isLocked ? "unlock" : "lock")} className="hover:text-gray-600">
                  {p.isLocked ? t("lt.unlock") : t("lt.lock")}
                </button>
                {p.moderationStatus !== "VISIBLE" && (
                  <button onClick={() => adminAction(p.id, "restore")} className="hover:text-emerald-500">
                    {t("lt.restore")}
                  </button>
                )}
                {p.poll && !p.poll.closed && (
                  <button onClick={() => adminAction(p.id, "closePoll")} className="hover:text-gray-600">
                    {t("lt.closePoll")}
                  </button>
                )}
              </span>
            )}
          </div>

          {openComments.has(p.id) && (
            <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2.5">
              {(comments[p.id] ?? []).map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <UserAvatar image={c.author.image} size={28} />
                  <div className="min-w-0 flex-1 rounded-lg bg-gray-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs min-w-0">
                        <span className="font-semibold">{c.author.name}</span>
                        <LabelChips labels={c.author.labels} />
                        <TitleBadge code={c.author.title} />
                        <span className="text-gray-400 ml-1.5 text-[10px]">{timeAgo(c.time, t)}</span>
                      </p>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {loggedIn && !c.mine && (
                          <button onClick={() => report({ commentId: c.id })} className="text-[10px] text-gray-300 hover:text-amber-500">
                            {t("comm.report")}
                          </button>
                        )}
                        {(c.mine || isAdmin) && (
                          <button onClick={() => deleteComment(p.id, c.id)} className="text-[10px] text-gray-300 hover:text-red-400">
                            {t("comm.delete")}
                          </button>
                        )}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{c.body}</p>
                  </div>
                </div>
              ))}
              {p.isLocked ? (
                <p className="text-xs text-gray-400 text-center py-1">🔒 {t("lt.commentsLocked")}</p>
              ) : loggedIn ? (
                <div className="flex items-center gap-2">
                  <input
                    value={drafts[p.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value.slice(0, 300) }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) submitComment(p.id);
                    }}
                    placeholder={t("comm.commentPlaceholder")}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-violet-400"
                  />
                  <button onClick={() => submitComment(p.id)} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800">
                    {t("comm.send")}
                  </button>
                </div>
              ) : (
                <button onClick={() => signIn("google")} className="text-xs text-gray-400 hover:text-gray-600 text-left">
                  {t("comm.loginComment")}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
