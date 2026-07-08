import { Group } from "@/lib/types";

/** Abstract gradient circle emblem — no official logos or photos. */
export default function Emblem({
  group,
  size = 40,
}: {
  group: Group;
  size?: number;
}) {
  return (
    <div
      aria-hidden
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${group.gradient[0]}, ${group.gradient[1]})`,
        boxShadow: "inset 0 -2px 6px rgba(255,255,255,0.35), 0 1px 3px rgba(0,0,0,0.08)",
      }}
    />
  );
}
