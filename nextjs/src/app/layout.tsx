import type { Metadata } from "next";
import "./globals.css";
import { AuthHeader } from '@/components/AuthHeader';

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
      <body className="min-h-full flex flex-col"><AuthHeader />{children}</body>
    </html>
  );
}
