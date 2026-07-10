import { GROUPS } from "./mockData";
import { Group } from "./types";

// ─────────────────────────────────────────────────────────────
// 그룹 검색 — displayName, koreanName, aliases, fandomName,
// koreanFandomName 전부에서 부분 일치 (hidden 제외)
// 예: "방탄"→BTS, "Bangtan"→BTS, "투바투"→TXT, "DIVE"→IVE, "BLINK"→BLACKPINK
// ─────────────────────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export function searchGroups(query: string, limit = 60): Group[] {
  const q = norm(query);
  if (!q) return [];
  const results: { g: Group; score: number }[] = [];

  for (const g of GROUPS) {
    if (g.seedStatus === "hidden") continue;
    const haystack = [
      g.name,
      g.koreanName,
      g.fandom !== "-" ? g.fandom : null,
      g.koreanFandomName,
      ...(g.aliases ?? []),
    ].filter(Boolean) as string[];

    let best = -1;
    for (const h of haystack) {
      const hn = norm(h);
      if (hn === q) best = Math.max(best, 3); // 정확 일치
      else if (hn.startsWith(q)) best = Math.max(best, 2);
      else if (hn.includes(q)) best = Math.max(best, 1);
    }
    if (best > 0) {
      // 기본 노출 그룹을 약간 우선
      results.push({ g, score: best * 10 + (g.defaultVisible !== false ? 1 : 0) });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.g);
}
