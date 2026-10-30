import React from 'react';
import type { Metadata } from 'next';
import { ServiceWorkerRegistrar } from '@/features/workspace/pwa/ServiceWorkerRegistrar';
import { AuthProvider } from '@/lib/auth';
import { OfflineSession } from '@/lib/offline/OfflineSession';

export const metadata: Metadata = {
  // Installable, and usable offline; the manifest's scope keeps the app inside /school-admin.
  manifest: '/school-app/manifest.webmanifest',
  applicationName: 'Fastrack School',
  appleWebApp: { capable: true, title: 'Fastrack', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/school-app/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/school-app/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export default function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OfflineSession />
      <ServiceWorkerRegistrar />
      {children}
    </AuthProvider>
  );
}
