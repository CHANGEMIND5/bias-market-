"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import LangSwitcher from "@/components/LangSwitcher";
import LoungeView from "@/components/LoungeView";
import MarketTabs from "@/components/MarketTabs";
import { useLang } from "@/lib/i18n";
import { loungeEligible } from "@/lib/loungeShared";
import { resolveSlug } from "@/lib/slug";

export default function LoungePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const group = resolveSlug(slug);
  const { t } = useLang();

  if (!group || !loungeEligible(group)) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-8 text-center">
          <p className="text-lg font-bold">{t("detail.notFound")}</p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
          >
            {t("detail.back")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1200px] p-4 lg:p-6 flex flex-col gap-5 pb-24">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Bias Market" className="w-6 h-6" />
            <span className="text-sm font-extrabold tracking-tight hidden sm:inline">
              Bias Market
            </span>
          </Link>
          <LangSwitcher compact />
        </div>

        <MarketTabs slug={slug} active="lounge" />
        <LoungeView group={group} />
      </div>
    </div>
  );
}
