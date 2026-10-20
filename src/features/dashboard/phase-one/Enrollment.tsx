'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button, Group, Stack, Text } from '@mantine/core';
import { APP_ROUTES, can } from '@/lib/rbac';
import type { Viewer } from '../model';
import { Enquiry, classes, terms } from './domain';
import { PhaseStore } from './usePhaseState';
import { Editor, Field, Preview, Report, Values, f, id } from './Shared';

export const studentFields: Field[] = [
  f('name', 'Student full name'),
  f('birthDate', 'Date of birth', 'date'),
  f('gender', 'Gender', 'text', ['Male', 'Female']),
  f('classId', 'Class applying for', 'text', classes),
  f('nationality', 'Nationality'),
  f('parent', 'Parent / guardian full name'),
  f('phone', 'Contact number'),
  f('email', 'Email address', 'email'),
  f('address', 'Residential address'),
  f('previousSchool', 'Previous school', 'text', undefined, false),
];
export function validStudent(v: Values) {
  if (v.birthDate > new Date().toISOString().slice(0, 10))
    return 'Date of birth cannot be in the future.';
  if (!/^[+\d ()-]{7,20}$/.test(v.phone)) return 'Enter a valid contact number.';
}
export function Enrollment({
  store,
  viewer,
  term,
  area,
}: {
  store: PhaseStore;
  viewer: Viewer;
  term: string;
  area: 'enquiries' | 'admissions';
}) {
  const { state, update } = store;
  const [editor, setEditor] = useState<string | null>(null);
  const [enquiryEdit, setEnquiryEdit] = useState<Enquiry | null>(null);
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const may = {
    enroll: can(viewer, 'students:create'),
    manageEnquiries: can(viewer, 'enquiries:manage'),
  };
  const termData = terms[term as keyof typeof terms];
  const enquiries = state.enquiries.filter(
    (e) => e.termId === term && (area !== 'admissions' || e.source === 'Online portal'),
  );
  return (
    <Stack>
      <>
        <Group justify="space-between">
          {area === 'admissions' && (
            <Button component={Link} href={APP_ROUTES.admissions.path} target="_blank">
              Open self-service admission portal
            </Button>
          )}
        </Group>
        <Report
          title={area === 'admissions' ? 'Online admission applications' : 'Admission enquiries'}
          columns={['Student', 'Class', 'Parent', 'Source', 'Status', 'Assigned to', 'Follow-up']}
          rows={enquiries.map((e) => [
            e.name,
            e.classId,
            e.parent,
            e.source,
            e.status,
            e.assignedTo,
            e.followUp,
          ])}
          onOpen={(i) => setSelected(enquiries[i])}
          add={may.manageEnquiries ? () => setEditor('enquiry') : undefined}
        />
      </>
      {editor === 'enquiry' && may.manageEnquiries && (
        <Editor
          title={enquiryEdit ? 'Update enquiry & follow-up' : 'New admission enquiry'}
          fields={[
            ...studentFields,
            f('date', 'Enquiry date', 'date'),
            f('source', 'Enquiry source', 'text', [
              'School website',
              'Referral',
              'Walk-In',
              'Social Media',
              'Online portal',
            ]),
            f('assignedTo', 'Assigned to'),
            f('followUp', 'Follow-up date', 'date'),
            f('notes', 'Remarks', 'textarea', undefined, false),
          ]}
          initial={
            enquiryEdit
              ? { ...enquiryEdit }
              : {
                  nationality: 'Ghanaian',
                  date: '2026-09-23',
                  assignedTo: 'Efua Mensah',
                }
          }
          onClose={() => {
            setEditor(null);
            setEnquiryEdit(null);
          }}
          onSave={(v) => {
            const error = validStudent(v);
            if (error) return error;
            if (v.followUp < v.date) return 'Follow-up must be on or after the enquiry date.';
            update((s) => ({
              ...s,
              enquiries: [
                ...s.enquiries.filter((e) => e.id !== enquiryEdit?.id),
                {
                  ...v,
                  id: enquiryEdit?.id ?? id(),
                  termId: term,
                  status: enquiryEdit?.status ?? 'New',
                  previousSchool: v.previousSchool || '',
                  notes: v.notes || '',
                } as unknown as Enquiry,
              ],
            }));
          }}
        />
      )}
      {selected && (
        <Preview title="Enquiry details" onClose={() => setSelected(null)}>
          {Object.entries(selected).map(([k, v]) => (
            <Text key={k} size="sm">
              <strong>{k.replace(/([A-Z])/g, ' $1')}: </strong>
              {v || '—'}
            </Text>
          ))}
          {may.manageEnquiries && (
            <Group>
              <Button
                variant="default"
                onClick={() => {
                  setEnquiryEdit(selected);
                  setEditor('enquiry');
                  setSelected(null);
                }}
              >
                Edit enquiry / follow-up
              </Button>
              {may.enroll && selected.status !== 'Enrolled' && selected.status !== 'Cancelled' && (
                <Button
                  onClick={() => {
                    const applicant = selected;
                    update((s) => ({
                      ...s,
                      students: [
                        ...s.students,
                        {
                          id: applicant.id,
                          name: applicant.name,
                          birthDate: applicant.birthDate,
                          gender: applicant.gender,
                          classId: applicant.classId,
                          nationality: applicant.nationality,
                          parent: applicant.parent,
                          phone: applicant.phone,
                          email: applicant.email,
                          address: applicant.address,
                          previousSchool: applicant.previousSchool || '',
                          admissionDate: termData.start,
                          termId: term,
                          status: 'Active',
                        },
                      ],
                      enquiries: s.enquiries.map((e) =>
                        e.id === applicant.id ? { ...e, status: 'Enrolled' } : e,
                      ),
                    }));
                    setSelected({ ...applicant, status: 'Enrolled' });
                  }}
                >
                  Enroll applicant
                </Button>
              )}
              {(selected.status === 'Enrolled' ? [] : ['Application Submitted', 'Cancelled']).map(
                (status) => (
                  <Button
                    key={status}
                    variant="default"
                    onClick={() => {
                      update((s) => ({
                        ...s,
                        enquiries: s.enquiries.map((e) =>
                          e.id === selected.id ? { ...e, status } : e,
                        ),
                      }));
                      setSelected({ ...selected, status });
                    }}
                  >
                    {status}
                  </Button>
                ),
              )}
            </Group>
          )}
        </Preview>
      )}
    </Stack>
  );
}
