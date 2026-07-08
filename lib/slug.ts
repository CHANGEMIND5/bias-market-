import { GROUPS } from "./mockData";
import { Group } from "./types";

/** "LE SSERAFIM" → "le-sserafim", "Stray Kids" → "stray-kids" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 종목의 URL 슬러그 (영문 이름은 하이픈 슬러그, 한글 이름 멤버는 id 사용) */
export function slugFor(g: Group): string {
  const s = slugify(g.name);
  return s.length > 0 ? s : g.id;
}

/** /market/[slug] 파라미터를 종목으로 해석 (슬러그 또는 id 둘 다 허용) */
export function resolveSlug(param: string): Group | null {
  const p = decodeURIComponent(param).toLowerCase();
  return (
    GROUPS.find((g) => slugFor(g) === p) ??
    GROUPS.find((g) => g.id === p) ??
    null
  );
}
