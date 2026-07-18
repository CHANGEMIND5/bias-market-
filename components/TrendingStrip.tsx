"use client";

// 홈 상단 "지금 뜨는 그룹" 가로 스크롤 카드 — 24시간 변동 큰 순.
// 실제 마켓 데이터 기반, hidden/멤버/legacy 제외(VISIBLE_GROUPS).
import Emblem from "./Emblem";
import { spotPrice } from "@/lib/amm";
import { changeColor, fmt, fmtPct } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { VISIBLE_GROUPS } from "@/lib/mockData";
import { useStore } from "@/lib/store";

export default function TrendingStrip({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const { state } = useStore();
  const { t } = useLang();

  const items = VISIBLE_GROUPS.map((g) => {
    const m = state.markets[g.id];
    if (!m) return null;
    const price = spotPrice(m);
    const ch = m.baseline24h > 0 ? ((price - m.baseline24h) / m.baseline24h) * 100 : 0;
    return { g, price, ch };
  }).filter(Boolean) as { g: (typeof VISIBLE_GROUPS)[number]; price: number; ch: number }[];

  // 24h 변동폭이 큰 순으로 상위 8개 (전부 0%면 팬덤 가치순)
  const anyMove = items.some((x) => Math.abs(x.ch) > 0.001);
  const top = [...items]
    .sort((a, b) =>
      anyMove ? Math.abs(b.ch) - Math.abs(a.ch) : b.price - a.price
    )
    .slice(0, 8);
  if (top.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-bold mb-2">{t("home.trending")}</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {top.map(({ g, price, ch }) => (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            className="shrink-0 w-32 bg-white rounded-2xl border border-gray-200 shadow-card p-3 text-center hover:border-violet-200 transition-colors"
          >
            <div className="flex justify-center mb-1.5">
              <Emblem group={g} size={44} />
            </div>
            <p className="text-sm font-bold truncate">{g.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">Fan$ {fmt(price)}</p>
            <p className={`text-xs font-semibold ${changeColor(ch)}`}>
              {fmtPct(ch)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
