"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { spotPrice } from "./amm";
import { sendJSON } from "./data/api";
import { unlockBadge } from "./data/badges";
import { updateFavorite } from "./data/favorites";
import { fetchAppState } from "./data/markets";
import { updateShareStats } from "./data/shareStats";
import { createTrade } from "./data/trades";
import { fmtInt, todayString } from "./format";
import { DEFAULT_GAME, GameData, loadGame, saveGame, withVisit } from "./game";
import { Tfn, TKey, useLang } from "./i18n";
import { initialState } from "./storage";
import { AppState, Holding, MarketState, Trade } from "./types";

export interface ToastMsg {
  id: number;
  type: "success" | "error" | "info";
  text: string;
}

export interface TradeResult {
  ok: boolean;
  error?: string;
  trade?: Trade;
}

export interface ClaimResult {
  ok: boolean;
  error?: string;
}

interface StoreValue {
  state: AppState;
  hydrated: boolean;
  loggedIn: boolean;
  isAdmin: boolean;
  userName: string | null;
  userImage: string | null;
  updateName: (name: string) => Promise<ClaimResult>;
  updateAvatar: (avatar: number) => Promise<ClaimResult>;
  game: GameData;
  recordShareCopy: () => void;
  markBadgeEarned: (id: string) => void;
  refCode: string | null;
  refCount: number;
  hasReferrer: boolean;
  toasts: ToastMsg[];
  showToast: (type: ToastMsg["type"], text: string) => void;
  refresh: () => Promise<void>;
  buy: (groupId: string, fanIn: number) => Promise<TradeResult>;
  sell: (groupId: string, sharesIn: number) => Promise<TradeResult>;
  toggleFavorite: (groupId: string) => Promise<void>;
  claimDailyReward: () => Promise<ClaimResult>;
  canClaimReward: boolean;
  priceOf: (groupId: string) => number;
  portfolioValue: number;
  totalCost: number;
  totalPnl: number;
  holdingCount: number;
  level: number;
  levelTitle: string;
  xpInLevel: number;
  xpPerLevel: number;
}

const StoreContext = createContext<StoreValue | null>(null);

const XP_PER_LEVEL = 500;
const LEVEL_TITLES: [number, TKey][] = [
  [1, "lv.1"],
  [3, "lv.3"],
  [6, "lv.6"],
  [10, "lv.10"],
  [20, "lv.20"],
];

function titleFor(level: number, t: Tfn): string {
  let key = LEVEL_TITLES[0][1];
  for (const [lv, k] of LEVEL_TITLES) if (level >= lv) key = k;
  return t(key);
}

