'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { errorMessage } from '@/lib/api-client';
import { setupApi, type AcademicYear, type Department, type StaffOption } from './api';
import { ClassesPanel } from './ClassesPanel';
import { DepartmentsPanel } from './DepartmentsPanel';
import { SchoolProfilePanel } from './SchoolProfilePanel';
import { SubjectsPanel } from './SubjectsPanel';
import { YearsPanel } from './YearsPanel';

type TabKey = 'profile' | 'years' | 'departments' | 'classes' | 'subjects';

interface Step {
  label: string;
  done: boolean;
  /** Opens the tab, or another page, where the step is done. */
  tab?: TabKey;
  href?: string;
}

/**
 * Everything a school sets up before its first term: profile, academic year
 * and terms, departments, classes and their subjects, with a checklist of
 * what is missing.
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
  /** What the checklist reads; null until loaded, a field null when its read failed. */
  const [checks, setChecks] = useState<{
    years: AcademicYear[] | null;
    classes: number | null;
    feeTypes: number | null;
  } | null>(null);

  const loadDepartments = useCallback(async () => {
    setDepartmentsError(null);
    try {
      setDepartments(await setupApi.listDepartments());
    } catch (err) {
      setDepartmentsError(errorMessage(err, 'Could not load the departments.'));
    }
  }, []);

  // The checklist is a hint, so a failed read just leaves it out. It reads
  // once on open and after a change, not again when staff arrive (QA-264).
  const canReadFeeTypes = hasFees && can('fee_types:read');
  const loadChecks = useCallback(async () => {
    const [years, classes, feeTypes] = await Promise.all([
      setupApi.listYears().catch(() => null),
      setupApi.listClasses(1, '').catch(() => null),
      canReadFeeTypes ? feesApi.listFeeTypes().catch(() => null) : Promise.resolve(null),
    ]);
    setChecks({
      years,
      classes: classes?.total ?? null,
      feeTypes: feeTypes?.length ?? null,
    });
  }, [canReadFeeTypes]);

  useEffect(() => {
    loadDepartments();
    loadChecks();
    setupApi
      .listStaffOptions()
      .then(setStaff)
      .catch(() => setStaff([]));
  }, [loadDepartments, loadChecks]);

  const canReadStaff = can('staff:read');
  const steps = useMemo<Step[] | null>(() => {
    if (!checks || !departments) return null;
    const { years, classes, feeTypes } = checks;
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
      done: departments.length > 0,
      tab: 'departments',
    });
    if (classes !== null) list.push({ label: 'Add classes', done: classes > 0, tab: 'classes' });
    if (feeTypes !== null)
      list.push({
        label: 'Add fee types and fee structures',
        done: feeTypes > 0,
        href: APP_ROUTES.fees.path,
      });
    if (canReadStaff)
      list.push({
        label: 'Invite your staff',
        done: staff.length > 0,
        href: APP_ROUTES.staff.path,
      });
    return list;
  }, [checks, departments, canProfile, canReadStaff, school, staff]);

  const canManageYears = can('academic_years:manage');
  const done = steps?.filter((s) => s.done).length ?? 0;

  return (
    <>
      <PageHeader
        title="School setup"
        subtitle="Your school’s profile, academic years and terms, departments, classes and subjects."
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

      {/* Only the open tab loads its data (QA-264). */}
      <Tabs
        value={tab}
        onChange={(v) => v && setTab(v as TabKey)}
        color="fastrackRed"
        keepMounted={false}
      >
        <Tabs.List mb="lg">
          {canProfile && <Tabs.Tab value="profile">School profile</Tabs.Tab>}
          <Tabs.Tab value="years">Years & terms</Tabs.Tab>
          <Tabs.Tab value="departments">Departments</Tabs.Tab>
          <Tabs.Tab value="classes">Classes</Tabs.Tab>
          {can('subjects:read') && <Tabs.Tab value="subjects">Subjects</Tabs.Tab>}
        </Tabs.List>

        <Stack>
          {canProfile && (
            <Tabs.Panel value="profile">
              <SchoolProfilePanel canManage={canProfile} onChanged={loadChecks} />
            </Tabs.Panel>
          )}
          <Tabs.Panel value="years">
            <YearsPanel canManage={canManageYears} onChanged={loadChecks} />
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
          {can('subjects:read') && (
            <Tabs.Panel value="subjects">
              <SubjectsPanel departments={departments ?? []} canManage={can('subjects:manage')} />
            </Tabs.Panel>
          )}
        </Stack>
      </Tabs>
    </>
  );
}
