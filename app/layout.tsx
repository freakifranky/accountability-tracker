import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import PushNotificationInit from "@/components/push/PushNotificationInit";

export const metadata: Metadata = {
  title: "Commit — Accountability Tracker",
  description: "Track your goals with daily check-ins and streaks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e44332" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Commit" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-gray-50">
        <Navbar />
        <PushNotificationInit />
        <main>{children}</main>
      </body>
    </html>
  );
}
