// 친구 초대 보상 처리 (서버 전용)
// 초대받은 유저의 "첫 거래" 성공 직후 호출 — 양쪽에 보상 지급
import { prisma } from "./db";
import {
  REF_INVITEE_BONUS,
  REF_INVITER_BONUS,
  REF_MAX_REWARDS,
} from "./mockData";

/**
 * 초대 보상 처리. 지급 조건이 아니면 0, 지급되면 invitee가 받은 보너스 금액 반환.
 * - invitee: +REF_INVITEE_BONUS (1회)
 * - inviter: +REF_INVITER_BONUS (refCount < REF_MAX_REWARDS일 때만, 카운트는 계속 증가)
 */
export async function processFirstTradeReferral(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.referredBy || user.refRewarded) return 0;

  const inviter = await prisma.user.findUnique({
    where: { id: user.referredBy },
  });

  const ops = [
    prisma.user.update({
      where: { id: userId },
      data: { refRewarded: true, balance: { increment: REF_INVITEE_BONUS } },
    }),
  ];
  if (inviter) {
    ops.push(
      prisma.user.update({
        where: { id: inviter.id },
        data: {
          refCount: { increment: 1 },
          ...(inviter.refCount < REF_MAX_REWARDS
            ? { balance: { increment: REF_INVITER_BONUS } }
            : {}),
        },
      })
    );
  }
  await prisma.$transaction(ops);
  return REF_INVITEE_BONUS;
}
