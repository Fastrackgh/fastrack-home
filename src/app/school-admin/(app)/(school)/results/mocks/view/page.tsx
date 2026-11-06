import { Suspense } from 'react';
import { MockResultsPage } from '@/features/results/MockResultsPage';

// useSearchParams needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <MockResultsPage />
    </Suspense>
  );
}
