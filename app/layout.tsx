import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

const SITE_URL = process.env.NEXTAUTH_URL || "https://bias-market.vercel.app";
const TITLE = "Bias Market — K-pop 팬덤 트레이딩 시뮬레이터";
const DESC =
  "가상 화폐 Fan$로 최애 그룹의 Fan Shares를 사고팔며 팬덤 랭킹을 밀어올리는 비공식 팬메이드 시뮬레이터. 실제 금전적 가치 없음.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  applicationName: "Bias Market",
  openGraph: {
    type: "website",
    siteName: "Bias Market",
    title: TITLE,
    description: DESC,
    url: SITE_URL,
    locale: "ko_KR",
    alternateLocale: ["en_US", "es_ES"],
    // /opengraph-image.tsx 가 자동으로 og:image로 연결됨
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
