import PrivacyContent from "@/components/PrivacyContent";

export const metadata = {
  title: "개인정보처리방침 · Privacy Policy — Bias Market",
};

export default function PrivacyPage() {
  // 문의처: 환경변수 ADMIN_EMAILS의 첫 번째 이메일 사용
  const contact =
    (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim() ||
    "운영자 (커뮤니티 공지 참고)";
  return <PrivacyContent contact={contact} />;
}
