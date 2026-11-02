import { notifications } from '@mantine/notifications';
import { CloudOff } from 'lucide-react';
import type { EditResult } from './edits-sync';

/** The message after saving a pupil's details: saved, waiting on the device, or in review. */
export function notifyEdit(result: EditResult, savedTitle: string, name: string) {
  if (result === 'queued') {
    notifications.show({
      title: 'Saved on this device',
      message: `The changes to ${name} will be sent when the device is back online.`,
      color: 'yellow',
      icon: <CloudOff size={18} />,
      autoClose: 8000,
    });
  } else if (result === 'review') {
    notifications.show({
      title: 'Someone else changed this pupil',
      message: 'Changes that clash are in Needs review. Any others were saved.',
      color: 'orange',
      autoClose: 10000,
    });
  } else {
    notifications.show({ title: savedTitle, message: name, color: 'green' });
  }
}
