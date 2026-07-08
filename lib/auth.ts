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
            update: {
              name: token.name ?? undefined,
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
