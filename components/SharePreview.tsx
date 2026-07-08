"use client";

import Emblem from "./Emblem";
import { fmtPct } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Group } from "@/lib/types";

export default function SharePreview({
  group,
  change24h,
  onClose,
}: {
  group: Group;
  change24h: number;
  onClose: () => void;
}) {
  const { showToast } = useStore();

  const shareText = `내 최애 ${group.name}가 24h ${fmtPct(change24h)} ${
    change24h >= 0 ? "상승" : "변동"
  } 중.\nBias Market에서 팬덤 랭킹을 밀어올리는 중.\nFan$ only. No real money.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      showToast("success", "공유 문구를 복사했어요!");
    } catch {
      showToast("error", "복사에 실패했습니다.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">매수 완료! 자랑하기 🎉</h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Share card preview */}
        <div
          className="rounded-2xl p-5 text-white"
          style={{
            background: `linear-gradient(135deg, ${group.gradient[0]}, ${group.gradient[1]})`,
          }}
        >
          <div className="flex items-center gap-3 bg-white/15 backdrop-blur rounded-xl px-3 py-2 w-fit">
            <Emblem group={group} size={28} />
            <span className="font-bold text-sm drop-shadow">{group.name}</span>
          </div>
          <p className="mt-4 text-lg font-extrabold leading-snug drop-shadow">
            내 최애 {group.name}가
            <br />
            24h {fmtPct(change24h)} {change24h >= 0 ? "상승" : "변동"} 중 📈
          </p>
          <p className="mt-2 text-xs text-white/90 leading-relaxed">
            Bias Market에서 팬덤 랭킹을 밀어올리는 중.
          </p>
          <p className="mt-3 text-[10px] font-semibold tracking-wide text-white/80 uppercase">
            Fan$ only · No real money
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={copy}
            className="py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
          >
            문구 복사
          </button>
          <button
            onClick={onClose}
            className="py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
