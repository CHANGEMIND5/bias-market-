import { ImageResponse } from "next/og";

// 공유·초대 링크 미리보기용 OG 이미지 (1200×630 PNG, 엣지에서 렌더).
// 카카오톡/트위터/슬랙 등에서 SVG 대신 확실히 렌더되도록 PNG로 생성.
export const runtime = "edge";
export const alt = "Bias Market — K-pop 팬덤 트레이딩 시뮬레이터";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c3aed 0%, #d946ef 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 60,
            }}
          >
            📈
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2 }}>
            Bias Market
          </div>
        </div>
        <div style={{ fontSize: 34, marginTop: 28, opacity: 0.95 }}>
          최애 그룹의 Fan Shares를 사고파는 K-pop 팬덤 시뮬레이터
        </div>
        <div style={{ fontSize: 22, marginTop: 40, opacity: 0.7 }}>
          Fan$ · Fan Shares — 실제 금전 가치 없음 · 비공식 팬메이드
        </div>
      </div>
    ),
    { ...size }
  );
}
