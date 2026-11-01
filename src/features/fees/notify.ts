import { notifications } from '@mantine/notifications';
import { errorMessage } from '@/lib/api-client';

export function notifyLoadError(what: string, err: unknown) {
  notifications.show({
    title: `Could not load ${what}`,
    message: errorMessage(err, 'Try refreshing the page.'),
    color: 'red',
  });
}
