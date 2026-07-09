"use client";

import { SessionProvider } from "next-auth/react";
import Toasts from "@/components/Toast";
import { I18nProvider } from "@/lib/i18n";
import { StoreProvider } from "@/lib/store";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        <StoreProvider>
          {children}
          <Toasts />
        </StoreProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
