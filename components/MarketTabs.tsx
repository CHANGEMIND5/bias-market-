"use client";

// 마켓 상세 상단 탭 — [마켓] [팬덤 라운지]. 두 화면이 같은 그룹의 두 부분처럼 보이게.
import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function MarketTabs({
  slug,
  active,
}: {
  slug: string;
  active: "market" | "lounge";
}) {
  const { t } = useLang();
  const base =
    "flex-1 sm:flex-none sm:px-6 py-2.5 rounded-xl text-sm font-bold text-center transition-colors";
  return (
    <div className="flex gap-1.5 bg-white rounded-2xl border border-gray-200 shadow-card p-1.5">
      <Link
        href={`/market/${slug}`}
        className={`${base} ${
          active === "market"
            ? "bg-gray-900 text-white"
            : "text-gray-500 hover:bg-gray-50"
        }`}
      >
        {t("tab.market")}
      </Link>
      <Link
        href={`/market/${slug}/lounge`}
        className={`${base} ${
          active === "lounge"
            ? "bg-violet-600 text-white"
            : "text-gray-500 hover:bg-gray-50"
        }`}
      >
        {t("tab.lounge")}
      </Link>
    </div>
  );
}
