"use client";

// 첫 방문 환영 온보딩 — 신규 유저에게 앱을 3단계로 소개.
// localStorage로 1회만 표시. 마지막 단계에서 스타터 포트폴리오/로그인으로 유도.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { TKey, useLang } from "@/lib/i18n";
import { useStore } from "@/lib/store";

const KEY = "bias-market-onboarded";

const SLIDES: { icon: string; title: TKey; body: TKey }[] = [
  { icon: "👋", title: "wel.s1title", body: "wel.s1body" },
  { icon: "📊", title: "wel.s2title", body: "wel.s2body" },
  { icon: "🎁", title: "wel.s3title", body: "wel.s3body" },
];

export default function Onboarding() {
  const { hydrated, loggedIn } = useStore();
  const { t } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      // ignore
    }
  }, [hydrated]);

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  const finish = () => {
    close();
    if (loggedIn) router.push("/starter");
    else signIn("google");
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center shadow-xl">
        <div
          className="mx-auto w-20 h-20 rounded-3xl grid place-items-center text-4xl mb-4"
          style={{ background: "linear-gradient(135deg,#7c3aed,#d946ef)" }}
        >
          {slide.icon}
        </div>
        <h2 className="text-lg font-extrabold">{t(slide.title)}</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">{t(slide.body)}</p>

        {/* 인디케이터 */}
        <div className="flex justify-center gap-1.5 mt-5">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-5 bg-violet-600" : "w-1.5 bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {last ? (
            <button
              onClick={finish}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors"
            >
              {loggedIn ? t("wel.cta") : t("wel.ctaLogin")}
            </button>
          ) : (
            <button
              onClick={() => setI((v) => v + 1)}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors"
            >
              {t("wel.next")}
            </button>
          )}
          <button
            onClick={close}
            className="text-xs text-gray-400 hover:text-gray-600 py-1"
          >
            {t("wel.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
