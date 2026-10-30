import React from 'react';
import { AuthProvider } from '@/lib/auth';
import { OfflineSession } from '@/lib/offline/OfflineSession';

export default function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OfflineSession />
      {children}
    </AuthProvider>
  );
}
