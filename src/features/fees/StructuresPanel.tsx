'use client';

import { useCallback, useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { termOption, type TermInYear } from '@/features/school-setup/api';
import { feesApi, type FeeStructure, type FeeType, type Page } from './api';
import { ConfirmModal } from './ConfirmModal';
import { EditFeeStructureModal } from './EditFeeStructureModal';
import { FeeStructureModal } from './FeeStructureModal';
import { formatGhs } from './money';

import { StructuresTab, type FeeStructureFilters } from './StructuresTab';

/** The Fee Structures tab: loads while `active`, and owns its filters and forms. */
export function StructuresPanel({
  active,
  reloadKey,
  terms,
  currentTermId,
  classOptions,
  feeTypes,
  canManage,
  onTotal,
}: {
  active: boolean;
  /** Changes when the page asks every tab to reload. */
  reloadKey: number;
  terms: TermInYear[];
  currentTermId: string | null;
  classOptions: { value: string; label: string }[];
  feeTypes: FeeType[];
  canManage: boolean;
  onTotal: (total: number) => void;
}) {
  const [filters, setFilters] = useState<FeeStructureFilters>({
    termId: currentTermId,
    classId: null,
    page: 1,
  });
  const [structures, setStructures] = useState<Page<FeeStructure> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [removing, setRemoving] = useState<FeeStructure | null>(null);

  // The current term usually loads after this panel mounts; open on it once known.
  useEffect(() => {
    if (currentTermId) setFilters((f) => (f.termId ? f : { ...f, termId: currentTermId }));
  }, [currentTermId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await feesApi.listFeeStructures(filters);
      setStructures(page);
      onTotal(page.total);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the fee structures.'));
    } finally {
      setLoading(false);
    }
  }, [filters, onTotal]);

  useEffect(() => {
    if (active) load();
  }, [active, load, reloadKey]);

  const termOptions = terms.map(termOption);

  return (
    <>
      <StructuresTab
        structures={structures?.items ?? []}
        total={structures?.total ?? 0}
        loading={loading}
        error={error}
        onRetry={load}
        filters={filters}
        onFiltersChange={setFilters}
        termOptions={termOptions}
        classOptions={classOptions}
        onAdd={canManage ? () => setAdding(true) : undefined}
        onEdit={canManage ? setEditing : undefined}
        onRemove={canManage ? setRemoving : undefined}
      />

      {adding && (
        <FeeStructureModal
          terms={terms}
          initialTermId={filters.termId ?? currentTermId}
          classOptions={classOptions}
          feeTypes={feeTypes}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {editing && (
        <EditFeeStructureModal
          structure={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {removing && (
        <ConfirmModal
          title="Remove this fee?"
          confirmLabel="Remove fee"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await feesApi.deleteFeeStructure(removing.id);
            notifications.show({
              title: 'Fee removed',
              message: removing.feeTypeName,
              color: 'green',
            });
            load();
          }}
        >
          {removing.feeTypeName} ({formatGhs(removing.amount)}) will no longer be billed to{' '}
          {removing.className ?? 'this class'} for {removing.termLabel ?? 'this term'}. Invoices
          already generated are not changed.
        </ConfirmModal>
      )}
    </>
  );
}
