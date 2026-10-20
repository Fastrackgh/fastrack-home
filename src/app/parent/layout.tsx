import React from 'react';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth';
import { ServiceWorkerRegistrar } from '@/features/parent';

export const metadata: Metadata = {
  title: { default: 'Fastrack Parent', template: '%s · Fastrack Parent' },
  description: "Your children's fees, reports and attendance from their school, in one place.",
  // Only the parent portal is installable; the manifest's scope keeps the app inside /parent.
  manifest: '/parent-app/manifest.webmanifest',
  applicationName: 'Fastrack Parent',
  appleWebApp: { capable: true, title: 'Fastrack', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/parent-app/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/parent-app/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ServiceWorkerRegistrar />
      {children}
    </AuthProvider>
  );
}