let toastSeq = 0;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { t } = useLang();
  const loggedIn = status === "authenticated";

  // Starts with the mock seed so the dashboard renders instantly,
  // then the real shared state arrives from /api/state.
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [refCount, setRefCount] = useState(0);
  const [hasReferrer, setHasReferrer] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [game, setGame] = useState<GameData>(DEFAULT_GAME);

  // 게임 레이어 데이터 로드 + 오늘 방문 기록 (스트릭)
  useEffect(() => {
    setGame(saveGame(withVisit(loadGame())));
  }, []);

  // URL의 ?ref= 초대 코드 캡처 (로그인 전에 방문해도 기억)
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref");
      if (code) window.localStorage.setItem("bias-market-ref", code);
    } catch {
      // ignore
    }
  }, []);

  // 로그인 후 저장해둔 초대 코드 적용 (서버가 신규 유저인지 검증)
  useEffect(() => {
    if (!loggedIn || !hydrated) return;
    let code: string | null = null;
    try {
      code = window.localStorage.getItem("bias-market-ref");
      if (code) window.localStorage.removeItem("bias-market-ref");
    } catch {
      // ignore
    }
    if (!code) return;
    sendJSON("/api/referral", { code })
      .then((d) => {
        if (d?.ok) showToast("success", t("ref.applied"));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, hydrated]);

  const recordShareCopy = useCallback(() => {
    setGame((g) => updateShareStats(g));
  }, []);

  const markBadgeEarned = useCallback((id: string) => {
    setGame((g) => unlockBadge(g, id));
  }, []);

  const showToast = useCallback((type: ToastMsg["type"], text: string) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, type, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAppState();
      setState((s) => ({
        ...s,
        markets: data.markets as Record<string, MarketState>,
        balance: data.user?.balance ?? 0,
        xp: data.user?.xp ?? 0,
        lastRewardDate: data.user?.lastRewardDate ?? null,
        holdings: (data.holdings ?? {}) as Record<string, Holding>,
        favorites: (data.favorites ?? []) as string[],
        trades: (data.trades ?? []) as Trade[],
      }));
      setIsAdmin(data.user?.isAdmin === true);
      setUserName(data.user?.name ?? null);
      setUserImage(data.user?.image ?? null);
      setRefCode(data.user?.refCode ?? null);
      setRefCount(data.user?.refCount ?? 0);
      setHasReferrer(data.user?.hasReferrer === true);
      setHydrated(true);
    } catch {
      // server unreachable — keep showing current data
    }
  }, []);

  // Load on mount and whenever auth status changes; light polling so
  // other fans' trades show up (shared market).
  useEffect(() => {
    if (status === "loading") return;
    refresh();
  }, [refresh, status]);

  useEffect(() => {
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  const applyTradeResponse = useCallback(
    (groupId: string, data: any) => {
      setState((s) => {
        const holdings = { ...s.holdings };
        if (data.holding) holdings[groupId] = data.holding as Holding;
        else delete holdings[groupId];
        return {
          ...s,
          balance: data.balance ?? s.balance,
          xp: data.xp ?? s.xp,
          holdings,
          markets: { ...s.markets, [groupId]: data.market as MarketState },
          trades: [data.trade as Trade, ...s.trades].slice(0, 200),
        };
      });
      // 첫 거래 초대 보상 알림
      if (typeof data.refBonus === "number" && data.refBonus > 0) {
        showToast("success", t("ok.refBonus", { n: fmtInt(data.refBonus) }));
      }
    },
    [showToast, t]
  );

  const buy = useCallback(
    async (groupId: string, fanIn: number): Promise<TradeResult> => {
      if (!loggedIn) return { ok: false, error: t("err.loginTrade") };
      try {
        const data = await createTrade({ groupId, side: "buy", amount: fanIn });
        if (!data.ok) return { ok: false, error: data.error ?? t("err.buyFail") };
        applyTradeResponse(groupId, data);
        return { ok: true, trade: data.trade as Trade };
      } catch {
        return { ok: false, error: t("err.network") };
      }
    },
    [loggedIn, applyTradeResponse, t]
  );

  const sell = useCallback(
    async (groupId: string, sharesIn: number): Promise<TradeResult> => {
      if (!loggedIn) return { ok: false, error: t("err.loginTrade") };
      try {
        const data = await createTrade({ groupId, side: "sell", amount: sharesIn });
        if (!data.ok) return { ok: false, error: data.error ?? t("err.sellFail") };
        applyTradeResponse(groupId, data);
        return { ok: true, trade: data.trade as Trade };
      } catch {
        return { ok: false, error: t("err.network") };
      }
    },
    [loggedIn, applyTradeResponse, t]
  );

  const toggleFavorite = useCallback(
    async (groupId: string) => {
      if (!loggedIn) {
        showToast("info", t("err.favLogin"));
        return;
      }
      // optimistic update
      setState((s) => ({
        ...s,
        favorites: s.favorites.includes(groupId)
          ? s.favorites.filter((id) => id !== groupId)
          : [...s.favorites, groupId],
      }));
      try {
        const data = await updateFavorite(groupId);
        if (data.ok) setState((s) => ({ ...s, favorites: data.favorites }));
      } catch {
        // next refresh will reconcile
      }
    },
    [loggedIn, showToast, t]
  );

  const canClaimReward = loggedIn && state.lastRewardDate !== todayString();

  const claimDailyReward = useCallback(async (): Promise<ClaimResult> => {
    if (!loggedIn) return { ok: false, error: t("err.loginReward") };
    try {
      const data = await sendJSON("/api/reward");
      if (!data.ok) return { ok: false, error: data.error ?? t("err.rewardDone") };
      setState((s) => ({
        ...s,
        balance: data.balance,
        xp: data.xp,
        lastRewardDate: data.lastRewardDate,
      }));
      return { ok: true };
    } catch {
      return { ok: false, error: t("err.network") };
    }
  }, [loggedIn, t]);

  const updateName = useCallback(
    async (name: string): Promise<ClaimResult> => {
      if (!loggedIn) return { ok: false, error: t("err.loginRequired") };
      try {
        const data = await sendJSON("/api/profile", { name }, "PATCH");
        if (!data.ok) return { ok: false, error: data.error ?? t("err.network") };
        setUserName(data.name);
        return { ok: true };
      } catch {
        return { ok: false, error: t("err.network") };
      }
    },
    [loggedIn, t]
  );

  const updateAvatar = useCallback(
    async (avatar: number): Promise<ClaimResult> => {
      if (!loggedIn) return { ok: false, error: t("err.loginRequired") };
      try {
        const data = await sendJSON("/api/profile", { avatar }, "PATCH");
        if (!data.ok) return { ok: false, error: data.error ?? t("err.network") };
        setUserImage(data.image ?? null);
        return { ok: true };
      } catch {
        return { ok: false, error: t("err.network") };
      }
    },
    [loggedIn, t]
  );

  const priceOf = useCallback(
    (groupId: string) => {
      const m = state.markets[groupId];
      return m ? spotPrice(m) : 0;
    },
    [state.markets]
  );

  const { portfolioValue, totalCost, holdingCount } = useMemo(() => {
    let value = 0;
    let cost = 0;
    let count = 0;
    for (const [gid, h] of Object.entries(state.holdings)) {
      const m = state.markets[gid];
      if (!m || h.shares <= 0) continue;
      value += h.shares * spotPrice(m);
      cost += h.cost;
      count++;
    }
    return { portfolioValue: value, totalCost: cost, holdingCount: count };
  }, [state.holdings, state.markets]);

  const totalPnl = portfolioValue - totalCost;
  const level = Math.floor(state.xp / XP_PER_LEVEL) + 1;

  const value: StoreValue = {
    state, hydrated, loggedIn, isAdmin, userName, userImage, updateName, updateAvatar,
    game, recordShareCopy, markBadgeEarned, refCode, refCount, hasReferrer,
    toasts, showToast, refresh,
    buy, sell, toggleFavorite, claimDailyReward, canClaimReward,
    priceOf, portfolioValue, totalCost, totalPnl, holdingCount,
    level,
    levelTitle: titleFor(level, t),
    xpInLevel: state.xp % XP_PER_LEVEL,
    xpPerLevel: XP_PER_LEVEL,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
