/* eslint-disable no-console */
// ─────────────────────────────────────────────────────────────
// 프리베타 이코노미 리셋 — 명시적 수동 실행 전용
//
//   실행:  ALLOW_PREBETA_ECONOMY_RESET=true npm run reset:prebeta-economy
//
// 이 스크립트는 절대 자동으로 실행되지 않습니다:
//   - npm install / build / 배포 / 앱 시작 / prisma generate / seed 어디에도 연결 안 됨
//   - package.json의 "reset:prebeta-economy" 명령으로만 실행 가능
//   - 환경 변수 ALLOW_PREBETA_ECONOMY_RESET=true 없으면 즉시 종료
//   - PUBLIC_BETA_LAUNCHED=true 로 표시된 환경에서는 거부
//   - 실행 전 삭제 대상 요약을 출력하고 "RESET" 입력을 요구
//     (자동화가 필요하면 RESET_CONFIRM=yes)
//
// 삭제/리셋: 거래·보유·가격 이력·보상 원장·미션·출석·스타터·관심 목록,
//            유저 잔액(→10,000)·XP·영향력, 마켓 리저브(→v2 구조)
// 보존:      계정·닉네임·아바타·초대 코드·커뮤니티 글·공지·신고·설정,
//            큐레이션 그룹 DB·티어·노출 규칙·번역 (코드에 있음 — DB 무관)
//
// 선택: DELETE_TEST_USERS=true → ADMIN_EMAILS 외 계정 삭제 (관리자는 절대 삭제 안 함)
// ─────────────────────────────────────────────────────────────
import { createInterface } from "node:readline/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../lib/db";
import {
  ECONOMY_VERSION,
  INITIAL_POOL_SHARES,
  INITIAL_RESERVE_SHARES,
  num,
  TOTAL_FAN_SHARES,
} from "../lib/economy";
import { v2MarketInit } from "../lib/markets";
import { GROUPS, STARTING_BALANCE, VISIBLE_GROUPS } from "../lib/mockData";

