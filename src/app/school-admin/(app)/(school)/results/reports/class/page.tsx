import { Suspense } from 'react';
import { ClassReportPage } from '@/features/results/ClassReportPage';

// useSearchParams needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <ClassReportPage />
    </Suspense>
  );
}
