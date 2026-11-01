'use client';

import { useState } from 'react';
import { Alert, Stack, Text, Title } from '@mantine/core';
import { useNetwork } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { AlertCircle, Bus, Info } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import { parentApi } from '../api';
import { useOptionalFeeRequests, useOptionalServices } from '../data/queries';
import { decidedRequests } from '../domain/optionalServices';
import type { OptionalFeeRequest, OptionalFeeRequestAction, OptionalService, Ward } from '../types';
import { EmptyState, QueryView } from '../ui';
import { RequestHistoryRow } from './RequestHistoryRow';
import { RequestServiceModal } from './RequestServiceModal';
import { ServiceCard } from './ServiceCard';

interface PendingAsk {
  service: OptionalService;
  action: OptionalFeeRequestAction;
}

/**
 * Optional services (bus, feeding, ...) the ward's school offers, and the
 * parent's requests to start or stop them (see `domain/optionalServices`).
 */
export function OptionalServices({ ward }: { ward: Ward }) {
  const services = useOptionalServices(ward.studentId);
  const history = useOptionalFeeRequests(ward.studentId);
  const [asking, setAsking] = useState<PendingAsk | null>(null);
  const { online } = useNetwork();

  const refresh = () => {
    services.reload();
    history.reload();
  };

  const cancel = async (request: OptionalFeeRequest) => {
    try {
      await parentApi.cancelOptionalFeeRequest(ward.studentId, request.id);
      notifications.show({ message: 'Request cancelled.', color: 'gray' });
    } catch (err) {
      notifications.show({
        title: 'Could not cancel',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    }
    refresh();
  };

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light" radius="md" icon={<Info size={16} />}>
        Ask the school to start or stop a service. Once the school approves, the change shows on the
        next bill. Bills already issued stay the same.
      </Alert>
      <QueryView
        query={services}
        empty={{
          when: (result) => result.services.length === 0,
          render: () => (
            <EmptyState
              icon={<Bus size={22} />}
              title="No optional services"
              message="The school has not listed any optional services yet."
            />
          ),
        }}
      >
        {(result) => (
          <Stack gap="sm">
            {(result.termLabel || result.className) && (
              <Text size="xs" c="dimmed">
                Prices for {[result.className, result.termLabel].filter(Boolean).join(', ')}
              </Text>
            )}
            {!result.canRequest && (
              <Alert color="yellow" radius="md" icon={<AlertCircle size={16} />}>
                The school isn&apos;t taking requests right now.
              </Alert>
            )}
            {result.services.map((service) => (
              <ServiceCard
                key={service.feeTypeId}
                service={service}
                disabled={!result.canRequest || !online}
                onAsk={(action) => setAsking({ service, action })}
                onCancel={cancel}
              />
            ))}
          </Stack>
        )}
      </QueryView>

      <QueryView query={history}>
        {(requests) => <PastRequests requests={decidedRequests(requests)} />}
      </QueryView>

      {asking && (
        <RequestServiceModal
          studentId={ward.studentId}
          service={asking.service}
          action={asking.action}
          onClose={() => setAsking(null)}
          onSent={() => {
            setAsking(null);
            refresh();
          }}
        />
      )}
    </Stack>
  );
}

function PastRequests({ requests }: { requests: OptionalFeeRequest[] }) {
  if (requests.length === 0) return null;
  return (
    <Stack gap="xs" mt="sm">
      <Title order={4} fz="md">
        Past requests
      </Title>
      {requests.map((request) => (
        <RequestHistoryRow key={request.id} request={request} />
      ))}
    </Stack>
  );
}
