import React from 'react';
import { AuthProvider } from '@/lib/auth';

export default function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
