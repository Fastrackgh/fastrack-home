'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Card,
  Drawer,
  Group,
  LoadingOverlay,
  Stack,
  Switch,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Settings2 } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import { platformSchoolsApi } from '@/features/platform-schools/api';
import type { ModuleEntitlement } from '@/features/platform-schools/model';
import type { SchoolItem } from './api';

/** Turns a school's modules on and off; each switch saves at once. */
export function SchoolModulesDrawer({
  school,
  opened,
  onClose,
}: {
  school: SchoolItem | null;
  opened: boolean;
  onClose: () => void;
}) {
  const [modules, setModules] = useState<ModuleEntitlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || !school) return;
    let active = true;
    setLoading(true);
    platformSchoolsApi
      .listModules(school.id)
      .then((list) => active && setModules(list))
      .catch(() =>
        notifications.show({
          color: 'red',
          title: 'Failed to load modules',
          message: 'Could not fetch module entitlements for this school.',
        }),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [opened, school]);

  const setEnabled = (moduleId: string, isEnabled: boolean) =>
    setModules((all) => all.map((m) => (m.moduleId === moduleId ? { ...m, isEnabled } : m)));

  const toggle = async (moduleId: string, wasEnabled: boolean) => {
    if (!school) return;
    setToggling(moduleId);
    // Shown at once; put back if the save fails.
    setEnabled(moduleId, !wasEnabled);
    try {
      await platformSchoolsApi.setModule(school.id, moduleId, !wasEnabled);
      notifications.show({
        color: 'green',
        title: 'Module Entitlement Updated',
        message: `Module ${wasEnabled ? 'disabled' : 'enabled'} for ${school.name}.`,
      });
    } catch (err) {
      setEnabled(moduleId, wasEnabled);
      notifications.show({
        color: 'red',
        title: 'Update Failed',
        message: errorMessage(err, 'Failed to update module entitlement'),
      });
    } finally {
      setToggling(null);
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      closeButtonProps={{ 'aria-label': 'Close modules' }}
      position="right"
      size="md"
      title={
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" color="blue" variant="light">
            <Settings2 size={16} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm">
              Module Entitlements
            </Text>
            <Text size="xs" c="dimmed">
              {school?.name} ({school?.code})
            </Text>
          </div>
        </Group>
      }
    >
      <Box pos="relative" pt="xs">
        <LoadingOverlay visible={loading} />
        <Text size="xs" c="dimmed" mb="md">
          Enable or disable platform feature modules for this school tenant. Changes take effect
          immediately.
        </Text>

        <Stack gap="sm">
          {modules.map((item) => (
            <Card
              key={item.moduleId}
              radius="md"
              withBorder
              padding="sm"
              style={{
                background: item.isEnabled ? '#f0fdf4' : '#ffffff',
                borderColor: item.isEnabled ? '#bbf7d0' : '#e2e8f0',
                transition: 'all 0.2s ease',
              }}
            >
              <Group justify="space-between" align="center">
                <div>
                  <Group gap="xs">
                    <Text fw={700} size="sm" style={{ color: '#0f172a' }}>
                      {item.moduleName}
                    </Text>
                    <Badge size="xs" color={item.isEnabled ? 'teal' : 'gray'} variant="light">
                      {item.isEnabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={2}>
                    {item.description || item.moduleKey}
                  </Text>
                </div>
                <Switch
                  aria-label={`${item.moduleName} for ${school?.name ?? 'this school'}`}
                  checked={item.isEnabled}
                  disabled={toggling === item.moduleId}
                  onChange={() => toggle(item.moduleId, item.isEnabled)}
                  color="teal"
                  size="md"
                />
              </Group>
            </Card>
          ))}
        </Stack>
      </Box>
    </Drawer>
  );
}
