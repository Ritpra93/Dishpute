import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Counter — Dispute Assistant",
  description:
    "Counter recovers delivery-platform error charges for restaurants. Scan, classify, submit, escalate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
