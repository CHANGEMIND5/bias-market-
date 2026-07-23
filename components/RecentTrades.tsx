"use client";

import { useCallback, useEffect, useState } from "react";
import { getTrades } from "@/lib/data/trades";
import { fmt, fmtShares } from "@/lib/format";
import { useLang } from "@/lib/i18n";

interface Row {
  id: string;
  side: "buy" | "sell";
  price: number;
  shares: number;
  fan: number;
  time: string; // ISO
  isSystem?: boolean;
  mine: boolean;
}

const POLL_MS = 10_000;

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export default function RecentTrades({
  groupId,
  price,
}: {
  groupId: string;
  price: number;
}) {
  const { t } = useLang();
  const [mineOnly, setMineOnly] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getTrades(groupId);
      if (Array.isArray(data.trades)) setRows(data.trades);
    } catch {
      // keep last data
    }
  }, [groupId]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  // refresh instantly after my own trade (price prop changes), plus polling
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price]);

  useEffect(() => {
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const visible = (rows ?? []).filter((r) => (mineOnly ? r.mine : true)).slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold">{t("trades.title")}</h3>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => setMineOnly(false)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              !mineOnly ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {t("trades.all")}
          </button>
          <button
            onClick={() => setMineOnly(true)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              mineOnly ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {t("trades.mine")}
          </button>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left font-medium py-2">{t("trades.time")}</th>
            <th className="text-left font-medium py-2">{t("trades.side")}</th>
            <th className="text-right font-medium py-2">{t("trades.price")}</th>
            <th className="text-right font-medium py-2">{t("trades.shares")}</th>
            <th className="text-right font-medium py-2">{t("trades.total")}</th>
          </tr>
        </thead>
        <tbody>
          {rows === null && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-300">
                {t("trades.loading")}
              </td>
            </tr>
          )}
          {rows !== null && visible.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-400">
                {mineOnly ? t("trades.emptyMine") : t("trades.empty")}
              </td>
            </tr>
          )}
          {visible.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 last:border-0">
              <td className="py-2 text-gray-500">
                {timeLabel(r.time)}
                {r.mine && (
                  <span className="ml-1 text-[9px] text-violet-500 font-semibold">
                    {t("trades.me")}
                  </span>
                )}
              </td>
              <td className="py-2 whitespace-nowrap">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  {r.isSystem && (
                    <span className="px-1 py-0.5 rounded bg-gray-100 text-gray-400 text-[9px] font-bold">
                      SYSTEM
                    </span>
                  )}
                  <span className={`font-semibold ${r.side === "buy" ? "text-up" : "text-down"}`}>
                    {r.side === "buy" ? t("buy") : t("sell")}
                  </span>
                </span>
              </td>
              <td className="py-2 text-right">{fmt(r.price)}</td>
              <td className="py-2 text-right">{fmtShares(r.shares)}</td>
              <td className="py-2 text-right">{fmt(r.fan)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px] text-gray-300">{t("trades.systemNote")}</p>
    </div>
  );
}
