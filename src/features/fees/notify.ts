import { notifications } from '@mantine/notifications';

export const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

export function notifyLoadError(what: string, err: unknown) {
  notifications.show({
    title: `Could not load ${what}`,
    message: errorMessage(err, 'Try refreshing the page.'),
    color: 'red',
  });
}
