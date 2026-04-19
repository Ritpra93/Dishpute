import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dishpute — Dispute Assistant",
  description:
    "dishpute recovers delivery-platform error charges for restaurants. Scan, classify, submit, escalate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen text-foreground antialiased"
        style={{
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
