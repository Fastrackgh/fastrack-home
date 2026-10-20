import React from 'react';
import { WorkspaceProvider } from '@/features/dashboard';

/** Keeps the preview workspace state while moving between the overview and its areas. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
