"use client";

import { SessionProvider } from "next-auth/react";
import Toasts from "@/components/Toast";
import { StoreProvider } from "@/lib/store";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <StoreProvider>
        {children}
        <Toasts />
      </StoreProvider>
    </SessionProvider>
  );
}
