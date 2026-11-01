import { Suspense } from 'react';
import { MarkGridPage } from '@/features/results/MarkGridPage';

// useSearchParams needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <MarkGridPage />
    </Suspense>
  );
}
