'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Anchor,
  Card,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { CheckCircle2, Circle } from 'lucide-react';
import { feesApi } from '@/features/fees/api';
import { PageHeader } from '@/features/workspace';
import { useAuth } from '@/lib/auth';
import { APP_ROUTES, hasModule } from '@/lib/rbac';
import { errorMessage, setupApi, type Department, type StaffOption } from './api';
import { ClassesPanel } from './ClassesPanel';
import { DepartmentsPanel } from './DepartmentsPanel';
import { SchoolProfilePanel } from './SchoolProfilePanel';
import { YearsPanel } from './YearsPanel';

type TabKey = 'profile' | 'years' | 'departments' | 'classes';

interface Step {
  label: string;
  done: boolean;
  /** Opens the tab, or another page, where the step is done. */
  tab?: TabKey;
  href?: string;
}

/**
 * Everything a school sets up before its first term: profile, academic year
 * and terms, departments and classes, with a checklist of what is missing.
 */
export function SetupPage() {
  const { user, can, school } = useAuth();
  // Fee types 403 for a school without the fees module (QA-246).
  const hasFees = !!user && hasModule(user, 'fees');
  const canProfile = can('school_profile:manage');
  const [tab, setTab] = useState<TabKey>(canProfile ? 'profile' : 'years');
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [steps, setSteps] = useState<Step[] | null>(null);

  const loadDepartments = useCallback(async () => {
    setDepartmentsError(null);
    try {
      setDepartments(await setupApi.listDepartments());
    } catch (err) {
      setDepartmentsError(errorMessage(err, 'Could not load the departments.'));
    }
  }, []);

  // The checklist is a hint, so a failed read just leaves it out.
  const loadSteps = useCallback(async () => {
    const [years, classes, feeTypes] = await Promise.all([
      setupApi.listYears().catch(() => null),
      setupApi.listClasses(1, '').catch(() => null),
      hasFees && can('fee_types:read')
        ? feesApi.listFeeTypes().catch(() => null)
        : Promise.resolve(null),
    ]);
    const current = years?.find((y) => y.isCurrent);
    const list: Step[] = [];
    if (canProfile)
      list.push({
        label: 'Add the school’s contacts and logo',
        done: !!(school?.phone && school?.email && school?.logoUrl),
        tab: 'profile',
      });
    if (years) {
      list.push({
        label: 'Add the academic year and mark it current',
        done: !!current,
        tab: 'years',
      });
      list.push({
        label: 'Add its terms and mark the current term',
        done: !!current?.terms.some((t) => t.isCurrent),
        tab: 'years',
      });
    }
    list.push({
      label: 'Set up departments',
      done: (departments?.length ?? 0) > 0,
      tab: 'departments',
    });
    if (classes) list.push({ label: 'Add classes', done: classes.total > 0, tab: 'classes' });
    if (feeTypes)
      list.push({
        label: 'Add fee types and fee structures',
        done: feeTypes.length > 0,
        href: APP_ROUTES.fees.path,
      });
    if (can('staff:read'))
      list.push({
        label: 'Invite your staff',
        done: staff.length > 0,
        href: APP_ROUTES.staff.path,
      });
    setSteps(list);
  }, [can, canProfile, hasFees, school, departments, staff]);

  useEffect(() => {
    loadDepartments();
    setupApi
      .listStaffOptions()
      .then(setStaff)
      .catch(() => setStaff([]));
  }, [loadDepartments]);

  useEffect(() => {
    if (departments) loadSteps();
  }, [departments, loadSteps]);

  const canManageYears = can('academic_years:manage');
  const done = steps?.filter((s) => s.done).length ?? 0;

  return (
    <>
      <PageHeader
        title="School setup"
        subtitle="Your school’s profile, academic years and terms, departments and classes."
      />

      {steps && done < steps.length && (
        <Card withBorder radius="lg" p="lg" mb="lg">
          <Group justify="space-between" mb="xs">
            <Text fw={700}>Getting started</Text>
            <Text size="sm" c="dimmed">
              {done} of {steps.length} done
            </Text>
          </Group>
          <Progress value={(done / steps.length) * 100} color="green" mb="md" />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {steps.map((step) => (
              <Group key={step.label} gap="xs" wrap="nowrap">
                <ThemeIcon variant="transparent" color={step.done ? 'green' : 'gray'} size="sm">
                  {step.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </ThemeIcon>
                {step.done ? (
                  <Text size="sm" c="dimmed" td="line-through">
                    {step.label}
                  </Text>
                ) : step.href ? (
                  <Anchor component={Link} href={step.href} size="sm">
                    {step.label}
                  </Anchor>
                ) : (
                  <Anchor component="button" size="sm" onClick={() => step.tab && setTab(step.tab)}>
                    {step.label}
                  </Anchor>
                )}
              </Group>
            ))}
          </SimpleGrid>
        </Card>
      )}

      <Tabs value={tab} onChange={(v) => v && setTab(v as TabKey)} color="fastrackRed">
        <Tabs.List mb="lg">
          {canProfile && <Tabs.Tab value="profile">School profile</Tabs.Tab>}
          <Tabs.Tab value="years">Years & terms</Tabs.Tab>
          <Tabs.Tab value="departments">Departments</Tabs.Tab>
          <Tabs.Tab value="classes">Classes</Tabs.Tab>
        </Tabs.List>

        <Stack>
          {canProfile && (
            <Tabs.Panel value="profile">
              <SchoolProfilePanel canManage={canProfile} onChanged={loadSteps} />
            </Tabs.Panel>
          )}
          <Tabs.Panel value="years">
            <YearsPanel canManage={canManageYears} onChanged={loadSteps} />
          </Tabs.Panel>
          <Tabs.Panel value="departments">
            <DepartmentsPanel
              departments={departments}
              error={departmentsError}
              staff={staff}
              canManage={can('departments:manage')}
              onChanged={loadDepartments}
            />
          </Tabs.Panel>
          <Tabs.Panel value="classes">
            <ClassesPanel
              departments={departments ?? []}
              staff={staff}
              canManage={can('classes:manage')}
              onChanged={() => {
                loadDepartments();
              }}
            />
          </Tabs.Panel>
        </Stack>
      </Tabs>
    </>
  );
}
