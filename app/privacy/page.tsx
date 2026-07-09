import Link from "next/link";
import { DISCLAIMER_KO } from "@/lib/mockData";

export const metadata = {
  title: "개인정보처리방침 — Bias Market",
};

// 문의처: 환경변수 ADMIN_EMAILS의 첫 번째 이메일 사용
const CONTACT =
  (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim() ||
  "커뮤니티의 운영자 공지";

const SECTIONS: [string, string[]][] = [
  [
    "1. 수집하는 정보",
    [
      "구글 로그인 시: 구글 계정의 이메일 주소, 이름, 프로필 사진, 계정 고유 식별자(ID)를 수집합니다.",
      "서비스 이용 과정에서: 가상 자산(Fan$, Fan Shares) 잔액·보유·거래 기록, 관심 목록, 닉네임·아바타 설정, 커뮤니티에 작성한 글·댓글·좋아요·신고 내역이 저장됩니다.",
      "브라우저에는 방문 스트릭, 공유 횟수, 뱃지 획득일 등 게임 진행용 데이터가 localStorage로 저장됩니다 (서버로 전송되지 않음).",
    ],
  ],
  [
    "2. 이용 목적",
    [
      "계정 식별 및 로그인 유지, 가상 팬덤 트레이딩 시뮬레이션 기능 제공(잔액·보유·랭킹 등), 커뮤니티 운영, 부정 이용 방지 목적으로만 사용합니다.",
      "수집한 정보를 광고, 마케팅, 제3자 판매에 사용하지 않습니다.",
    ],
  ],
  [
    "3. 처리 위탁 및 보관",
    [
      "로그인 인증: Google LLC (OAuth)",
      "서비스 호스팅: Vercel Inc.",
      "데이터베이스: Neon Inc. (클라우드 PostgreSQL)",
      "데이터는 위 인프라의 보안 정책에 따라 보관되며, 이 외의 제3자에게 제공되지 않습니다.",
    ],
  ],
  [
    "4. 보유 기간 및 삭제",
    [
      "수집한 정보는 회원 탈퇴(삭제 요청) 시까지 보관됩니다.",
      `계정 및 데이터 삭제를 원하시면 ${CONTACT}(으)로 요청해 주세요. 확인 후 지체 없이 계정과 관련 데이터를 삭제합니다.`,
    ],
  ],
  [
    "5. 이용자의 권리",
    [
      "이용자는 언제든지 자신의 정보에 대한 열람·정정(닉네임/아바타 변경)·삭제를 요청할 수 있습니다.",
      "구글 계정 설정(myaccount.google.com)에서 Bias Market의 접근 권한을 직접 철회할 수도 있습니다.",
    ],
  ],
  [
    "6. 쿠키 및 localStorage",
    [
      "로그인 세션 유지를 위한 필수 쿠키만 사용하며, 광고·추적용 쿠키는 사용하지 않습니다.",
      "게임 진행 데이터는 이용자의 브라우저 localStorage에만 저장되며 브라우저 데이터 삭제 시 함께 지워집니다.",
    ],
  ],
  [
    "7. 기타",
    [
      "본 서비스는 만 14세 미만 아동을 대상으로 하지 않습니다.",
      "본 방침이 변경되는 경우 이 페이지를 통해 고지합니다.",
      "시행일: 2026-07-09",
    ],
  ],
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[760px] p-4 lg:p-8">
        <Link
          href="/"
          className="text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          ← Bias Market으로 돌아가기
        </Link>

        <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-card p-6 lg:p-8">
          <h1 className="text-xl font-extrabold">개인정보처리방침</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Bias Market(이하 &ldquo;서비스&rdquo;)은 비공식 팬메이드 K-pop 팬덤
            배틀 시뮬레이터로, 서비스 제공에 필요한 최소한의 정보만 수집합니다.
          </p>

          {SECTIONS.map(([title, items]) => (
            <section key={title} className="mt-6">
              <h2 className="text-sm font-bold">{title}</h2>
              <ul className="mt-2 space-y-1.5">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="text-[13px] text-gray-600 leading-relaxed pl-3 relative before:content-['·'] before:absolute before:left-0 before:text-gray-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="mt-8 pt-4 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
            {DISCLAIMER_KO}
          </p>
        </div>
      </div>
    </div>
  );
}
