"use client";

// 관리자 전용 — 그룹 팬덤 라운지 상태 관리 (원클릭 활성/잠금/자동)
import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import { sendJSON } from "@/lib/data/api";
import { fmtInt } from "@/lib/format";

interface Row {
  groupId: string;
  name: string;
  tier: string;
  stored: string;
  effective: "ACTIVE" | "LOCKED" | "DISABLED";
  reason: string | null;
  supporters: number;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  LOCKED: "bg-amber-100 text-amber-700",
  DISABLED: "bg-gray-200 text-gray-500",
};
const OPTIONS: { v: string; label: string }[] = [
  { v: "AUTO", label: "자동" },
  { v: "ACTIVE", label: "활성" },
  { v: "LOCKED", label: "잠금" },
  { v: "DISABLED", label: "비활성" },
];

export default function AdminGroupsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/lounges", { cache: "no-store" });
      if (!res.ok) throw new Error(res.status === 403 ? "관리자 계정으로 로그인해 주세요." : "불러오지 못했어요.");
      const d = await res.json();
      setRows(d.rows);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (groupId: string, status: string) => {
    setBusy(groupId);
    try {
      const d = await sendJSON("/api/admin/lounges", { groupId, status });
      if (d?.ok) await load();
      else alert(d?.error ?? "실패했어요.");
    } finally {
      setBusy(null);
    }
  };

  const shown = (rows ?? []).filter(
    (r) => !q || r.name.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 lg:p-6 max-w-[1000px] mx-auto">
      <AdminNav />
      <h1 className="text-xl font-bold mb-1">🎪 그룹·라운지 관리</h1>
      <p className="text-xs text-gray-400 mb-4">
        각 그룹의 팬덤 라운지를 클릭 한 번으로 열거나 잠글 수 있어요. "자동"은 티어·서포터 수에 따라 알아서 판정해요
        (Mega·Large = 자동 활성, Mid·Rookie = 서포터 20명 이상 시 자동 오픈).
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!rows && !error && <p className="text-sm text-gray-400">불러오는 중...</p>}

      {rows && (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="그룹 검색..."
            className="w-full mb-3 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
          />
          <div className="overflow-x-auto bg-white rounded-2xl border border-gray-200">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  {["그룹", "티어", "현재 상태", "서포터", "설정"].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.groupId} className="border-b border-gray-50">
                    <td className="px-3 py-2 font-bold">{r.name}</td>
                    <td className="px-3 py-2">{r.tier}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[r.effective]}`}>
                        {r.effective === "ACTIVE" ? "활성" : r.effective === "LOCKED" ? "잠김" : "비활성"}
                      </span>
                      {r.reason === "ADMIN" && <span className="ml-1 text-[9px] text-gray-400">수동</span>}
                      {r.reason === "COMMUNITY_THRESHOLD" && <span className="ml-1 text-[9px] text-gray-400">자동오픈</span>}
                    </td>
                    <td className="px-3 py-2">
                      {fmtInt(r.supporters)}
                      {r.effective === "LOCKED" && <span className="text-gray-300"> / 20</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {OPTIONS.map((o) => (
                          <button
                            key={o.v}
                            onClick={() => setStatus(r.groupId, o.v)}
                            disabled={busy === r.groupId || r.stored === o.v}
                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                              r.stored === o.v
                                ? "bg-gray-900 text-white cursor-default"
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 신규 그룹 안내 */}
      <div className="mt-5 bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-sm font-bold">🆕 새 그룹 추가는?</p>
        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
          완전히 새로운 그룹(신인 데뷔 등)은 큐레이션 방식이라 코드에 2줄만 추가하면 돼요:
          <br />① <code className="bg-gray-100 px-1 rounded">lib/idolSeeds.ts</code>에 그룹 한 줄 추가
          <br />② <code className="bg-gray-100 px-1 rounded">lib/marketTiers.ts</code>의 원하는 티어 목록에 이름 추가 → 배포
          <br />
          기존에 숨겨진(hidden) 그룹을 노출하고 싶을 때도 같은 방식이에요. 원하시면 언제든 대신 넣어드릴게요.
        </p>
      </div>
    </div>
  );
}
