"use client";

import { fmtInt } from "@/lib/format";
import { GROUP_MAP } from "@/lib/mockData";
import { Group } from "@/lib/types";

export default function GroupInfoCard({ group }: { group: Group }) {
  const rows: [string, React.ReactNode][] = [
    ...(group.category === "member" && group.parentGroup
      ? ([["소속 그룹", GROUP_MAP[group.parentGroup]?.name ?? "-"]] as [string, React.ReactNode][])
      : []),
    ["데뷔일", group.debut],
    ["팬덤명", group.fandom],
    ["플랫폼", group.platforms],
    ["팔로워", `${fmtInt(group.followers)}명`],
    ["최근 컴백", group.lastComeback],
    [
      "상태",
      <span key="s" className="inline-flex items-center gap-1.5 font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-up inline-block" />
        {group.status}
      </span>,
    ],
  ];

  return (
    <div>
      <h3 className="text-base font-bold mb-2">그룹 정보</h3>
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
          <p className="text-sm font-bold">팬덤 지수 상위 1%</p>
          <p className="text-[11px] text-gray-500">
            글로벌 영향력이 가장 높은 팬덤입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
