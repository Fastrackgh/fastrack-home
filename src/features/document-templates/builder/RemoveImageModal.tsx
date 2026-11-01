'use client';

import { useState } from 'react';
import { Alert, Button, Group, Image, List, Modal, Stack, Text } from '@mantine/core';
import { errorMessage } from '@/lib/api-client';
import { ImageInUse, KIND_LABELS, type DesignImage, type TemplateStatus } from '../api';

const statusWord: Record<TemplateStatus, string> = {
  DRAFT: 'draft',
  PUBLISHED: 'live',
  ARCHIVED: 'unpublished',
};

/**
 * Confirms deleting an uploaded design image (QA-282). The server refuses
 * one a draft or live design still uses; the dialog then lists those
 * designs, so the image can be swapped out of them first.
 */
export function RemoveImageModal({
  image,
  onClose,
  onRemove,
}: {
  image: DesignImage;
  onClose: () => void;
  onRemove: (image: DesignImage) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [inUse, setInUse] = useState<ImageInUse | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const remove = async () => {
    setBusy(true);
    setInUse(null);
    setProblem(null);
    try {
      await onRemove(image);
      onClose();
    } catch (e) {
      if (e instanceof ImageInUse) setInUse(e);
      else setProblem(errorMessage(e, 'The image could not be deleted.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Delete this image?" centered>
      <Stack gap="sm">
        <Image src={image.url} alt="" fit="contain" style={{ height: 96, maxHeight: 96 }} />
        <Text size="sm">
          {image.originalFilename ? `“${image.originalFilename}” ` : 'It '}
          will be removed from the school’s design images. This can’t be undone.
        </Text>
        {inUse && (
          <Alert color="orange" title="This image is still in use">
            {inUse.designs.length ? (
              <>
                <Text size="sm">
                  Pick a different image in these designs, or delete the drafts, then try again:
                </Text>
                <List size="sm" mt={4}>
                  {inUse.designs.map((d) => (
                    <List.Item key={d.id}>
                      {KIND_LABELS[d.kind] ?? d.kind} v{d.version} · {d.name} (
                      {statusWord[d.status] ?? d.status.toLowerCase()})
                    </List.Item>
                  ))}
                </List>
              </>
            ) : (
              <Text size="sm">{inUse.message}</Text>
            )}
          </Alert>
        )}
        {problem && (
          <Alert color="red" title="Not deleted">
            {problem}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={busy}>
            {inUse ? 'Close' : 'Cancel'}
          </Button>
          <Button color="red" onClick={() => void remove()} loading={busy}>
            {inUse ? 'Try again' : 'Delete image'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
