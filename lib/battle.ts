import { todayString } from "./format";
import { GROUPS } from "./mockData";
import { hashString, mulberry32 } from "./rng";
import { MarketState } from "./types";

// ─────────────────────────────────────────────────────────────
// 팬덤 배틀 점수 — 가중치는 여기서 수정
// ─────────────────────────────────────────────────────────────
export const BATTLE_WEIGHTS = {
  change: 0.35, // 24h 상승률
  volume: 0.3, // 24h 거래량
  holders: 0.2, // 보유자 수
  social: 0.15, // 공유/활동 점수 (아직 모의 값)
};

export interface BattleEntry {
  groupId: string;
  rank: number;
  score: number;
  ch24: number;
  volume: number;
  holders: number;
}

/** 전체 종목의 오늘 배틀 랭킹 (점수 내림차순, rank 포함) */
export function battleRanking(
  markets: Record<string, MarketState>
): BattleEntry[] {
  const rows = GROUPS.flatMap((g) => {
    const m = markets[g.id];
    if (!m) return [];
    const price = m.fanReserve / m.shareReserve;
    const ch24 =
      m.baseline24h > 0 ? ((price - m.baseline24h) / m.baseline24h) * 100 : 0;
    return [{ groupId: g.id, ch24, volume: m.volume24h, holders: m.holders }];
  });
  if (rows.length === 0) return [];

  const norm = (vals: number[]) => {
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    return (v: number) => (mx > mn ? (v - mn) / (mx - mn) : 0.5);
  };
  const nCh = norm(rows.map((r) => r.ch24));
  const nVol = norm(rows.map((r) => r.volume));
  const nHold = norm(rows.map((r) => r.holders));
  const day = todayString();

  return rows
    .map((r) => {
      // 공유/활동 점수: 아직 트래킹이 없어 날짜+그룹 시드 기반 모의 값
      const social = mulberry32(hashString(`${r.groupId}-${day}-social`))();
      const score =
        (BATTLE_WEIGHTS.change * nCh(r.ch24) +
          BATTLE_WEIGHTS.volume * nVol(r.volume) +
          BATTLE_WEIGHTS.holders * nHold(r.holders) +
          BATTLE_WEIGHTS.social * social) *
        100;
      return { ...r, score: Math.round(score * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}
