'use client';

import React from 'react';
import { useActiveWard } from '../data/ActiveWardProvider';
import { schoolOffers, type SchoolModule } from '../domain/wards';
import type { Ward } from '../types';
import { NotOfferedState, NoWardState } from './EmptyState';
import { QueryView } from './QueryView';

/**
 * Renders `children` for the active child, or asks the parent to link one.
 * With `module`, a school that hasn't turned it on gets the "Not offered"
 * state at once, with no request.
 */
export function WithWard({
  children,
  module,
}: {
  children: (ward: Ward) => React.ReactNode;
  module?: SchoolModule;
}) {
  const { activeWard, query } = useActiveWard();
  return (
    <QueryView
      query={query}
      empty={{
        when: () => activeWard === null,
        render: () => (
          <NoWardState message="Add your child with the student code from the school. We will send a code to the guardian phone or email on file to confirm." />
        ),
      }}
    >
      {() => {
        if (!activeWard) return null;
        if (module && !schoolOffers(activeWard, module)) return <NotOfferedState />;
        return children(activeWard);
      }}
    </QueryView>
  );
}
