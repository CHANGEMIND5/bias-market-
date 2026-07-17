"use client";

// 관리자 전용 — 커뮤니티 신고 관리
import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import { sendJSON } from "@/lib/data/api";

interface ReportItem {
  type: "post" | "comment";
  id: string;
  postId: string;
  body: string;
  author: { name: string; isAdmin: boolean };
  scope: string;
  loungeName: string | null;
  moderationStatus: string | null;
  isLocked: boolean | null;
  createdAt: string;
  reportCount: number;
  reasons: Record<string, number>;
  reporters: { name: string; agedOk: boolean }[];
}

const REASON_KO: Record<string, string> = {
  harassment: "괴롭힘", hate: "혐오", spam: "도배", misinfo: "허위/사칭",
  privacy: "개인정보", manipulation: "시세조작", inappropriate: "부적절", other: "기타",
};

export default function AdminReportsPage() {
  const [items, setItems] = useState<ReportItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reports", { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 403 ? "관리자 계정으로 로그인해 주세요." : "불러오지 못했어요.");
      const d = await res.json();
      setItems(d.items);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (item: ReportItem, action: string, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(item.id + action);
    try {
      const d = await sendJSON("/api/admin/reports", {
        action,
        postId: item.type === "post" ? item.id : undefined,
        commentId: item.type === "comment" ? item.id : undefined,
      });
      if (d?.ok) await load();
      else alert(d?.error ?? "실패했어요.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-6 max-w-[1000px] mx-auto">
      <AdminNav />
      <h1 className="text-xl font-bold mb-1">🚩 신고 관리</h1>
      <p className="text-xs text-gray-400 mb-4">
        미처리 신고를 대상별로 묶어 보여줘요. 서로 다른 24시간 이상 된 계정 3건이 쌓이면 글은 자동으로 "검토 중"이 돼요.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!items && !error && <p className="text-sm text-gray-400">불러오는 중...</p>}
      {items && items.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          🎉 미처리 신고가 없어요.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {(items ?? []).map((item) => (
          <div key={item.type + item.id} className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[11px] font-bold">
                신고 {item.reportCount}건
              </span>
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-semibold">
                {item.type === "post" ? "글" : "댓글"}
              </span>
              {item.loungeName && (
                <span className="text-[11px] text-violet-500 font-semibold">{item.loungeName} 라운지</span>
              )}
              {item.scope === "GLOBAL" && <span className="text-[11px] text-gray-400">전체 커뮤니티</span>}
              {item.moderationStatus === "HIDDEN" && (
                <span className="px-1.5 py-0.5 rounded bg-gray-800 text-white text-[10px] font-bold">숨김</span>
              )}
              {item.moderationStatus === "UNDER_REVIEW" && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">검토 중</span>
              )}
            </div>

            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3">
              {item.body || <span className="text-gray-300">(내용 없음)</span>}
            </p>
            <p className="text-[11px] text-gray-400 mt-1.5">
              작성자 {item.author.name}{item.author.isAdmin ? " (운영자)" : ""} · {new Date(item.createdAt).toLocaleString("ko-KR")}
            </p>

            {/* 사유 요약 */}
            <div className="flex gap-1.5 flex-wrap mt-2">
              {Object.entries(item.reasons).map(([r, n]) => (
                <span key={r} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-semibold">
                  {REASON_KO[r] ?? r} {n}
                </span>
              ))}
              <span className="px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 text-[10px]">
                established {item.reporters.filter((x) => x.agedOk).length}명
              </span>
            </div>

            {/* 액션 */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {item.type === "post" && item.moderationStatus !== "HIDDEN" && (
                <button onClick={() => act(item, "hide")} disabled={!!busy}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-40">
                  가리기
                </button>
              )}
              {item.type === "post" && item.moderationStatus === "HIDDEN" && (
                <button onClick={() => act(item, "restore")} disabled={!!busy}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40">
                  복구
                </button>
              )}
              <button
                onClick={() => act(item, item.type === "post" ? "deletePost" : "deleteComment", "정말 삭제할까요? 되돌릴 수 없어요.")}
                disabled={!!busy}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-40">
                삭제
              </button>
              <button onClick={() => act(item, "dismiss")} disabled={!!busy}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 disabled:opacity-40">
                신고 기각
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] text-gray-300">
        "가리기"는 글을 숨김 처리(운영자만 보임)하고, "삭제"는 영구 삭제예요. "신고 기각"은 문제없는 신고를 목록에서 치워요.
      </p>
    </div>
  );
}
