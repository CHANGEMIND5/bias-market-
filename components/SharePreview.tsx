"use client";

import { useMemo, useState } from "react";
import ShareCard, { ShareCardData, shareCardText } from "./ShareCard";
import { battleRanking } from "@/lib/battle";
import { computeBadges, fanInfluence, influenceTitle } from "@/lib/badges";
import { fmt, fmtInt, fmtPct } from "@/lib/format";
import { slugFor } from "@/lib/slug";
import { useStore } from "@/lib/store";
import { Group } from "@/lib/types";

type CardType = "buy" | "rank" | "influence" | "weekly";

const TABS: { type: CardType; label: string }[] = [
  { type: "buy", label: "매수 완료" },
  { type: "rank", label: "팬덤 순위" },
  { type: "influence", label: "내 영향력" },
  { type: "weekly", label: "주간 리그" },
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
  const [type, setType] = useState<CardType>("buy");

  const ranking = useMemo(() => battleRanking(state.markets), [state.markets]);
  const entry = ranking.find((e) => e.groupId === group.id);
  const rank = entry?.rank ?? 0;
  const pts = entry?.score ?? 0;

  // 팬덤 영향력 (프로필 카드와 동일 공식)
  const influence = useMemo(() => {
    const badges = computeBadges({
      state,
      portfolioValue,
      battleTopGroupId: ranking[0]?.groupId ?? null,
      game,
    });
    return fanInfluence({
      portfolioValue,
      tradeCount: state.trades.length,
      shareCount: game.shareCopies,
      battleParticipation: new Set(state.trades.map((t) => t.time.slice(0, 10)))
        .size,
      badgeCount: badges.filter((b) => b.unlocked).length,
    });
  }, [state, portfolioValue, game, ranking]);

  // 카드 타입별 내용 — 문구 수정은 여기서
  const card: ShareCardData = useMemo(() => {
    switch (type) {
      case "rank":
        return {
          title: `${group.name} 현재 팬덤 배틀 #${rank}`,
          lines: [
            `${group.name}가 ${pts.toFixed(1)} pts로 오늘의 팬덤 배틀 ${rank}위 ${rank === 1 ? "유지 중" : "도전 중"}`,
            "Bias Market에서 팬덤 랭킹을 밀어올리는 중.",
          ],
        };
      case "influence":
        return {
          title: `나는 ${group.name} ${influenceTitle(influence)}`,
          lines: [
            `Fan Influence ${fmtInt(influence)} pts`,
            "Bias Market에서 팬덤 영향력을 키우는 중.",
          ],
        };
      case "weekly":
        return {
          title: "이번 주 팬덤 리그",
          lines: [
            `${group.name} 현재 #${rank} · 참여자 ${fmtInt(entry?.holders ?? 0)}명`,
            `배틀 점수 ${pts.toFixed(1)} pts · 24h ${fmtPct(change24h)}`,
          ],
        };
      default:
        return {
          title: `${group.name} Fan Shares 매수 완료`,
          lines: [
            `내 최애 ${group.name}가 24h ${fmtPct(change24h)} ${change24h >= 0 ? "상승" : "변동"} 중`,
            "Bias Market에서 팬덤 랭킹을 밀어올리는 중.",
          ],
        };
    }
  }, [type, group.name, rank, pts, influence, change24h, entry?.holders]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(shareCardText(card));
      recordShareCopy();
      showToast("success", "공유 문구가 복사되었습니다.");
    } catch {
      showToast("error", "복사에 실패했습니다.");
    }
  };

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/market/${slugFor(group)}`;
      await navigator.clipboard.writeText(url);
      recordShareCopy();
      showToast("success", "링크가 복사되었습니다.");
    } catch {
      showToast("error", "복사에 실패했습니다.");
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
          <h3 className="text-base font-bold">자랑하기 🎉</h3>
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
          {TABS.map((t) => (
            <button
              key={t.type}
              onClick={() => setType(t.type)}
              className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                type === t.type
                  ? "bg-violet-600 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ShareCard group={group} data={card} />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={copyText}
            className="py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800"
          >
            문구 복사
          </button>
          <button
            onClick={copyLink}
            className="py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            링크 복사
          </button>
          <button
            disabled
            className="py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-xs font-semibold text-gray-300 cursor-not-allowed"
          >
            이미지 저장 (준비 중)
          </button>
        </div>
        <p className="mt-2 text-[10px] text-gray-300 text-center">
          Fan$ only. No real money.
        </p>
      </div>
    </div>
  );
}
