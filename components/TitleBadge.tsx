"use client";

// 유저 칭호(시즌 배지) 표시 — 글/댓글 작성자 이름 옆에.
import { useLang } from "@/lib/i18n";
import { parseTitleCode } from "@/lib/loungeShared";
import { GROUP_MAP } from "@/lib/mockData";

export default function TitleBadge({ code }: { code?: string | null }) {
  const { t } = useLang();
  const p = parseTitleCode(code);
  if (!p) return null;
  const text =
    p.kind === "G"
      ? `👑 ${p.seasonKey} ${GROUP_MAP[p.groupId]?.name ?? p.groupId} ${t("season.groupTop")}`
      : `🏅 ${p.seasonKey} ${t("season.champion", { n: p.rank })}`;
  return (
    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100 text-[10px] font-semibold text-amber-700 align-middle">
      {text}
    </span>
  );
}
