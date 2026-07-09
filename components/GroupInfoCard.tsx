"use client";

import { fmtInt } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { GROUP_MAP } from "@/lib/mockData";
import { Group } from "@/lib/types";

export default function GroupInfoCard({ group }: { group: Group }) {
  const { t } = useLang();
  const rows: [string, React.ReactNode][] = [
    ...(group.category === "member" && group.parentGroup
      ? ([[t("info.parent"), GROUP_MAP[group.parentGroup]?.name ?? "-"]] as [string, React.ReactNode][])
      : []),
    [t("info.debut"), group.debut],
    [t("info.fandom"), group.fandom],
    [t("info.platforms"), group.platforms],
    [t("info.followers"), fmtInt(group.followers)],
    [t("info.comeback"), group.lastComeback],
    [
      t("info.status"),
      <span key="s" className="inline-flex items-center gap-1.5 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-up inline-block" />
        {t("info.active")}
      </span>,
    ],
  ];

  return (
    <div>
      <h3 className="text-base font-bold mb-2">{t("info.title")}</h3>
      <dl className="text-sm divide-y divide-gray-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between items-center py-2.5">
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 flex items-center gap-2.5">
        <span className="text-lg" aria-hidden>🏆</span>
        <div>
          <p className="text-sm font-bold">{t("info.topBadge")}</p>
          <p className="text-[11px] text-gray-500">{t("info.topBadgeSub")}</p>
        </div>
      </div>
    </div>
  );
}
