import "./globals.css";
import type { Metadata, Viewport } from "next";

import { AppShell } from "../components/layout/AppShell";
import Chatbot from "../components/Chatbot";
import { PWARegister } from "../components/layout/PWARegister";

export const metadata: Metadata = {
  title: "Vodacom ERP",
  description: "Enterprise Resource Planning system for Vodacom",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vodacom ERP",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#020d15",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-vodacom-50 text-gray-900 min-h-screen">
        <AppShell>
          {children}
        </AppShell>
        <Chatbot />
        <PWARegister />
      </body>
    </html>
  );
}

