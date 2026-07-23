"use client";

// 관리자 전용 — 24시간 거래 현황 (유저 vs 시스템 봇)
import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import { changeColor, fmt, fmtCompact, fmtInt, fmtPct } from "@/lib/format";

interface Row {
  groupId: string;
  name: string;
  tier: string;
  volume24h: number;
  price: number;
  change24h: number;
  userTrades: number;
  systemTrades: number;
  holders: number;
}
interface Totals {
  volume24h: number;
  userTrades24h: number;
  systemTrades24h: number;
  activeMarkets: number;
}
interface Users {
  total: number;
  new24h: number;
  new7d: number;
  traders: number;
  activeTraders7d: number;
}

export default function AdminActivityPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [users, setUsers] = useState<Users | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/activity", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 403 ? "관리자 계정으로 로그인해 주세요." : "불러오지 못했어요.");
        return r.json();
      })
      .then((d) => { setRows(d.rows); setTotals(d.totals); setUsers(d.users); })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen p-4 lg:p-6 max-w-[1100px] mx-auto">
      <AdminNav />
      <h1 className="text-xl font-bold mb-1">📊 거래 현황 (최근 24시간)</h1>
      <p className="text-xs text-gray-400 mb-4">
        유저 거래와 시스템 봇 거래를 분리해서 보여줘요. Fan$·Fan Shares는 실제 금전 가치가 없어요.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {!rows && !error && <p className="text-sm text-gray-400">불러오는 중...</p>}

      {users && (
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-500 mb-2">👥 가입 유저</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            <Stat label="총 가입자" value={fmtInt(users.total)} />
            <Stat label="24h 신규" value={`+${fmtInt(users.new24h)}`} />
            <Stat label="7일 신규" value={`+${fmtInt(users.new7d)}`} />
            <Stat label="거래한 유저" value={fmtInt(users.traders)} />
            <Stat label="7일 활성(거래)" value={fmtInt(users.activeTraders7d)} />
          </div>
        </div>
      )}

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          <Stat label="24h 총 거래량" value={`Fan$ ${fmtCompact(totals.volume24h)}`} />
          <Stat label="유저 거래" value={fmtInt(totals.userTrades24h)} />
          <Stat label="시스템 봇 거래" value={fmtInt(totals.systemTrades24h)} />
          <Stat label="거래 발생 종목" value={fmtInt(totals.activeMarkets)} />
        </div>
      )}

      {rows && (
        <div className="overflow-x-auto bg-white rounded-2xl border border-gray-200">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                {["마켓", "티어", "현재가", "24h 변동", "24h 거래량", "유저 거래", "봇 거래", "보유자"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.groupId} className="border-b border-gray-50">
                  <td className="px-3 py-1.5 font-bold">{r.name}</td>
                  <td className="px-3 py-1.5">{r.tier}</td>
                  <td className="px-3 py-1.5">{fmt(r.price)}</td>
                  <td className={`px-3 py-1.5 font-semibold ${changeColor(r.change24h)}`}>{fmtPct(r.change24h)}</td>
                  <td className="px-3 py-1.5 font-semibold">Fan$ {fmtCompact(r.volume24h)}</td>
                  <td className="px-3 py-1.5">{r.userTrades}</td>
                  <td className="px-3 py-1.5 text-gray-400">{r.systemTrades}</td>
                  <td className="px-3 py-1.5">{r.holders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[10px] text-gray-300">
        거래량 상위 40개 종목. "봇 거래"가 0이고 유저 거래도 0이면 아직 활동이 없는 종목이에요.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className="text-lg font-extrabold">{value}</p>
    </div>
  );
}
