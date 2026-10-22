import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthHeader } from '@/components/AuthHeader';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { RegisterSW } from '@/components/pwa/RegisterSW';
import { Suspense } from 'react';
import { AccountProvider } from '@/components/AccountProvider';
import { ApplicationShell } from '@/components/ApplicationShell';
import './(skills)/skills.css';

export const viewport: Viewport = { themeColor: '#090C11' };

export const metadata: Metadata = {
  title: 'DevArena',
  description: 'Build your skills and take on development challenges.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Suspense
          fallback={
            <div className="app-loading" role="status">
              Loading DevArena…
            </div>
          }
        >
          <AccountProvider>
            <OfflineBanner />
            <AuthHeader />
            <ApplicationShell>{children}</ApplicationShell>
            <InstallPrompt />
            <RegisterSW />
          </AccountProvider>
        </Suspense>
      </body>
    </html>
  );
}
