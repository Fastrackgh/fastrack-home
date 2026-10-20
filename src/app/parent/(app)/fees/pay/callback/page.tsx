import { Suspense } from 'react';
import { PaymentCallback } from '@/features/parent';

export default function Page() {
  // The outcome is read from the query string the payment provider adds.
  return (
    <Suspense>
      <PaymentCallback />
    </Suspense>
  );
}
