"use client";

import Link from "next/link";
import StarterView from "@/components/StarterView";
import { useLang } from "@/lib/i18n";

export default function StarterPage() {
  const { t } = useLang();
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1100px] p-4 lg:p-6 flex flex-col gap-5 pb-24">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Bias Market" className="w-6 h-6" />
            <span className="text-sm font-extrabold tracking-tight">
              Bias Market
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-gray-400 hover:text-gray-600"
          >
            ← {t("detail.back")}
          </Link>
        </div>
        <StarterView />
      </div>
    </div>
  );
}
