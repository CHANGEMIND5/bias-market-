# Bias Market — K-pop 팬덤 트레이딩 시뮬레이터 (MVP)

비공식 팬메이드 K-pop 팬덤 배틀 시뮬레이터입니다. 가상 화폐 **Fan$**로 가상 자산 **Fan Shares**를 사고팔며 최애 그룹의 팬덤 랭킹을 밀어올립니다. **실제 금전적 가치가 전혀 없으며**, 출금·판매·양도·교환이 불가능합니다. 블록체인/지갑/실물 결제 없음.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속. (프로덕션 빌드: `npm run build && npm start`)

`npm run dev`가 SQLite DB(`prisma/dev.db`)를 자동 생성합니다. 로그인 없이도 마켓 구경은 가능하지만, 거래·보상·관심목록은 Google 로그인이 필요합니다.

## 구글 로그인 설정 (최초 1회, 약 5분)

1. https://console.cloud.google.com 접속 → 상단에서 **새 프로젝트** 생성 (이름 예: bias-market)
2. 왼쪽 메뉴 **API 및 서비스 → OAuth 동의 화면** → User Type **외부(External)** 선택 → 앱 이름/이메일만 입력하고 저장 (나머지는 기본값)
3. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션**
   - 승인된 자바스크립트 원본: `http://localhost:3000`
   - 승인된 리디렉션 URI: `http://localhost:3000/api/auth/callback/google`
4. 생성된 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 프로젝트 루트의 `.env` 파일에 붙여넣기:

```
GOOGLE_CLIENT_ID="여기에_클라이언트_ID"
GOOGLE_CLIENT_SECRET="여기에_클라이언트_시크릿"
```

5. `npm run dev` 재시작 → 사이드바의 **Google로 로그인** 버튼 클릭

테스트 단계(게시 전) 앱은 OAuth 동의 화면의 **테스트 사용자**에 등록한 구글 계정만 로그인할 수 있어요. 친구를 초대하려면 테스트 사용자로 추가하거나 앱을 게시하세요.

## 인터넷 배포 (Vercel + Neon)

DB는 Postgres(Neon 무료 플랜)를 사용합니다. 순서:

1. **Neon DB 만들기** — https://neon.tech 가입(구글/GitHub 로그인 가능) → 새 프로젝트 생성 → 대시보드의 **Connection string**(`postgresql://...`) 복사 → `.env`의 `DATABASE_URL`에 붙여넣기 → `npm run dev`로 로컬 동작 확인 (스키마는 자동 적용)
2. **GitHub에 올리기** — https://github.com 가입 → 새 저장소 `bias-market` 생성(Private 가능) → 프로젝트 폴더에서:
   ```bash
   git init
   git add .
   git commit -m "Bias Market MVP"
   git branch -M main
   git remote add origin https://github.com/내아이디/bias-market.git
   git push -u origin main
   ```
   `.env`는 `.gitignore`에 있어서 올라가지 않습니다 (정상).
3. **Vercel 배포** — https://vercel.com 가입(GitHub 로그인) → **Add New → Project** → bias-market 저장소 Import → **Environment Variables**에 아래 5개 입력 → Deploy:
   - `DATABASE_URL` (Neon 주소)
   - `NEXTAUTH_URL` (일단 `https://프로젝트명.vercel.app` — 배포 후 실제 주소로 수정)
   - `NEXTAUTH_SECRET` (.env에 있는 값 또는 새로 생성)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
4. **구글 콘솔에 배포 주소 등록** — 사용자 인증 정보 → 내 OAuth 클라이언트 편집:
   - 승인된 자바스크립트 원본: `https://프로젝트명.vercel.app`
   - 승인된 리디렉션 URI: `https://프로젝트명.vercel.app/api/auth/callback/google`
5. **앱 게시** — OAuth 동의 화면에서 **앱 게시(Publish)** → 이제 아무 구글 계정이나 로그인 가능
6. `NEXTAUTH_URL`을 실제 배포 주소로 수정했으면 Vercel에서 **Redeploy**

## 주요 코드 위치

| 무엇을 바꾸고 싶다면 | 어디를 보세요 |
|---|---|
| AMM 스왑 로직 (constant product x·y=k, 매수/매도 견적, 가격 영향) | `lib/amm.ts` |
| 시작 잔액(10,000), 일일 보상(2,000), 수수료(0.3%), 최소 매수/매도, 초기 풀(1,000,000) | `lib/mockData.ts` 상단 상수 |
| 그룹 추가/삭제 (이름, 팬덤명, 그라데이션 색상, 시드 가격 등) | `lib/mockData.ts`의 `GROUPS` 배열 |
| DB 스키마 (User/Market/Holding/Trade/Favorite) | `prisma/schema.prisma` |
| 구글 로그인 설정 (NextAuth) | `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts` |
| 서버 API (상태 조회·매수/매도·일일 보상·관심 토글) | `app/api/state`, `app/api/trade`, `app/api/reward`, `app/api/favorite` |
| 클라이언트 전역 상태 (API 호출·낙관적 업데이트·토스트) | `lib/store.tsx` |
| 모의 차트 캔들 생성 | `lib/rng.ts` + `components/PriceChart.tsx` |

## 구조

```
app/page.tsx            메인 대시보드 (뷰 전환: 마켓/관심/포트폴리오/내역/커뮤니티/미션)
components/
  Sidebar.tsx           내비게이션 + 잔액 카드 + 레벨 카드 + 일일 보상
  MarketTable.tsx       전체 팬쉐어 랭킹 테이블 (관심/상승/하락/거래량/이름 필터)
  MarketDetail.tsx      선택 그룹 요약 (현재 가격, 팬덤 가치, 풀 가치, 거래량, 보유자)
  PriceChart.tsx        커스텀 SVG 캔들차트 + 거래량 바 (시간 탭)
  RecentTrades.tsx      최근 거래 (전체 / 내 거래)
  TradePanel.tsx        매수/매도 패널 (견적, 수수료, 가격 영향, 검증)
  GroupInfoCard.tsx     그룹 정보 카드
  PortfolioCard.tsx     포트폴리오 (보유 테이블 + 수익률/영향력)
  SharePreview.tsx      매수 후 공유 카드 미리보기 모달
lib/                    amm / mockData / storage / store / types / format / rng
```

## 메모

- 각 마켓은 스펙대로 1,000,000 Fan$ × 1,000,000 Fan Shares (가격 1 Fan$) 풀에서 출발하며, `seedPrice`는 "이미 일어난 팬 거래"를 시뮬레이션해 초기 가격을 다르게 보여줍니다. 모두 1로 바꾸면 전 그룹이 1 Fan$에서 시작합니다.
- 마켓(가격·풀·거래량)은 **모든 유저가 공유**하며 SQLite DB에 저장됩니다. 계정별 잔액·보유량·거래내역·관심목록도 DB에 저장되어 어느 기기에서 로그인해도 유지됩니다.
- 데이터 전체 초기화: 서버 끄고 `prisma/dev.db` 파일 삭제 후 `npm run dev`.
- 공식 로고/사진은 사용하지 않으며, 그룹 엠블럼은 CSS 그라데이션입니다. 그룹명은 텍스트 라벨로만 사용됩니다.

---

Bias Market is an unofficial fan-made K-pop fandom battle simulator. Fan$ and Fan Shares have no real-world value and cannot be withdrawn, sold, transferred, or exchanged. This service is not affiliated with, endorsed by, sponsored by, or officially connected to any artist, agency, label, or entertainment company.
