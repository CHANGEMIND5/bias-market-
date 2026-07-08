/** 프로필 아바타 프리셋 — DB의 image 필드에 "preset:N" 형태로 저장됩니다. */
export const AVATAR_PRESETS: [string, string][] = [
  ["#a78bfa", "#f0abfc"],
  ["#f9a8d4", "#93c5fd"],
  ["#67e8f9", "#818cf8"],
  ["#6ee7b7", "#a3e635"],
  ["#fda4af", "#fde68a"],
  ["#fcd34d", "#fb923c"],
  ["#c4b5fd", "#5eead4"],
  ["#fbcfe8", "#fdba74"],
  ["#7dd3fc", "#34d399"],
  ["#f472b6", "#7c3aed"],
  ["#fca5a5", "#fecdd3"],
  ["#94a3b8", "#e2e8f0"],
];

/** image 값이 프리셋이면 인덱스를, 아니면 null을 반환 */
export function presetIndex(image: string | null | undefined): number | null {
  if (!image || !image.startsWith("preset:")) return null;
  const n = parseInt(image.slice(7), 10);
  if (!Number.isInteger(n) || n < 0) return 0;
  return n % AVATAR_PRESETS.length;
}
