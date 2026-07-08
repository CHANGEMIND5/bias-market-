/**
 * 운영자 판별 — .env / Vercel 환경변수 ADMIN_EMAILS에
 * 쉼표로 구분한 구글 로그인 이메일을 넣으세요.
 * 예: ADMIN_EMAILS="me@gmail.com,friend@gmail.com"
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}
