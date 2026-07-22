"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { floorShares, quoteBuy, quoteSell, spotPrice } from "@/lib/amm";
import { changeColor, fmt, fmtShares } from "@/lib/format";
import { trServer, useLang } from "@/lib/i18n";
import { MIN_BUY, MIN_SELL } from "@/lib/mockData";
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
  const { t } = useLang();
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [buyInput, setBuyInput] = useState("1000");
  const [sellInput, setSellInput] = useState("");
  const [pending, setPending] = useState(false);

  const m = state.markets[group.id];
  const price = spotPrice(m);
  const holding = state.holdings[group.id];
  const owned = holding?.shares ?? 0;
  const avgBuy = holding && holding.shares > 0 ? holding.cost / holding.shares : null;

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

  // 잔액/보유량 % 퀵버튼
  const setBuyPct = (pct: number) =>
    setBuyInput(state.balance > 0 ? String(Math.floor(state.balance * pct)) : "");
  const setSellPct = (pct: number) =>
    // 0.1주 단위. 전체(100%)는 dust까지 전량, 나머지는 0.1 내림
    setSellInput(
      owned > 0 ? (pct >= 1 ? String(owned) : floorShares(owned * pct).toFixed(1)) : ""
    );

  // 인라인 검증 (버튼 비활성화용)
  const buyError =
    buyAmount <= 0
      ? null
      : buyAmount < MIN_BUY
      ? t("trade.errMinBuy", { n: MIN_BUY })
      : buyAmount > state.balance
      ? t("trade.errBalance", { n: fmt(state.balance, 0) })
      : null;
  const sellError =
    sellAmount <= 0
      ? null
      : sellAmount < MIN_SELL
      ? t("trade.errMinSell", { n: MIN_SELL })
      : sellAmount > owned + 1e-9
      ? t("trade.errShares", { n: fmtShares(owned) })
      : null;
  const buyDisabled = pending || buyAmount <= 0 || !!buyError || !buyQuote;
  const sellDisabled = pending || sellAmount <= 0 || !!sellError || !sellQuote;

  // 거래 후 예상 값
  const buyAfterShares = owned + floorShares(buyQuote?.sharesOut ?? 0);
  const buyAfterAvg =
    buyQuote && buyAfterShares > 0
      ? ((holding?.cost ?? 0) + buyAmount) / buyAfterShares
      : null;
  // 팬덤 영향력 예상 증가: 거래 활동(+10) + 보유 가치 증가분(×0.01)
  const buyInfluenceGain = buyQuote
    ? Math.round(10 + buyQuote.effectiveInput * 0.01)
    : null;
  const sellAfterShares = Math.max(0, owned - sellAmount);

  const handleBuy = async () => {
    if (pending) return;
    setPending(true);
    const r = await buy(group.id, buyAmount);
    setPending(false);
    if (!r.ok) {
      showToast("error", trServer(t, r.error, "err.buyFail"));
      return;
    }
    showToast(
      "success",
      t("ok.buyDone", { name: group.name, n: fmtShares(r.trade!.shares) })
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
      showToast("error", trServer(t, r.error, "err.sellFail"));
      return;
    }
    showToast(
      "success",
      t("ok.sellDone", { name: group.name, n: fmt(r.trade!.fan) })
    );
    setSellInput("");
  };

  const loginButton = (
    <button
      onClick={() => signIn("google")}
      className="mt-4 w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition-colors"
    >
      {t("trade.loginBtn")}
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
      <h3 className="text-base font-bold mb-3">{t("trade.title")}</h3>

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
          {t("buy")}
        </button>
        <button
          onClick={() => setTab("sell")}
          className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "sell"
              ? "bg-red-50 text-red-600"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          {t("sell")}
        </button>
      </div>

      {tab === "buy" ? (
        <>
          <label className="text-xs text-gray-500">{t("trade.buyAmount")}</label>
          <div className="mt-1 flex items-center rounded-xl border border-gray-200 px-3 focus-within:border-emerald-400">
            <input
              type="number"
              min={MIN_BUY}
              value={buyInput}
              onChange={(e) => setBuyInput(e.target.value)}
              className="w-full py-2.5 text-sm font-semibold outline-none bg-transparent"
              placeholder={t("trade.minPlaceholder", { n: MIN_BUY })}
            />
            <span className="text-xs text-gray-400 font-medium shrink-0">Fan$</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[0.25, 0.5, 0.75].map((p) => (
              <button
                key={p}
                onClick={() => setBuyPct(p)}
                className="py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
              >
                {p * 100}%
              </button>
            ))}
            <button
              onClick={() => setBuyPct(1)}
              className="py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
            >
              {t("all")}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400 text-right">
            {t("trade.balance", { n: fmt(state.balance, 0) })}
          </p>
          {buyError && (
            <p className="mt-1 text-[11px] font-medium text-red-500">{buyError}</p>
          )}

          {/* 거래 후 예상 */}
          <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5">
            <p className="text-xs font-bold text-gray-600 pb-1.5 mb-1 border-b border-gray-200/70">
              {t("trade.preview")}
            </p>
            {row(
              t("trade.holdings"),
              buyQuote
                ? `${fmtShares(owned)} → ${fmtShares(buyAfterShares)} Shares`
                : `${fmtShares(owned)} Shares`
            )}
            {row(
              t("trade.avgPrice"),
              buyQuote && buyAfterAvg !== null
                ? `${avgBuy !== null ? `Fan$ ${fmt(avgBuy)} → ` : ""}Fan$ ${fmt(buyAfterAvg)}`
                : avgBuy !== null
                ? `Fan$ ${fmt(avgBuy)}`
                : "—"
            )}
            {row(
              t("trade.receive"),
              buyQuote ? `${fmtShares(floorShares(buyQuote.sharesOut))} Fan Shares` : "—",
              "font-bold"
            )}
            {row(t("trade.fee"), buyQuote ? `Fan$ ${fmt(buyQuote.fee)}` : "—")}
            {row(t("trade.execPrice"), buyQuote ? `Fan$ ${fmt(buyQuote.execPrice)}` : `Fan$ ${fmt(price)}`)}
            {row(
              t("trade.impact"),
              buyQuote ? `${buyQuote.priceImpact.toFixed(2)}%` : "—",
              buyQuote && buyQuote.priceImpact > 1 ? "font-medium text-amber-600" : "font-medium"
            )}
            {row(
              t("trade.influence"),
              buyInfluenceGain !== null ? `+${buyInfluenceGain} pts` : "—",
              "font-medium text-violet-600"
            )}
          </div>

          {loggedIn ? (
            <button
              onClick={handleBuy}
              disabled={buyDisabled}
              className="mt-4 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
            >
              {pending ? t("trade.pending") : t("trade.buyBtn")}
            </button>
          ) : (
            loginButton
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between items-baseline">
            <label className="text-xs text-gray-500">{t("trade.sellAmount")}</label>
            <span className="text-[11px] text-gray-400">
              {t("trade.owned", { n: fmtShares(owned) })}
            </span>
          </div>
          <div className="mt-1 flex items-center rounded-xl border border-gray-200 px-3 focus-within:border-red-300">
            <input
              type="number"
              min={MIN_SELL}
              value={sellInput}
              onChange={(e) => setSellInput(e.target.value)}
              className="w-full py-2.5 text-sm font-semibold outline-none bg-transparent"
              placeholder={t("trade.minPlaceholder", { n: MIN_SELL })}
            />
            <span className="text-xs text-gray-400 font-medium shrink-0">FS</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[0.25, 0.5, 0.75].map((p) => (
              <button
                key={p}
                onClick={() => setSellPct(p)}
                className="py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
              >
                {p * 100}%
              </button>
            ))}
            <button
              onClick={() => setSellPct(1)}
              className="py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
            >
              {t("all")}
            </button>
          </div>
          {sellError && (
            <p className="mt-1.5 text-[11px] font-medium text-red-500">{sellError}</p>
          )}

          {/* 거래 후 예상 */}
          <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5">
            <p className="text-xs font-bold text-gray-600 pb-1.5 mb-1 border-b border-gray-200/70">
              {t("trade.preview")}
            </p>
            {row(
              t("trade.holdings"),
              sellQuote
                ? `${fmtShares(owned)} → ${fmtShares(sellAfterShares)} Shares`
                : `${fmtShares(owned)} Shares`
            )}
            {row(
              t("trade.avgPrice"),
              avgBuy !== null ? `Fan$ ${fmt(avgBuy)} ${t("trade.avgKept")}` : "—"
            )}
            {row(
              t("trade.receive"),
              sellQuote ? `Fan$ ${fmt(sellQuote.fanOut)}` : "—",
              "font-bold"
            )}
            {row(t("trade.fee"), sellQuote ? `Fan$ ${fmt(sellQuote.fee)}` : "—")}
            {row(t("trade.execPrice"), sellQuote ? `Fan$ ${fmt(sellQuote.execPrice)}` : `Fan$ ${fmt(price)}`)}
            {row(
              t("trade.impact"),
              sellQuote ? `-${sellQuote.priceImpact.toFixed(2)}%` : "—",
              sellQuote && sellQuote.priceImpact > 1 ? "font-medium text-amber-600" : "font-medium"
            )}
            {row(t("trade.influence"), sellQuote ? "+10 pts" : "—", "font-medium text-violet-600")}
          </div>

          {loggedIn ? (
            <button
              onClick={handleSell}
              disabled={sellDisabled}
              className="mt-4 w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
            >
              {pending ? t("trade.pending") : t("trade.sellBtn")}
            </button>
          ) : (
            loginButton
          )}
        </>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
        {t("trade.note")} {t("disclaimer")}
      </p>
    </div>
  );
}
