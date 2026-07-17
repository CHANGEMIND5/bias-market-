"use client";

// 관리자 콘솔 공통 상단 네비 (전부 ADMIN_EMAILS 계정만 접근 가능)
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/economy", label: "이코노미" },
  { href: "/admin/activity", label: "거래 현황" },
  { href: "/admin/reports", label: "신고 관리" },
  { href: "/admin/groups", label: "그룹·라운지" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div className="flex gap-1.5 bg-white rounded-xl border border-gray-200 p-1 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              path === t.href
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← 홈</Link>
    </div>
  );
}
