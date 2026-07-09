"use client";

import { LANGS, useLang } from "@/lib/i18n";

/** 언어 선택 버튼 — 클릭 즉시 전환, localStorage에 저장 */
export default function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5 w-fit">
      <span className="px-1 text-xs text-gray-300" aria-hidden>
        🌐
      </span>
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${
            lang === l.code
              ? "bg-gray-900 text-white"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {compact ? l.code.toUpperCase() : l.label}
        </button>
      ))}
    </div>
  );
}
