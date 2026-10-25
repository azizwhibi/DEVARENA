import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthHeader } from '@/components/AuthHeader';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { InstallProvider } from '@/components/pwa/InstallProvider';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { RegisterSW } from '@/components/pwa/RegisterSW';
import { OfflineAccountSync } from '@/components/pwa/OfflineAccountSync';
import { Suspense } from 'react';
import { AccountProvider } from '@/components/AccountProvider';
import { ApplicationShell } from '@/components/ApplicationShell';
import './(skills)/skills.css';

export const viewport: Viewport = { themeColor: '#090C11', viewportFit: 'cover' };

export const metadata: Metadata = {
  title: 'DevArena',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'DevArena' },
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
            <InstallProvider>
              <OfflineBanner />
              <AuthHeader />
              <ApplicationShell>{children}</ApplicationShell>
              <InstallPrompt />
              <RegisterSW />
              <OfflineAccountSync />
            </InstallProvider>
          </AccountProvider>
        </Suspense>
      </body>
    </html>
  );
}
