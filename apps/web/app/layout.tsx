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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
