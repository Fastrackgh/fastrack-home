'use client';

import { useCallback, useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { feesApi, type AcademicContext, type Discount, type FeeType, type Page } from './api';
import { ConfirmModal } from './ConfirmModal';
import { DiscountModal } from './DiscountModal';
import { discountLabel, DiscountsTab, type DiscountFilters } from './DiscountsTab';

/** The Discounts tab: loads while `active`, and owns its filters and forms. */
export function DiscountsPanel({
  active,
  reloadKey,
  terms,
  currentTermId,
  studentOptions,
  feeTypes,
  canManage,
  onTotal,
}: {
  active: boolean;
  /** Changes when the page asks every tab to reload. */
  reloadKey: number;
  terms: AcademicContext[];
  currentTermId: string | null;
  studentOptions: { value: string; label: string }[];
  feeTypes: FeeType[];
  canManage: boolean;
  onTotal: (total: number) => void;
}) {
  const [filters, setFilters] = useState<DiscountFilters>({ studentId: null, page: 1 });
  const [discounts, setDiscounts] = useState<Page<Discount> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Discount | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await feesApi.listDiscounts(filters);
      setDiscounts(page);
      onTotal(page.total);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the discounts.'));
    } finally {
      setLoading(false);
    }
  }, [filters, onTotal]);

  useEffect(() => {
    if (active) load();
  }, [active, load, reloadKey]);

  return (
    <>
      <DiscountsTab
        discounts={discounts?.items ?? []}
        total={discounts?.total ?? 0}
        loading={loading}
        error={error}
        onRetry={load}
        filters={filters}
        onFiltersChange={setFilters}
        studentOptions={studentOptions}
        onAdd={canManage ? () => setAdding(true) : undefined}
        onRemove={canManage ? setRemoving : undefined}
      />

      {adding && (
        <DiscountModal
          studentOptions={studentOptions}
          feeTypes={feeTypes}
          terms={terms}
          initialTermId={currentTermId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {removing && (
        <ConfirmModal
          title="Remove this discount?"
          confirmLabel="Remove discount"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await feesApi.deleteDiscount(removing.id);
            notifications.show({
              title: 'Discount removed',
              message: removing.studentName,
              color: 'green',
            });
            load();
          }}
        >
          {removing.studentName ?? 'The student'} will no longer get {discountLabel(removing)} off{' '}
          {removing.feeTypeName ?? 'the whole bill'}. Invoices already generated are not changed.
        </ConfirmModal>
      )}
    </>
  );
}
