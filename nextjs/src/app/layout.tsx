import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthHeader } from '@/components/AuthHeader';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { RegisterSW } from '@/components/pwa/RegisterSW';

export const viewport: Viewport = { themeColor: "#0f172a" };

export const metadata: Metadata = {
  title: "DevArena",
  description: "Build your skills and take on development challenges.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><OfflineBanner /><AuthHeader />{children}<InstallPrompt /><RegisterSW /></body>
    </html>
  );
}
