"use client";

import { useStore } from "@/lib/store";

export default function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white max-w-xs animate-[fadeIn_0.15s_ease-out] ${
            t.type === "success"
              ? "bg-up"
              : t.type === "error"
              ? "bg-down"
              : "bg-gray-800"
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
