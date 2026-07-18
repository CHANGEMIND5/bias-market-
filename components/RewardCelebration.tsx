"use client";

// 출석 보상 축하 모달 — 체크인 성공 시 표시. (목업 08 Daily Reward 참고)
import { fmtInt } from "@/lib/format";
import { useLang } from "@/lib/i18n";

export default function RewardCelebration({
  fan,
  streak,
  onClose,
}: {
  fan: number;
  streak: number;
  onClose: () => void;
}) {
  const { t } = useLang();
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto w-20 h-20 rounded-3xl grid place-items-center text-4xl mb-3"
          style={{ background: "linear-gradient(135deg,#7c3aed,#d946ef)" }}
        >
          🎁
        </div>
        <p className="text-sm text-gray-500">{t("reward.earned")}</p>
        <p className="text-3xl font-extrabold text-violet-600 mt-1">
          Fan$ {fmtInt(fan)}
        </p>
        <p className="mt-2 text-xs font-semibold text-amber-500">
          🔥 {t("mis.streakNow", { n: streak })}
        </p>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors"
        >
          {t("reward.nice")}
        </button>
        <p className="mt-2 text-[11px] text-gray-400">{t("reward.comeback")}</p>
      </div>
    </div>
  );
}
