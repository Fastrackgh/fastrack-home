'use client';

import { useRef } from 'react';
import { Button, Group, Modal, Paper } from '@mantine/core';
import { Printer } from 'lucide-react';
import { QueryView } from './components';
import { useParentQuery } from './useParentQuery';

/**
 * A bill, receipt or report rendered by the backend with the school's
 * published design. The HTML is shown in a sandboxed frame: it may style
 * itself but never runs scripts or reaches this page.
 */
export function DocumentModal({
  opened,
  onClose,
  title,
  cacheKey,
  load,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  cacheKey: string;
  load: () => Promise<string>;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="xl" fullScreen={false} radius="lg">
      {opened && <DocumentBody cacheKey={cacheKey} load={load} title={title} />}
    </Modal>
  );
}

function DocumentBody({
  cacheKey,
  load,
  title,
}: {
  cacheKey: string;
  load: () => Promise<string>;
  title: string;
}) {
  const query = useParentQuery(cacheKey, load);
  const frame = useRef<HTMLIFrameElement>(null);

  return (
    <QueryView query={query}>
      {(html) => (
        <>
          <Group justify="flex-end" mb="sm">
            <Button
              size="xs"
              variant="light"
              leftSection={<Printer size={14} />}
              onClick={() => frame.current?.contentWindow?.print()}
            >
              Print or save as PDF
            </Button>
          </Group>
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <iframe
              ref={frame}
              title={title}
              srcDoc={html}
              // allow-same-origin lets the print button reach the frame; scripts stay off.
              sandbox="allow-same-origin allow-modals"
              style={{ width: '100%', height: '70vh', border: 0, background: 'white' }}
            />
          </Paper>
        </>
      )}
    </QueryView>
  );
}
