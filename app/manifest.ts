import type { MetadataRoute } from "next";

// PWA 매니페스트 — "홈 화면에 추가" 시 앱처럼 설치·전체화면 실행.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bias Market",
    short_name: "Bias Market",
    description:
      "가상 화폐 Fan$로 최애 그룹의 Fan Shares를 사고파는 K-pop 팬덤 시뮬레이터",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#7c3aed",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
