"use client";

import { useMemo, useState } from "react";
import ShareCard, { ShareCardData, shareCardText } from "./ShareCard";
import { battleRanking } from "@/lib/battle";
import { computeBadges, fanInfluence, influenceTitle } from "@/lib/badges";
import { fmt, fmtInt, fmtPct } from "@/lib/format";
import { TKey, useLang } from "@/lib/i18n";
import { slugFor } from "@/lib/slug";
import { useStore } from "@/lib/store";
import { Group } from "@/lib/types";

type CardType = "buy" | "rank" | "influence" | "weekly";

const TABS: { type: CardType; labelKey: TKey }[] = [
  { type: "buy", labelKey: "share.tabBuy" },
  { type: "rank", labelKey: "share.tabRank" },
  { type: "influence", labelKey: "share.tabInfluence" },
  { type: "weekly", labelKey: "share.tabWeekly" },
];

export default function SharePreview({
  group,
  change24h,
  onClose,
}: {
  group: Group;
  change24h: number;
  onClose: () => void;
}) {
  const { state, portfolioValue, game, showToast, recordShareCopy } = useStore();
  const { t } = useLang();
  const [type, setType] = useState<CardType>("buy");

  const ranking = useMemo(() => battleRanking(state.markets), [state.markets]);
  const entry = ranking.find((e) => e.groupId === group.id);
  const rank = entry?.rank ?? 0;
  const pts = entry?.score ?? 0;

  // 팬덤 영향력 (프로필 카드와 동일 공식)
  const influence = useMemo(() => {
    const badges = computeBadges(
      {
        state,
        portfolioValue,
        battleTopGroupId: ranking[0]?.groupId ?? null,
        game,
      },
      t
    );
    return fanInfluence({
      portfolioValue,
      tradeCount: state.trades.length,
      shareCount: game.shareCopies,
      battleParticipation: new Set(state.trades.map((t) => t.time.slice(0, 10)))
        .size,
      badgeCount: badges.filter((b) => b.unlocked).length,
    });
  }, [state, portfolioValue, game, ranking, t]);

  // 카드 타입별 내용 — 문구 수정은 lib/i18n.tsx의 share.* 키에서
  const card: ShareCardData = useMemo(() => {
    const name = group.name;
    switch (type) {
      case "rank":
        return {
          title: t("share.rankTitle", { name, rank }),
          lines: [
            t("share.rankLine", {
              name, rank,
              pts: pts.toFixed(1),
              status: rank === 1 ? t("share.holding1st") : t("share.challenging"),
            }),
            t("share.pushing"),
          ],
        };
      case "influence":
        return {
          title: t("share.inflTitle", { name, title: influenceTitle(influence, t) }),
          lines: [
            t("share.inflLine1", { pts: fmtInt(influence) }),
            t("share.inflLine2"),
          ],
        };
      case "weekly":
        return {
          title: t("share.weeklyTitle"),
          lines: [
            t("share.weeklyLine1", { name, rank, n: fmtInt(entry?.holders ?? 0) }),
            t("share.weeklyLine2", { pts: pts.toFixed(1), pct: fmtPct(change24h) }),
          ],
        };
      default:
        return {
          title: t("share.buyTitle", { name }),
          lines: [
            t("share.buyLine1", {
              name,
              pct: fmtPct(change24h),
              dir: change24h >= 0 ? t("share.up") : t("share.moving"),
            }),
            t("share.pushing"),
          ],
        };
    }
  }, [type, group.name, rank, pts, influence, change24h, entry?.holders, t]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(shareCardText(card));
      recordShareCopy();
      showToast("success", t("share.copiedText"));
    } catch {
      showToast("error", t("share.copyFail"));
    }
  };

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/market/${slugFor(group)}`;
      await navigator.clipboard.writeText(url);
      recordShareCopy();
      showToast("success", t("share.copiedLink"));
    } catch {
      showToast("error", t("share.copyFail"));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold">{t("share.title")}</h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Card type tabs */}
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-gray-200 p-1 mb-3">
          {TABS.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setType(tab.type)}
              className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                type === tab.type
                  ? "bg-violet-600 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <ShareCard group={group} data={card} />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={copyText}
            className="py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800"
          >
            {t("share.copyText")}
          </button>
          <button
            onClick={copyLink}
            className="py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            {t("share.copyLink")}
          </button>
          <button
            disabled
            className="py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-xs font-semibold text-gray-300 cursor-not-allowed"
          >
            {t("share.saveImage")}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-gray-300 text-center">
          Fan$ only. No real money.
        </p>
      </div>
    </div>
  );
}
