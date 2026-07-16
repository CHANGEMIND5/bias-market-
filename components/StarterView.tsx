"use client";

// ─────────────────────────────────────────────────────────────
// 스타터 팬덤 포트폴리오 — 선택/미리보기/확정/온보딩/스테이지2 UI
// 자격·기준가·수량은 전부 서버가 결정. 이 컴포넌트는 표시와 요청만 담당.
// ─────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from "react";
import Emblem from "./Emblem";
import { spotPrice } from "@/lib/amm";
import { sendJSON } from "@/lib/data/api";
import { fmt, fmtShares } from "@/lib/format";
import { TKey, useLang } from "@/lib/i18n";
import { VISIBLE_GROUPS } from "@/lib/mockData";
import { searchGroups } from "@/lib/search";
import { useStore } from "@/lib/store";
import { Group } from "@/lib/types";

type Alloc = {
  marketId: string;
  role: "MAIN" | "SUB";
  referencePrice: number;
  stage1FanValue: number;
  stage1ShareQuantity: number;
  stage2FanValue: number;
  stage2ShareQuantity: number;
  stage2Claimed: boolean;
};
type Onboarding = {
  marketVisits: number;
  marketVisitTarget: number;
  portfolioViewed: boolean;
  firstTradeCompleted: boolean;
  battleViewed: boolean;
  complete: boolean;
};
type StarterData = {
  status: string;
  allocations: Alloc[];
  onboarding: Onboarding;
};

const MAIN_STAGE = 200;
const SUB_STAGE = 75;

