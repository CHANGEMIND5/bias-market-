"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { quoteBuy, quoteSell, spotPrice } from "@/lib/amm";
import { changeColor, fmt, fmtShares } from "@/lib/format";
import { DISCLAIMER_KO, MIN_BUY, MIN_SELL } from "@/lib/mockData";
import { useStore } from "@/lib/store";
import { Group } from "@/lib/types";

export default function TradePanel({
  group,
  onBuySuccess,
}: {
  group: Group;
  onBuySuccess: (info: { shares: number; fan: number }) => void;
}) {
  const { state, buy, sell, showToast, loggedIn } = useStore();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [buyInput, setBuyInput] = useState("1000");
  const [sellInput, setSellInput] = useState("");
  const [pending, setPending] = useState(false);

  const m = state.markets[group.id];
  const price = spotPrice(m);
  const holding = state.holdings[group.id];
  const owned = holding?.shares ?? 0;

  const buyAmount = parseFloat(buyInput) || 0;
  const sellAmount = parseFloat(sellInput) || 0;

  const buyQuote = useMemo(
    () => (buyAmount > 0 ? quoteBuy(m, buyAmount) : null),
    [m, buyAmount]
  );
  const sellQuote = useMemo(
    () => (sellAmount > 0 ? quoteSell(m, sellAmount) : null),
    [m, sellAmount]
  );

  const addBuy = (v: number) => setBuyInput(String(Math.floor(buyAmount + v)));
  const setSellPct = (pct: number) =>
    setSellInput(owned > 0 ? (owned * pct).toFixed(2) : "");

  const handleBuy = async () => {
    if (pending) return;
    setPending(true);
    const r = await buy(group.id, buyAmount);
    setPending(false);
    if (!r.ok) {
      showToast("error", r.error ?? "매수에 실패했습니다.");
      return;
    }
    showToast(
      "success",
      `${group.name} ${fmtShares(r.trade!.shares)} Fan Shares 매수 완료!`
    );
    onBuySuccess({ shares: r.trade!.shares, fan: r.trade!.fan });
    setBuyInput("1000");
  };

  const handleSell = async () => {
    if (pending) return;
    setPending(true);
    const r = await sell(group.id, sellAmount);
    setPending(false);
    if (!r.ok) {
      showToast("error", r.error ?? "매도에 실패했습니다.");
      return;
    }
    showToast(
      "success",
      `${group.name} 매도 완료 — Fan$ ${fmt(r.trade!.fan)} 수령!`
    );
    setSellInput("");
  };

  const loginButton = (
    <button
      onClick={() => signIn("google")}
      className="mt-4 w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition-colors"
    >
      Google로 로그인하고 거래하기
    </button>
  );

  const row = (label: string, value: string, valueClass = "font-medium") => (
    <div className="flex justify-between text-xs py-1">
      <span className="text-gray-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );

  return (
    <div>
      <h3 className="text-base font-bold mb-3">거래하기</h3>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-gray-200 p-1 mb-4">
        <button
          onClick={() => setTab("buy")}
          className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "buy"
              ? "bg-emerald-50 text-emerald-700"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          매수
        </button>
        <button
          onClick={() => setTab("sell")}
          className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "sell"
              ? "bg-red-50 text-red-600"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          매도
        </button>
      </div>

      {tab === "buy" ? (
        <>
          <label className="text-xs text-gray-500">투입 금액 (Fan$)</label>
          <div className="mt-1 flex items-center rounded-xl border border-gray-200 px-3 focus-within:border-emerald-400">
            <input
              type="number"
              min={MIN_BUY}
              value={buyInput}
              onChange={(e) => setBuyInput(e.target.value)}
              className="w-full py-2.5 text-sm font-semibold outline-none bg-transparent"
              placeholder={`최소 ${MIN_BUY}`}
            />
            <span className="text-xs text-gray-400 font-medium shrink-0">Fan$</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[1000, 5000, 10000].map((v) => (
              <button
                key={v}
                onClick={() => addBuy(v)}
                className="py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
              >
                +{v.toLocaleString()}
              </button>
            ))}
            <button
              onClick={() => setBuyInput(String(Math.floor(state.balance)))}
              className="py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
            >
              전체
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="flex justify-between items-baseline pb-1.5 mb-1 border-b border-gray-200/70">
              <span className="text-xs text-gray-500">예상 수령 Fan Shares</span>
              <span className="text-lg font-bold">
                {buyQuote ? fmtShares(buyQuote.sharesOut) : "—"}
              </span>
            </div>
            {row("수수료 (0.30%)", buyQuote ? `Fan$ ${fmt(buyQuote.fee)}` : "—")}
            {row("실행 가격", buyQuote ? `Fan$ ${fmt(buyQuote.execPrice)}` : `Fan$ ${fmt(price)}`)}
            {row(
              "가격 영향",
              buyQuote ? `${buyQuote.priceImpact.toFixed(2)}%` : "—",
              buyQuote && buyQuote.priceImpact > 1 ? "font-medium text-amber-600" : "font-medium"
            )}
          </div>

          {loggedIn ? (
            <button
              onClick={handleBuy}
              disabled={pending}
              className="mt-4 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors"
            >
              {pending ? "체결 중..." : "Fan Shares 매수하기"}
            </button>
          ) : (
            loginButton
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between items-baseline">
            <label className="text-xs text-gray-500">매도 수량 (Fan Shares)</label>
            <span className="text-[11px] text-gray-400">
              보유: {fmtShares(owned)} FS
            </span>
          </div>
          <div className="mt-1 flex items-center rounded-xl border border-gray-200 px-3 focus-within:border-red-300">
            <input
              type="number"
              min={MIN_SELL}
              value={sellInput}
              onChange={(e) => setSellInput(e.target.value)}
              className="w-full py-2.5 text-sm font-semibold outline-none bg-transparent"
              placeholder={`최소 ${MIN_SELL}`}
            />
            <span className="text-xs text-gray-400 font-medium shrink-0">FS</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[0.1, 0.25, 0.5].map((p) => (
              <button
                key={p}
                onClick={() => setSellPct(p)}
                className="py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
              >
                {p * 100}%
              </button>
            ))}
            <button
              onClick={() => setSellPct(1)}
              className="py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
            >
              전체
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="flex justify-between items-baseline pb-1.5 mb-1 border-b border-gray-200/70">
              <span className="text-xs text-gray-500">예상 수령 Fan$</span>
              <span className="text-lg font-bold">
                {sellQuote ? fmt(sellQuote.fanOut) : "—"}
              </span>
            </div>
            {row("수수료 (0.30%)", sellQuote ? `Fan$ ${fmt(sellQuote.fee)}` : "—")}
            {row("실행 가격", sellQuote ? `Fan$ ${fmt(sellQuote.execPrice)}` : `Fan$ ${fmt(price)}`)}
            {row(
              "가격 영향",
              sellQuote ? `-${sellQuote.priceImpact.toFixed(2)}%` : "—",
              sellQuote && sellQuote.priceImpact > 1 ? "font-medium text-amber-600" : "font-medium"
            )}
          </div>

          {loggedIn ? (
            <button
              onClick={handleSell}
              disabled={pending}
              className="mt-4 w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold transition-colors"
            >
              {pending ? "체결 중..." : "Fan Shares 매도하기"}
            </button>
          ) : (
            loginButton
          )}
        </>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
        🛡 시장가 주문은 현재 풀 상태 기준으로 즉시 체결됩니다. {DISCLAIMER_KO}
      </p>
    </div>
  );
}
