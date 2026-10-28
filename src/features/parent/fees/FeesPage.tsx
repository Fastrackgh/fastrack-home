'use client';

import { useState } from 'react';
import { Tabs } from '@mantine/core';
import { Bus, Receipt, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { wardName } from '../domain/wards';
import type { Ward } from '../types';
import { PageTitle, WithWard } from '../ui';
import { BillsTab } from './BillsTab';
import { OptionalServices } from './OptionalServices';
import { PaymentsTab } from './PaymentsTab';

export function FeesPage() {
  return (
    <WithWard module="fees">{(ward) => <WardFees key={ward.studentId} ward={ward} />}</WithWard>
  );
}

function WardFees({ ward }: { ward: Ward }) {
  const { can } = useAuth();
  const [tab, setTab] = useState<string | null>('bills');
  return (
    <>
      <PageTitle title="Fees" subtitle={`Bills, payments and services for ${wardName(ward)}`} />
      <Tabs value={tab} onChange={setTab} color="fastrackRed" keepMounted={false}>
        <Tabs.List grow mb="md">
          <Tabs.Tab value="bills" leftSection={<Wallet size={16} />}>
            Bills
          </Tabs.Tab>
          {can('payments:read') && (
            <Tabs.Tab value="payments" leftSection={<Receipt size={16} />}>
              Payments
            </Tabs.Tab>
          )}
          <Tabs.Tab value="services" leftSection={<Bus size={16} />}>
            Services
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="bills">
          <BillsTab ward={ward} />
        </Tabs.Panel>
        <Tabs.Panel value="payments">
          <PaymentsTab ward={ward} />
        </Tabs.Panel>
        <Tabs.Panel value="services">
          <OptionalServices ward={ward} />
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