// .env / .env.local 로드 (이미 설정된 값은 유지)
for (const file of [".env", ".env.local"]) {
  try {
    const txt = readFileSync(join(process.cwd(), file), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // 파일 없으면 무시
  }
}

const EPS = 0.01;

async function main() {
  console.log("━━━ Bias Market 프리베타 이코노미 리셋 ━━━\n");

  // ── 안전 가드 ──
  if (process.env.ALLOW_PREBETA_ECONOMY_RESET !== "true") {
    console.error(
      "❌ 중단: 환경 변수 ALLOW_PREBETA_ECONOMY_RESET=true 가 필요합니다.\n" +
        "   실행 예: ALLOW_PREBETA_ECONOMY_RESET=true npm run reset:prebeta-economy"
    );
    process.exit(1);
  }
  if (process.env.PUBLIC_BETA_LAUNCHED === "true") {
    console.error("❌ 중단: 공개 베타 시작 후 환경에서는 리셋할 수 없습니다.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("❌ 중단: DATABASE_URL 이 설정되어 있지 않습니다.");
    process.exit(1);
  }

  // ── 삭제 대상 요약 ──
  const [trades, points, holdings, favorites, ledger, missions, rewardStates,
    starterPfs, starterAllocs, starterOnb, users, markets] = await Promise.all([
    prisma.trade.count(),
    prisma.pricePoint.count(),
    prisma.holding.count(),
    prisma.favorite.count(),
    prisma.rewardLedger.count(),
    prisma.missionProgress.count(),
    prisma.userRewardState.count(),
    prisma.starterPortfolio.count(),
    prisma.starterPortfolioAllocation.count(),
    prisma.starterOnboardingProgress.count(),
    prisma.user.count(),
    prisma.market.count(),
  ]);

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const deleteTestUsers = process.env.DELETE_TEST_USERS === "true";

  console.log("삭제/리셋될 테스트 데이터:");
  console.log(`  · 거래 기록 (유저+시스템): ${trades}`);
  console.log(`  · 가격/캔들 이력:         ${points}`);
  console.log(`  · 보유 내역:              ${holdings}`);
  console.log(`  · 관심 목록:              ${favorites}`);
  console.log(`  · 보상 원장:              ${ledger}`);
  console.log(`  · 미션/출석 진행:          ${missions} + ${rewardStates}`);
  console.log(`  · 스타터 포트폴리오:       ${starterPfs} (배분 ${starterAllocs}, 온보딩 ${starterOnb})`);
  console.log(`  · 마켓 리저브 재초기화:    ${markets}개 → v2 (풀 600,000 / 준비금 400,000)`);
  console.log(`  · 계정 이코노미 리셋:      ${users}명 → Fan$ ${STARTING_BALANCE.toLocaleString()}, 보유 0`);
  if (deleteTestUsers) {
    console.log(`  · DELETE_TEST_USERS=true → 관리자(${adminEmails.length}명) 외 계정 삭제`);
  }
  console.log("\n보존: 계정(기본)·닉네임·아바타·초대 코드·커뮤니티 글/공지·그룹 DB·티어·노출 규칙·번역·관리자 설정");
  console.log("⚠️  실행 전 Neon 대시보드에서 브랜치/백업을 만들어 두는 것을 권장합니다.\n");

  // ── 확인 ──
  if (process.env.RESET_CONFIRM !== "yes") {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('계속하려면 "RESET" 을 입력하세요: ');
    rl.close();
    if (answer.trim() !== "RESET") {
      console.log("취소되었습니다. 아무것도 변경되지 않았습니다.");
      process.exit(0);
    }
  }

  console.log("\n[1/4] 테스트 이코노미 데이터 삭제 중...");
  const del = await prisma.$transaction([
    prisma.trade.deleteMany(),
    prisma.pricePoint.deleteMany(),
    prisma.holding.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.rewardLedger.deleteMany(),
    prisma.missionProgress.deleteMany(),
    prisma.userRewardState.deleteMany(),
    prisma.starterPortfolioAllocation.deleteMany(),
    prisma.starterPortfolio.deleteMany(),
    prisma.starterOnboardingProgress.deleteMany(),
  ]);
  console.log(`  삭제 완료 (${del.map((d) => d.count).join(", ")})`);

  if (deleteTestUsers) {
    console.log("[1b] 테스트 계정 삭제 중 (관리자 제외)...");
    const removed = await prisma.user.deleteMany({
      where: { email: { notIn: adminEmails.length ? adminEmails : ["__none__"] } },
    });
    console.log(`  삭제된 테스트 계정: ${removed.count}`);
  }

  console.log("[2/4] 보존 계정 이코노미 초기화 중...");
  await prisma.user.updateMany({
    data: {
      balance: STARTING_BALANCE,
      xp: 0,
      influence: 0,
      lastRewardDate: null,
      refRewarded: false,
      refCount: 0,
      referredBy: null,
    },
  });
  // 시작 Fan$ 10,000을 원장에 1건 기록 → 가입 보상 재지급 원천 차단
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const u of allUsers) {
    await prisma.rewardLedger.create({
      data: {
        userId: u.id,
        sourceKey: `signup-reward:${u.id}`,
        fan: STARTING_BALANCE,
        rewardType: "SIGNUP",
      },
    });
  }
  console.log(`  ${allUsers.length}명 → Fan$ ${STARTING_BALANCE.toLocaleString()}, 원장 기록 완료`);

  console.log("[3/4] 마켓 v2 재초기화 중 (티어 기반 시작가 유지)...");
  // 큐레이션 DB에 없는 잔류 마켓 제거
  const orphan = await prisma.market.deleteMany({
    where: { groupId: { notIn: GROUPS.map((g) => g.id) } },
  });
  if (orphan.count > 0) console.log(`  잔류 마켓 ${orphan.count}개 제거`);

  let initialized = 0;
  const errors: string[] = [];
  for (let i = 0; i < GROUPS.length; i += 50) {
    const chunk = GROUPS.slice(i, i + 50);
    await prisma.$transaction(
      chunk.map((g) => {
        const init = v2MarketInit(g);
        const { groupId, ...data } = init;
        return prisma.market.upsert({
          where: { groupId },
          update: data,
          create: init,
        });
      })
    );
    initialized += chunk.length;
    process.stdout.write(`  ${initialized}/${GROUPS.length}\r`);
  }
  console.log(`  마켓 ${initialized}개 초기화 완료 (economyVersion ${ECONOMY_VERSION})`);

  console.log("[4/4] 검증 중...");
  const [vMarkets, vHoldings, vUsers, heldAgg] = await Promise.all([
    prisma.market.findMany(),
    prisma.holding.count(),
    prisma.user.findMany({ select: { id: true, email: true, balance: true } }),
    prisma.holding.groupBy({ by: ["groupId"], _sum: { shares: true } }),
  ]);
  const heldMap = new Map(heldAgg.map((h: any) => [h.groupId, num(h._sum?.shares)]));

  for (const m of vMarkets) {
    const pool = num(m.shareReserve);
    const reserve = num(m.systemReserveShares);
    const held = heldMap.get(m.groupId) ?? 0;
    const total = pool + reserve + held;
    if (Math.abs(total - TOTAL_FAN_SHARES) > EPS)
      errors.push(`${m.groupId}: 총량 ${total} ≠ ${TOTAL_FAN_SHARES}`);
    if (Math.abs(pool - INITIAL_POOL_SHARES) > EPS)
      errors.push(`${m.groupId}: 풀 ${pool} ≠ ${INITIAL_POOL_SHARES}`);
    if (Math.abs(reserve - INITIAL_RESERVE_SHARES) > EPS)
      errors.push(`${m.groupId}: 준비금 ${reserve} ≠ ${INITIAL_RESERVE_SHARES}`);
    if (held !== 0) errors.push(`${m.groupId}: 유저 보유 ${held} ≠ 0`);
    if ((m.economyVersion ?? 1) !== ECONOMY_VERSION)
      errors.push(`${m.groupId}: economyVersion ${m.economyVersion}`);
  }
  if (vHoldings !== 0) errors.push(`보유 내역이 남아 있음: ${vHoldings}`);
  for (const u of vUsers) {
    if (Math.abs(u.balance - STARTING_BALANCE) > 1e-6)
      errors.push(`${u.email}: 잔액 ${u.balance} ≠ ${STARTING_BALANCE}`);
  }

  console.log("\n━━━ 리셋 리포트 ━━━");
  console.log(`초기화된 마켓:        ${vMarkets.length} (노출 그룹 ${VISIBLE_GROUPS.length})`);
  console.log(`보존된 계정:          ${vUsers.length} (전원 Fan$ ${STARTING_BALANCE.toLocaleString()})`);
  console.log(`삭제된 거래/가격 이력: ${trades} / ${points}`);
  console.log(`삭제된 보유/보상 기록: ${holdings} / ${ledger}`);
  console.log(`삭제된 스타터 기록:    ${starterPfs + starterAllocs + starterOnb}`);
  console.log(`공급 불변식:          풀 600,000 + 준비금 400,000 + 보유 0 = 1,000,000 ✓`);
  console.log("\n노출 마켓 시작가 (티어 기반):");
  for (const g of VISIBLE_GROUPS) {
    const m = vMarkets.find((x) => x.groupId === g.id);
    if (m) {
      console.log(
        `  ${(g.tier ?? "?").padEnd(6)} ${g.name.padEnd(22)} Fan$ ${num(m.initialPrice).toFixed(4)}  풀 ${num(m.shareReserve)}  준비금 ${num(m.systemReserveShares)}`
      );
    }
  }

  if (errors.length > 0) {
    console.error(`\n❌ 검증 실패 ${errors.length}건 — 스크립트를 다시 실행해 주세요:`);
    for (const e of errors.slice(0, 20)) console.error("  · " + e);
    process.exit(1);
  }
  console.log("\n✅ 프리베타 이코노미 리셋 완료. 시스템 봇은 다음 /api/state 호출부터 v2 마켓에서 재가동됩니다.");
}

main()
  .catch((e) => {
    console.error("❌ 리셋 실패 (부분 변경은 스크립트 재실행으로 정규화됩니다):", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
