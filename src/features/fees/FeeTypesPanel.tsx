'use client';

import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';
import { feesApi, type FeeType } from './api';
import { FeeTypeModal } from './FeeTypeModal';
import { FeeTypesTab } from './FeeTypesTab';

/**
 * The Fee Types tab. The page owns the list, since fee structure and
 * discount forms need it too; `onChanged` asks the page to reload it.
 */
export function FeeTypesPanel({
  feeTypes,
  loading,
  error,
  onRetry,
  canManage,
  onChanged,
}: {
  feeTypes: FeeType[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  canManage: boolean;
  onChanged: () => void;
}) {
  // undefined: closed; null: adding; a fee type: editing it.
  const [editing, setEditing] = useState<FeeType | null | undefined>(undefined);

  const addDefaults = async () => {
    try {
      await feesApi.addDefaultFeeTypes();
      onChanged();
    } catch (err) {
      notifications.show({
        title: 'Could not add the standard fee types',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    }
  };

  return (
    <>
      <FeeTypesTab
        feeTypes={feeTypes}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onAdd={canManage ? () => setEditing(null) : undefined}
        onEdit={canManage ? setEditing : undefined}
        onAddDefaults={canManage ? addDefaults : undefined}
      />
      {editing !== undefined && (
        <FeeTypeModal
          feeType={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            onChanged();
          }}
        />
      )}
    </>
  );
}
