"use client";

// ─────────────────────────────────────────────────────────────
// 관리자 전용 — 이코노미/준비금 모니터 (ADMIN_EMAILS 계정만 접근 가능)
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import Link from "next/link";
import { fmt, fmtCompact, fmtInt } from "@/lib/format";

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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🛠 이코노미 모니터 (관리자)</h1>
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← 홈</Link>
      </div>

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
