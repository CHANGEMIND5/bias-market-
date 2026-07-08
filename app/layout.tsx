import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bias Market — K-pop 팬덤 트레이딩 시뮬레이터",
  description:
    "가상 화폐 Fan$로 최애 그룹의 Fan Shares를 사고팔며 팬덤 랭킹을 밀어올리는 비공식 팬메이드 시뮬레이터. 실제 금전적 가치 없음.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  );
}
