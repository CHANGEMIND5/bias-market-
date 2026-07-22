"use client";

// ─────────────────────────────────────────────────────────────
// 관리자 전용 — 이코노미/준비금 모니터 (ADMIN_EMAILS 계정만 접근 가능)
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import { sendJSON } from "@/lib/data/api";
import { fmt, fmtCompact, fmtInt } from "@/lib/format";

// 관리자 수동 시즌 롤오버 (청산+마켓 리셋 실제 수행 — 테스트용)
function SeasonTrigger() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async () => {
    if (!window.confirm("정말 시즌 롤오버를 실행할까요?\n모든 보유 주식이 현재 시세로 Fan$ 정산되고, 마켓 가격이 초기화됩니다. 되돌릴 수 없어요.")) return;
    setBusy(true); setMsg(null);
    try {
      const d = await sendJSON("/api/admin/season", {});
      setMsg(d?.ok ? `✅ 롤오버 완료 (${d.seasonKey})` : `❌ ${d?.error ?? "실패"}`);
    } catch {
      setMsg("❌ 네트워크 오류");
    } finally { setBusy(false); }
  };
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-sm font-bold text-amber-800">🏆 시즌 롤오버 (수동 테스트)</p>
      <p className="mt-1 text-xs text-amber-700 leading-relaxed">
        평소엔 매월 말 자동 실행돼요. 이 버튼은 지금 즉시 시즌을 마감해 보는 테스트용이에요 —
        보유 주식이 현재 시세로 Fan$ 정산되고 마켓이 초기화되며, 각 그룹 최대 보유자에게 영구 배지가 부여돼요.
      </p>
      <button
        onClick={run}
        disabled={busy}
        className="mt-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-40"
      >
        {busy ? "실행 중..." : "지금 시즌 롤오버 실행"}
      </button>
      {msg && <p className="mt-2 text-xs font-semibold">{msg}</p>}
    </div>
  );
}

type Row = {
  groupId: string;
  name: string;
  tier: string;
  visible: boolean;
  economyVersion: number;
  initialPrice: number;
  currentPrice: number;
  poolShares: number;
  reserveShares: number;
  userHeldShares: number;
  starterDistributed: number;
  starterUserCount: number;
  treasuryFan: number;
  botBuys: number;
  botSells: number;
  invariantOk: boolean;
  lowReserve: boolean;
};

export default function AdminEconomyPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyVisible, setOnlyVisible] = useState(true);

  useEffect(() => {
    fetch("/api/admin/economy", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 403 ? "관리자 계정으로 로그인해 주세요." : "불러오지 못했어요.");
        return r.json();
      })
      .then((d) => setRows(d.rows))
      .catch((e) => setError(e.message));
  }, []);

  const shown = (rows ?? []).filter((r) => !onlyVisible || r.visible);
  const broken = (rows ?? []).filter((r) => !r.invariantOk);
  const low = shown.filter((r) => r.lowReserve);
  const v1 = (rows ?? []).filter((r) => r.economyVersion < 2);

  return (
    <div className="min-h-screen p-4 lg:p-6 max-w-[1300px] mx-auto">
      <AdminNav />
      <h1 className="text-xl font-bold mb-4">🛠 이코노미 모니터</h1>

      <SeasonTrigger />


      {error && <p className="text-sm text-red-500">{error}</p>}
      {!rows && !error && <p className="text-sm text-gray-400">불러오는 중...</p>}

      {rows && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            <Stat label="공급 불변식 위반" value={`${broken.length}`} danger={broken.length > 0} />
            <Stat label="준비금 10% 미만" value={`${low.length}`} danger={low.length > 0} />
            <Stat label="v1 (초기화 전) 마켓" value={`${v1.length}`} danger={v1.length > 0} />
            <Stat label="표시 중" value={`${shown.length}/${rows.length}`} />
          </div>
          <label className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
            <input
              type="checkbox"
              checked={onlyVisible}
              onChange={(e) => setOnlyVisible(e.target.checked)}
            />
            노출 그룹만 보기
          </label>

          <div className="overflow-x-auto bg-white rounded-2xl border border-gray-200">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  {["마켓", "티어", "v", "시작가", "현재가", "풀", "준비금", "유저 보유",
                    "스타터 지급", "선택 수", "금고 Fan$", "봇 매수/매도", "불변식"].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.groupId}
                    className={`border-b border-gray-50 ${
                      !r.invariantOk ? "bg-red-50" : r.lowReserve ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5 font-bold">{r.name}</td>
                    <td className="px-3 py-1.5">{r.tier}</td>
                    <td className="px-3 py-1.5">{r.economyVersion}</td>
                    <td className="px-3 py-1.5">{fmt(r.initialPrice)}</td>
                    <td className="px-3 py-1.5">{fmt(r.currentPrice)}</td>
                    <td className="px-3 py-1.5">{fmtCompact(r.poolShares)}</td>
                    <td className={`px-3 py-1.5 ${r.lowReserve ? "text-amber-600 font-bold" : ""}`}>
                      {fmtCompact(r.reserveShares)}
                    </td>
                    <td className="px-3 py-1.5">{fmtCompact(r.userHeldShares)}</td>
                    <td className="px-3 py-1.5">{fmtCompact(r.starterDistributed)}</td>
                    <td className="px-3 py-1.5">{fmtInt(r.starterUserCount)}</td>
                    <td className="px-3 py-1.5">{fmtCompact(r.treasuryFan)}</td>
                    <td className="px-3 py-1.5">{r.botBuys}/{r.botSells}</td>
                    <td className="px-3 py-1.5">
                      {r.invariantOk ? "✅" : <span className="text-red-600 font-bold">❌ 위반</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-gray-300">
            불변식: 풀 + 준비금 + 유저 보유 = 1,000,000 (v2 마켓). Fan$/Fan Shares는 실제 금전 가치가 없습니다.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${danger ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className={`text-lg font-extrabold ${danger ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}
