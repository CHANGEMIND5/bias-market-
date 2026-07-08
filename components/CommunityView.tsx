"use client";

const POSTS = [
  {
    author: "army_forever", emblem: ["#a78bfa", "#f0abfc"],
    time: "5분 전", body: "BTS 팬덤 가치 다시 1위 탈환 가자 💜 오늘도 Fan$ 전부 투입했다",
    likes: 128, comments: 34,
  },
  {
    author: "dive_to_ive", emblem: ["#fca5a5", "#fcd34d"],
    time: "18분 전", body: "IVE 7일 +7.33% ㄷㄷ 컴백 버프 제대로네. DIVE 모여라 🔥",
    likes: 86, comments: 21,
  },
  {
    author: "stay_here", emblem: ["#f87171", "#111827"],
    time: "32분 전", body: "Stray Kids 조용히 모으는 중... 다음 주 랭킹 뒤집는다",
    likes: 74, comments: 18,
  },
  {
    author: "nswer_up", emblem: ["#c4b5fd", "#5eead4"],
    time: "1시간 전", body: "NMIXX 24h +4% 실화? 저평가 팬덤 발굴 완료 ✅",
    likes: 51, comments: 12,
  },
];

export default function CommunityView() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-5">
      <h2 className="text-lg font-bold">커뮤니티</h2>
      <p className="text-sm text-gray-500 mt-0.5">
        팬덤 트레이더들의 이야기 (MVP 미리보기 — 곧 오픈됩니다)
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {POSTS.map((p, i) => (
          <div key={i} className="rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full"
                style={{ background: `linear-gradient(135deg, ${p.emblem[0]}, ${p.emblem[1]})` }}
              />
              <div>
                <p className="text-sm font-semibold">{p.author}</p>
                <p className="text-[11px] text-gray-400">{p.time}</p>
              </div>
            </div>
            <p className="text-sm mt-3 leading-relaxed">{p.body}</p>
            <div className="flex gap-4 mt-3 text-xs text-gray-400">
              <span>🤍 {p.likes}</span>
              <span>💬 {p.comments}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
