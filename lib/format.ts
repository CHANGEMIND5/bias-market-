export function fmt(n: number, digits = 2): string {
  return n.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

export function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}

export function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

export function fmtShares(n: number): string {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

export function changeColor(n: number): string {
  if (n > 0) return "text-up";
  if (n < 0) return "text-down";
  return "text-gray-500";
}

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