export default function StarterView() {
  const { state, loggedIn, hydrated, showToast, refresh } = useStore();
  const { t } = useLang();

  const [data, setData] = useState<StarterData | null>(null);
  const [mainId, setMainId] = useState<string | null>(null);
  const [subIds, setSubIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [justGranted, setJustGranted] = useState<1 | 2 | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/starter", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // ignore — 재시도 가능
    }
  }, []);
  useEffect(() => {
    if (loggedIn) load();
  }, [loggedIn, load]);

  // 선택 가능 그룹 (노출 그룹만 — hidden/멤버/legacy는 서버에서도 거부)
  const eligible = useMemo(() => {
    const q = query.trim();
    if (!q) return VISIBLE_GROUPS.slice(0, 40);
    // 검색은 노출 그룹만 (legacy 제외 = 스타터 선택 불가 목록과 동일)
    return searchGroups(q, { includeLegacy: false, limit: 40 }).filter(
      (g) => g.defaultVisible !== false
    );
  }, [query]);

  const priceOf = useCallback(
    (gid: string) => {
      const m = state.markets[gid];
      return m ? spotPrice(m) : 0;
    },
    [state.markets]
  );

  const pick = (g: Group) => {
    if (mainId === g.id) { setMainId(null); return; }
    if (subIds.includes(g.id)) {
      setSubIds(subIds.filter((s) => s !== g.id));
      return;
    }
    if (!mainId) { setMainId(g.id); return; }
    if (subIds.length < 4) setSubIds([...subIds, g.id]);
  };

  const confirm = async () => {
    if (!mainId || subIds.length !== 4 || busy) return;
    setBusy(true);
    try {
      const d = await sendJSON("/api/starter/confirm", { mainId, subIds });
      if (d?.ok) {
        setData(d as StarterData);
        setJustGranted(1);
        showToast("success", t("sp.stage1Done"));
        refresh();
      } else {
        showToast("error", starterErr(d?.error, t));
      }
    } catch {
      showToast("error", t("err.network"));
    } finally {
      setBusy(false);
    }
  };

  const claim2 = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const d = await sendJSON("/api/starter/claim2", {});
      if (d?.ok) {
        setData(d as StarterData);
        setJustGranted(2);
        showToast("success", t("sp.completedTitle"));
        refresh();
      } else {
        showToast("error", starterErr(d?.error, t));
      }
    } catch {
      showToast("error", t("err.network"));
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) return null;

  if (!loggedIn) {
    return (
      <Card>
        <h2 className="text-lg font-bold">{t("sp.title")}</h2>
        <p className="mt-2 text-sm text-gray-500">{t("sp.loginFirst")}</p>
      </Card>
    );
  }

  const status = data?.status ?? "NOT_STARTED";

  // ── 확정 후: 잠긴 선택 + 온보딩 + 스테이지 2 ──
  if (status !== "NOT_STARTED") {
    const ob = data!.onboarding;
    const steps: [string, boolean, string][] = [
      [t("sp.obVisit"), ob.marketVisits >= ob.marketVisitTarget,
        `${ob.marketVisits}/${ob.marketVisitTarget}`],
      [t("sp.obPortfolio"), ob.portfolioViewed, ""],
      [t("sp.obTrade"), ob.firstTradeCompleted, ""],
      [t("sp.obBattle"), ob.battleViewed, ""],
    ];
    const doneCount = steps.filter(([, d]) => d).length;
    const completed = status === "COMPLETED";

    return (
      <div className="flex flex-col gap-4">
        {justGranted && (
          <Card className="border-violet-200 bg-violet-50/50 text-center">
            <p className="text-2xl">🎉</p>
            <p className="mt-1 font-bold">
              {justGranted === 2 ? t("sp.completedTitle") : t("sp.stage1Done")}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {justGranted === 2 ? t("sp.completedSub") : t("sp.stage1DoneSub")}
            </p>
          </Card>
        )}

        {/* 확정된 포트폴리오 (잠김) */}
        <Card>
          <h2 className="text-lg font-bold">
            {completed ? t("sp.completedTitle") : t("sp.confirmedTitle")}
          </h2>
          {completed && (
            <p className="mt-1 text-sm text-gray-500">{t("sp.completedSub")}</p>
          )}
          <div className="mt-3 flex flex-col gap-2">
            {data!.allocations
              .slice()
              .sort((a) => (a.role === "MAIN" ? -1 : 1))
              .map((a) => (
                <AllocationRow key={a.marketId} a={a} completed={completed} />
              ))}
          </div>
          <p className="mt-3 text-[10px] text-gray-300">
            {t("sp.priceImpactNone")} · {t("sp.note3")}
          </p>
        </Card>

        {/* 온보딩 진행 + 스테이지 2 */}
        {!completed && (
          <Card>
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-bold">
                {t("sp.obTitle", { a: doneCount, b: steps.length })}
              </h3>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {steps.map(([label, done, extra]) => (
                <li key={label} className="flex items-center gap-2 text-sm">
                  <span>{done ? "✅" : "⬜️"}</span>
                  <span className={done ? "text-gray-400 line-through" : ""}>
                    {label}
                  </span>
                  {extra && (
                    <span className="ml-auto text-xs text-gray-400">{extra}</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-semibold text-violet-600">
              🔒 {t("sp.obLocked")}
            </p>
            <button
              onClick={claim2}
              disabled={!ob.complete || busy}
              className={`mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                ob.complete
                  ? "bg-violet-600 hover:bg-violet-700 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {ob.complete ? t("sp.claim2") : t("sp.claim2Locked")}
            </button>
          </Card>
        )}
      </div>
    );
  }

  // ── 선택 전: 인트로 + 선택 UI + 미리보기 ──
  const selected = [
    ...(mainId ? [{ gid: mainId, role: "MAIN" as const }] : []),
    ...subIds.map((gid) => ({ gid, role: "SUB" as const })),
  ];
  const ready = mainId !== null && subIds.length === 4;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* 좌: 인트로 + 선택 */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <Card>
          <h2 className="text-lg font-bold">{t("sp.title")}</h2>
          <p className="mt-2 text-sm text-gray-600">{t("sp.intro1")}</p>
          <p className="mt-1 text-sm text-gray-600">{t("sp.intro2")}</p>
          <p className="mt-1 text-sm text-gray-600">{t("sp.intro3")}</p>
        </Card>

        <Card>
          <p className="text-sm font-bold">
            {!mainId
              ? t("sp.pickMain")
              : t("sp.pickSubs", { n: subIds.length })}
          </p>

          {/* 선택 칩 */}
          {selected.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selected.map(({ gid, role }) => {
                const g = VISIBLE_GROUPS.find((x) => x.id === gid);
                if (!g) return null;
                return (
                  <button
                    key={gid}
                    onClick={() => pick(g)}
                    className={`flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full text-xs font-semibold border ${
                      role === "MAIN"
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-violet-50 text-violet-700 border-violet-200"
                    }`}
                  >
                    <Emblem group={g} size={16} />
                    {g.name}
                    <span className="opacity-60">✕</span>
                  </button>
                );
              })}
            </div>
          )}

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("sp.search")}
            className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
          />

          <div className="mt-2 max-h-72 overflow-y-auto flex flex-col gap-1">
            {eligible.length === 0 && (
              <p className="text-xs text-gray-400 py-3 text-center">
                {t("sp.noResults")}
              </p>
            )}
            {eligible.map((g) => {
              const isMain = mainId === g.id;
              const isSub = subIds.includes(g.id);
              const price = priceOf(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => pick(g)}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    isMain
                      ? "bg-violet-600 text-white"
                      : isSub
                        ? "bg-violet-50 border border-violet-200"
                        : "hover:bg-gray-50"
                  }`}
                >
                  <Emblem group={g} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{g.name}</p>
                    <p
                      className={`text-[11px] ${isMain ? "text-white/70" : "text-gray-400"}`}
                    >
                      Fan$ {fmt(price)}
                    </p>
                  </div>
                  {isMain && (
                    <span className="text-[10px] font-bold shrink-0">
                      {t("sp.main")}
                    </span>
                  )}
                  {isSub && (
                    <span className="text-[10px] font-bold text-violet-600 shrink-0">
                      {t("sp.sub")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 우: 미리보기 + 확정 */}
      <div className="lg:w-96 shrink-0 flex flex-col gap-4">
        <Card>
          <h3 className="text-base font-bold">{t("sp.previewTitle")}</h3>
          <div className="mt-3 flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((i) => {
              const sel = selected[i];
              const g = sel ? VISIBLE_GROUPS.find((x) => x.id === sel.gid) : null;
              const isMain = i === 0;
              const stageFan = isMain ? MAIN_STAGE : SUB_STAGE;
              const price = g ? priceOf(g.id) : 0;
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-3 ${
                    g ? "border-violet-100 bg-violet-50/30" : "border-dashed border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {g ? <Emblem group={g} size={24} /> : (
                      <div className="w-6 h-6 rounded-full bg-gray-100" />
                    )}
                    <p className="text-sm font-bold flex-1 truncate">
                      {g ? g.name : isMain ? t("sp.main") : t("sp.subN", { n: i })}
                    </p>
                    <span className="text-[10px] font-bold text-violet-500">
                      {isMain ? t("sp.main") : t("sp.sub")}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {isMain ? t("sp.mainValue") : t("sp.subValue")}
                  </p>
                  {g && price > 0 && (
                    <p className="text-[11px] text-gray-400">
                      {t("sp.refPrice", { p: fmt(price) })} ·{" "}
                      {t("sp.estShares", {
                        n: fmtShares((stageFan * 2) / price),
                      })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-gray-50 py-2">
              <p className="text-[10px] text-gray-400">{t("sp.totalNow")}</p>
              <p className="text-sm font-extrabold">Fan$ 500</p>
            </div>
            <div className="rounded-xl bg-gray-50 py-2">
              <p className="text-[10px] text-gray-400">{t("sp.totalLater")}</p>
              <p className="text-sm font-extrabold">Fan$ 500</p>
            </div>
          </div>

          <button
            onClick={confirm}
            disabled={!ready || busy}
            className={`mt-3 w-full py-3 rounded-xl text-sm font-bold transition-colors ${
              ready
                ? "bg-violet-600 hover:bg-violet-700 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {busy ? t("sp.confirming") : t("sp.confirm")}
          </button>
          <p className="mt-2 text-[11px] text-gray-400 text-center">
            {t("sp.lockNote")}
          </p>
          <div className="mt-3 border-t border-gray-100 pt-2 flex flex-col gap-1">
            <p className="text-[10px] text-gray-300">{t("sp.note1")}</p>
            <p className="text-[10px] text-gray-300">{t("sp.note2")}</p>
            <p className="text-[10px] text-gray-300">{t("sp.note3")}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AllocationRow({ a, completed }: { a: Alloc; completed: boolean }) {
  const { t } = useLang();
  const g = VISIBLE_GROUPS.find((x) => x.id === a.marketId);
  if (!g) return null;
  const totalQty = a.stage1ShareQuantity + (a.stage2Claimed ? a.stage2ShareQuantity : 0);
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5">
      <Emblem group={g} size={28} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold truncate">{g.name}</p>
        <p className="text-[11px] text-gray-400">
          {t("sp.refPrice", { p: fmt(a.referencePrice) })}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold text-violet-500">
          {a.role === "MAIN" ? t("sp.main") : t("sp.sub")}
        </p>
        <p className="text-xs font-bold">
          {fmtShares(totalQty)} Shares
          {!completed && !a.stage2Claimed && (
            <span className="text-gray-300"> +{fmtShares(a.stage2ShareQuantity)} 🔒</span>
          )}
        </p>
      </div>
    </div>
  );
}

function starterErr(code: unknown, t: (k: TKey, v?: any) => string): string {
  const known = [
    "invalid_selection", "already_claimed", "economy_not_ready",
    "insufficient_reserve", "not_eligible_yet", "server_error",
  ];
  const key = known.includes(String(code))
    ? (`sp.err.${code}` as TKey)
    : ("sp.err.server_error" as TKey);
  return t(key);
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white rounded-2xl border border-gray-200 shadow-card p-5 ${className}`}
    >
      {children}
    </section>
  );
}
