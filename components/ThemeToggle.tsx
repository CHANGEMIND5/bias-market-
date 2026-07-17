"use client";

// 라이트/다크 테마 전환 버튼. 선택은 localStorage에 저장, 없으면 시스템 설정 따름.
// 실제 색 리맵은 app/globals.css의 .dark 블록에서 처리.
import { useEffect, useState } from "react";

const KEY = "bias-market-theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={dark ? "라이트 모드" : "다크 모드"}
      className={`w-8 h-8 grid place-items-center rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50 transition-colors ${className}`}
    >
      {/* 마운트 전에는 아이콘 고정(서버/클라 불일치 방지) */}
      {mounted ? (dark ? "☀️" : "🌙") : "🌙"}
    </button>
  );
}
