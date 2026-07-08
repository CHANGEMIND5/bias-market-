import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./db";
import { STARTING_BALANCE } from "./mockData";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // On first sign-in, create the game account (starting balance included)
    async jwt({ token, account }) {
      if (account && token.sub) {
        try {
          await prisma.user.upsert({
            where: { id: token.sub },
            // NOTE: name은 업데이트하지 않음 — 유저가 바꾼 닉네임을
            // 재로그인이 덮어쓰지 않도록 이미지(프로필 사진)만 갱신
            update: {
              image: token.picture ?? undefined,
            },
            create: {
              id: token.sub,
              email: token.email ?? `${token.sub}@no-email.local`,
              name: token.name,
              image: token.picture,
              balance: STARTING_BALANCE,
            },
          });
        } catch {
          // don't block login on a transient DB error; /api/state re-creates
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};
