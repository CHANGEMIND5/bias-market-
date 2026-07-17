import TermsContent from "@/components/TermsContent";

export const metadata = {
  title: "이용약관 · Terms of Service — Bias Market",
};

export default function TermsPage() {
  const contact =
    (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim() ||
    "운영자 (커뮤니티 공지 참고)";
  return <TermsContent contact={contact} />;
}
