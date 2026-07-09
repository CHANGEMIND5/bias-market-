"use client";

import Emblem from "./Emblem";
import { Group } from "@/lib/types";

export interface ShareCardData {
  title: string;
  lines: string[];
}

export const SHARE_FOOTER = "FAN$ ONLY · NO REAL MONEY";

/** 공유 텍스트 생성 (문구 복사에 사용) */
export function shareCardText(data: ShareCardData): string {
  return `${data.title}\n${data.lines.join("\n")}\nFan$ only. No real money.`;
}

/** 재사용 가능한 공유 카드 미리보기 — 그라데이션 + 추상 엠블럼만 사용 */
export default function ShareCard({
  group,
  data,
}: {
  group: Group;
  data: ShareCardData;
}) {
  return (
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
      <p className="mt-4 text-lg font-extrabold leading-snug drop-shadow whitespace-pre-line">
        {data.title}
      </p>
      <div className="mt-2 space-y-1">
        {data.lines.map((line, i) => (
          <p key={i} className="text-xs text-white/90 leading-relaxed">
            {line}
          </p>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-semibold tracking-wide text-white/80">
        {SHARE_FOOTER}
      </p>
      <p className="text-[9px] text-white/60 mt-0.5">Bias Market</p>
    </div>
  );
}
