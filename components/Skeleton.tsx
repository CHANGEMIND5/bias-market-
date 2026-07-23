"use client";

// 로딩 스켈레톤 — 데이터 대기 중 빈 화면 대신 부드러운 뼈대 표시.
export function CardSkeleton({ lines = 3, title = true }: { lines?: number; title?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5 animate-pulse">
      {title && <div className="h-4 w-1/3 bg-gray-200 rounded mb-3.5" />}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-100 rounded mb-2.5"
          style={{ width: `${88 - i * 14}%` }}
        />
      ))}
    </div>
  );
}
