import type { ReactNode } from "react";

// The real root layout lives in app/[locale]/layout.tsx (sets <html lang>).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
