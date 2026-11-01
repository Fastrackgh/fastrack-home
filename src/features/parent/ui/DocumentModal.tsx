'use client';

import { useRef, useState } from 'react';
import { Button, Group, Modal, Paper } from '@mantine/core';
import { FileText, Printer } from 'lucide-react';
import type { DocumentSource } from '../data/queries';
import { useParentQuery } from '../data/useParentQuery';
import { QueryView } from './QueryView';
import classes from './ui.module.css';

/**
 * A bill, receipt or report rendered by the backend with the school's
 * published design. The HTML is shown in a sandboxed frame: it may style
 * itself but never runs scripts or reaches this page.
 */
export function DocumentModal({
  opened,
  onClose,
  title,
  source,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  source: DocumentSource;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="xl" radius="lg">
      {opened && <DocumentBody source={source} title={title} />}
    </Modal>
  );
}

/** A "View printable ..." button that opens the document. */
export function DocumentButton({
  label,
  title,
  source,
}: {
  label: string;
  title: string;
  source: DocumentSource;
}) {
  const [viewing, setViewing] = useState(false);
  return (
    <>
      <Button
        variant="default"
        leftSection={<FileText size={16} />}
        onClick={() => setViewing(true)}
      >
        {label}
      </Button>
      <DocumentModal
        opened={viewing}
        onClose={() => setViewing(false)}
        title={title}
        source={source}
      />
    </>
  );
}

function DocumentBody({ source, title }: { source: DocumentSource; title: string }) {
  const query = useParentQuery(source.cacheKey, source.load);
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
              className={classes.documentFrame}
            />
          </Paper>
        </>
      )}
    </QueryView>
  );
}
