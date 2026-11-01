'use client';

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { todayIso } from '@/features/calendar/dates';
import type { CurrentTerm } from '@/features/school-setup/api';
import { emailInputProps } from '@/lib/email-input';
import { fieldSetter } from '@/lib/state';
import { studentsApi } from './api';

const initialFormData = {
  // Step 1: Personal Details
  firstName: '',
  surname: '',
  otherName: '',
  gender: '',
  birthDate: '',
  nationalId: '',
  nationality: '',
  religion: '',
  residence: '',
  digitalAddress: '',

  // Step 2: Academic Placement
  classId: '',
  department: '',
  previousSchool: '',
  boardingStatus: '',
  transportRoute: 'None (Self Transport)',
  entranceExamScore: '',
  entranceExamNotes: '',

  // Step 3: Guardian Details
  motherName: '',
  motherContact: '',
  motherEmail: '',
  motherOccupation: '',
  fatherName: '',
  fatherContact: '',
  fatherEmail: '',
  fatherOccupation: '',

  // Step 4: Health & Emergency
  bloodGroup: '',
  genotype: '',
  allergiesMedicalNotes: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
};

interface AdmitStudentModalProps {
  opened: boolean;
  onClose: () => void;
  classes: { id: string; classCode: string; className: string }[];
  /** Admission goes into the current year and term; without one, the form says so. */
  academicContext: CurrentTerm | null;
  onAdmitted: () => void;
}

/** The four-step admission form: personal, academics, guardians, health. */
export function AdmitStudentModal({
  opened,
  onClose,
  classes,
  academicContext,
  onAdmitted,
}: AdmitStudentModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState(initialFormData);

  const setField = fieldSetter(setFormData);

  // The backend refuses a birth date after today (QA-209).
  const BIRTH_IN_FUTURE = "Birth date can't be in the future.";
  const birthInFuture = () => !!formData.birthDate && formData.birthDate > todayIso();

  // The backend needs one parent reachable by name and phone (QA-210).
  const GUARDIAN_REQUIRED = "Add the mother's or father's name and phone number.";
  const hasGuardian = () =>
    (!!formData.motherName.trim() && !!formData.motherContact.trim()) ||
    (!!formData.fatherName.trim() && !!formData.fatherContact.trim());

  // Stepper navigation and step validation
  const validateStep = (step: number): boolean => {
    setFormError(null);
    if (step === 0) {
      if (!formData.firstName.trim() || !formData.surname.trim()) {
        setFormError('First Name and Surname are required to proceed.');
        return false;
      }
      if (birthInFuture()) {
        setFormError(BIRTH_IN_FUTURE);
        return false;
      }
    }
    if (step === 1) {
      if (!formData.classId) {
        setFormError('Please select a Class Cohort for admission.');
        return false;
      }
    }
    if (step === 2 && !hasGuardian()) {
      setFormError(GUARDIAN_REQUIRED);
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep((current) => (current < 3 ? current + 1 : current));
    }
  };

  // Enter in a field moves to the next step; before the last step there is no
  // submit button, so the browser would otherwise do nothing.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    if (
      e.key !== 'Enter' ||
      e.defaultPrevented ||
      activeStep >= 3 ||
      target.tagName !== 'INPUT' ||
      target.getAttribute('aria-expanded') === 'true'
    ) {
      return;
    }
    e.preventDefault();
    handleNextStep();
  };

  const handlePrevStep = () => {
    setFormError(null);
    setActiveStep((current) => (current > 0 ? current - 1 : current));
  };

  // Handle admit submission
  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Enter in a field submits the form from any step; only the last step admits.
    if (activeStep < 3) {
      handleNextStep();
      return;
    }
    setFormError(null);

    if (!formData.firstName.trim() || !formData.surname.trim()) {
      setFormError('First name and surname are required.');
      setActiveStep(0);
      return;
    }
    if (birthInFuture()) {
      setFormError(BIRTH_IN_FUTURE);
      setActiveStep(0);
      return;
    }
    if (!formData.classId) {
      setFormError('Please select a class for admission.');
      setActiveStep(1);
      return;
    }
    if (!hasGuardian()) {
      setFormError(GUARDIAN_REQUIRED);
      setActiveStep(2);
      return;
    }
    if (!academicContext?.yearId || !academicContext?.termId) {
      setFormError('Current academic year and term are not configured for this school.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        surname: formData.surname.trim(),
        admissionAcademicYearId: academicContext.yearId,
        admissionTermId: academicContext.termId,
        admissionClassId: formData.classId,
      };

      if (formData.gender) payload.gender = formData.gender;
      if (formData.otherName.trim()) payload.otherName = formData.otherName.trim();
      if (formData.birthDate) payload.birthDate = formData.birthDate;
      if (formData.nationalId.trim()) payload.nationalId = formData.nationalId.trim();
      if (formData.nationality.trim()) payload.nationality = formData.nationality.trim();
      if (formData.religion.trim()) payload.religion = formData.religion.trim();
      if (formData.residence.trim()) payload.residence = formData.residence.trim();
      if (formData.digitalAddress.trim()) payload.digitalAddress = formData.digitalAddress.trim();

      if (formData.department.trim()) payload.department = formData.department.trim();
      if (formData.previousSchool.trim()) payload.previousSchool = formData.previousSchool.trim();
      if (formData.boardingStatus) payload.boardingStatus = formData.boardingStatus;
      if (formData.transportRoute.trim() && formData.transportRoute !== 'None (Self Transport)') {
        payload.transportRoute = formData.transportRoute.trim();
      }
      if (formData.entranceExamNotes.trim())
        payload.entranceExamNotes = formData.entranceExamNotes.trim();

      if (formData.motherName.trim()) payload.motherName = formData.motherName.trim();
      if (formData.motherContact.trim()) payload.motherContact = formData.motherContact.trim();
      if (formData.motherEmail.trim()) payload.motherEmail = formData.motherEmail.trim();
      if (formData.motherOccupation.trim())
        payload.motherOccupation = formData.motherOccupation.trim();

      if (formData.fatherName.trim()) payload.fatherName = formData.fatherName.trim();
      if (formData.fatherContact.trim()) payload.fatherContact = formData.fatherContact.trim();
      if (formData.fatherEmail.trim()) payload.fatherEmail = formData.fatherEmail.trim();
      if (formData.fatherOccupation.trim())
        payload.fatherOccupation = formData.fatherOccupation.trim();

      if (formData.bloodGroup) payload.bloodGroup = formData.bloodGroup;
      if (formData.genotype) payload.genotype = formData.genotype;
      if (formData.allergiesMedicalNotes.trim())
        payload.allergiesMedicalNotes = formData.allergiesMedicalNotes.trim();
      if (formData.emergencyContactName.trim())
        payload.emergencyContactName = formData.emergencyContactName.trim();
      if (formData.emergencyContactPhone.trim())
        payload.emergencyContactPhone = formData.emergencyContactPhone.trim();
      if (formData.emergencyContactRelationship.trim()) {
        payload.emergencyContactRelationship = formData.emergencyContactRelationship.trim();
      }

      const admitted = await studentsApi.admit(payload);

      notifications.show({
        title: 'Student Admitted Successfully',
        message: `${admitted.fullName} enrolled with code: ${admitted.studentCode}`,
        color: 'green',
        icon: <CheckCircle size={18} />,
        autoClose: 5000,
      });

      // Reset form, stepper & close modal
      setFormData(initialFormData);
      setActiveStep(0);
      onClose();
      onAdmitted();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to admit student. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalClassOptions = useMemo(() => {
    return classes.map((c) => ({ value: c.id, label: `${c.className} (${c.classCode})` }));
  }, [classes]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      closeOnClickOutside={false}
      title={
        <Box>
          <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
            Comprehensive Student Enrollment
          </Title>
          <Text size="xs" c="dimmed">
            Session:{' '}
            {academicContext
              ? `${academicContext.yearLabel} • ${academicContext.termLabel}`
              : 'Active Session'}
          </Text>
        </Box>
      }
      size="xl"
      radius="lg"
      centered
    >
      <form onSubmit={handleAdmit} onKeyDown={handleFormKeyDown}>
        <Stack gap="md">
          {formError ? (
            <Alert
              icon={<AlertCircle size={16} />}
              title="Admission Form Alert"
              color="red"
              radius="md"
            >
              {formError}
            </Alert>
          ) : null}

          <Stepper
            active={activeStep}
            onStepClick={(step) => {
              if (step < activeStep || validateStep(activeStep)) {
                setActiveStep(step);
              }
            }}
            color="fastrackRed"
            size="sm"
          >
            {/* Step 1: Personal Details */}
            <Stepper.Step label="Personal" description="Identity & Bio">
              <Stack gap="sm" mt="md">
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  style={{ letterSpacing: '0.05em' }}
                >
                  Student Identity & Demographics
                </Text>

                <Grid gutter="sm">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="First Name"
                      placeholder="e.g. Kwame"
                      required
                      value={formData.firstName}
                      onChange={(e) => setField('firstName', e.currentTarget.value)}
                      radius="md"
                      id="modal-first-name"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Surname / Last Name"
                      placeholder="e.g. Mensah"
                      required
                      value={formData.surname}
                      onChange={(e) => setField('surname', e.currentTarget.value)}
                      radius="md"
                      id="modal-surname"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Middle / Other Name"
                      placeholder="e.g. Kofi"
                      value={formData.otherName}
                      onChange={(e) => setField('otherName', e.currentTarget.value)}
                      radius="md"
                      id="modal-other-name"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Gender"
                      data={['Male', 'Female']}
                      value={formData.gender || null}
                      onChange={(v) => setField('gender', v ?? '')}
                      radius="md"
                      id="modal-gender"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Date of Birth"
                      type="date"
                      max={todayIso()}
                      error={birthInFuture() ? BIRTH_IN_FUTURE : undefined}
                      value={formData.birthDate}
                      onChange={(e) => setField('birthDate', e.currentTarget.value)}
                      radius="md"
                      id="modal-birth-date"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="National ID / Ghana Card"
                      placeholder="e.g. GHA-723456789-1"
                      value={formData.nationalId}
                      onChange={(e) => setField('nationalId', e.currentTarget.value)}
                      radius="md"
                      id="modal-national-id"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Nationality"
                      placeholder="e.g. Ghanaian"
                      value={formData.nationality}
                      onChange={(e) => setField('nationality', e.currentTarget.value)}
                      radius="md"
                      id="modal-nationality"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Religion"
                      data={['Christian', 'Muslim', 'Traditional', 'Other']}
                      value={formData.religion || null}
                      onChange={(v) => setField('religion', v ?? '')}
                      radius="md"
                      id="modal-religion"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Residential Address"
                      placeholder="e.g. Hse 14, Airport Residential, Accra"
                      value={formData.residence}
                      onChange={(e) => setField('residence', e.currentTarget.value)}
                      radius="md"
                      id="modal-residence"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Digital Address (GhanaPost GPS)"
                      placeholder="e.g. GA-183-9020"
                      value={formData.digitalAddress}
                      onChange={(e) => setField('digitalAddress', e.currentTarget.value)}
                      radius="md"
                      id="modal-digital-address"
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Stepper.Step>

            {/* Step 2: Academic Placement */}
            <Stepper.Step label="Academics" description="Class & Cohort">
              <Stack gap="sm" mt="md">
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  style={{ letterSpacing: '0.05em' }}
                >
                  Enrollment Placement & School Program
                </Text>

                <Grid gutter="sm">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Class Cohort"
                      placeholder="Assign to classroom cohort"
                      data={modalClassOptions}
                      value={formData.classId}
                      onChange={(v) => setField('classId', v || '')}
                      required
                      radius="md"
                      id="modal-class-select"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Department / Track"
                      data={[
                        'Creche & Nursery',
                        'Kindergarten',
                        'Primary',
                        'Junior High',
                        'Senior High (General Science)',
                        'Senior High (General Arts)',
                        'Senior High (Business)',
                      ]}
                      value={formData.department || null}
                      onChange={(v) => setField('department', v ?? '')}
                      radius="md"
                      id="modal-department"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Previous School Attended"
                      placeholder="e.g. Morning Star Preparatory"
                      value={formData.previousSchool}
                      onChange={(e) => setField('previousSchool', e.currentTarget.value)}
                      radius="md"
                      id="modal-previous-school"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Boarding Status"
                      data={['Day', 'Boarding']}
                      value={formData.boardingStatus || null}
                      onChange={(v) => setField('boardingStatus', v ?? '')}
                      radius="md"
                      id="modal-boarding-status"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Transportation Route"
                      data={[
                        'None (Self Transport)',
                        'Route 1: Airport / East Legon / Dzorwulu',
                        'Route 2: Achimota / Dome / West Legon',
                        'Route 3: Spintex / Tema Community 18',
                        'Route 4: Cantonments / Osu / Labone',
                      ]}
                      value={formData.transportRoute}
                      onChange={(v) => setField('transportRoute', v || 'None (Self Transport)')}
                      radius="md"
                      id="modal-transport-route"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Entrance Exam Notes / Remarks"
                      placeholder="e.g. Admitted on merit; strong literacy"
                      value={formData.entranceExamNotes}
                      onChange={(e) => setField('entranceExamNotes', e.currentTarget.value)}
                      radius="md"
                      id="modal-exam-notes"
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Stepper.Step>

            {/* Step 3: Guardian Details */}
            <Stepper.Step label="Guardians" description="Mother & Father">
              <Stack gap="sm" mt="md">
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  style={{ letterSpacing: '0.05em' }}
                >
                  Mother & Maternal Information
                </Text>
                <Grid gutter="sm">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Mother's Full Name"
                      placeholder="e.g. Akosua Mensah"
                      value={formData.motherName}
                      onChange={(e) => setField('motherName', e.currentTarget.value)}
                      radius="md"
                      id="modal-mother-name"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Mother's Phone Contact"
                      placeholder="e.g. +233244111222"
                      value={formData.motherContact}
                      onChange={(e) => setField('motherContact', e.currentTarget.value)}
                      radius="md"
                      id="modal-mother-phone"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Mother's Email Address"
                      placeholder="e.g. akosua@example.com"
                      {...emailInputProps}
                      autoComplete="off"
                      value={formData.motherEmail}
                      onChange={(e) => setField('motherEmail', e.currentTarget.value)}
                      radius="md"
                      id="modal-mother-email"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Mother's Occupation"
                      placeholder="e.g. Chartered Accountant"
                      value={formData.motherOccupation}
                      onChange={(e) => setField('motherOccupation', e.currentTarget.value)}
                      radius="md"
                      id="modal-mother-occupation"
                    />
                  </Grid.Col>
                </Grid>

                <Divider my="xs" label="Father & Paternal Information" labelPosition="center" />

                <Grid gutter="sm">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Father's Full Name"
                      placeholder="e.g. Kojo Mensah"
                      value={formData.fatherName}
                      onChange={(e) => setField('fatherName', e.currentTarget.value)}
                      radius="md"
                      id="modal-father-name"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Father's Phone Contact"
                      placeholder="e.g. +233244333444"
                      value={formData.fatherContact}
                      onChange={(e) => setField('fatherContact', e.currentTarget.value)}
                      radius="md"
                      id="modal-father-phone"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Father's Email Address"
                      placeholder="e.g. kojo@example.com"
                      {...emailInputProps}
                      autoComplete="off"
                      value={formData.fatherEmail}
                      onChange={(e) => setField('fatherEmail', e.currentTarget.value)}
                      radius="md"
                      id="modal-father-email"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Father's Occupation"
                      placeholder="e.g. Civil Engineer"
                      value={formData.fatherOccupation}
                      onChange={(e) => setField('fatherOccupation', e.currentTarget.value)}
                      radius="md"
                      id="modal-father-occupation"
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Stepper.Step>

            {/* Step 4: Health & Emergency */}
            <Stepper.Step label="Health & Safety" description="Medical & Emergency">
              <Stack gap="sm" mt="md">
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  tt="uppercase"
                  style={{ letterSpacing: '0.05em' }}
                >
                  Student Health & Medical Profile
                </Text>

                <Grid gutter="sm">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Blood Group"
                      data={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
                      value={formData.bloodGroup || null}
                      onChange={(v) => setField('bloodGroup', v ?? '')}
                      radius="md"
                      id="modal-blood-group"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Genotype"
                      data={['AA', 'AS', 'SS', 'AC']}
                      value={formData.genotype || null}
                      onChange={(v) => setField('genotype', v ?? '')}
                      radius="md"
                      id="modal-genotype"
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Textarea
                      label="Allergies & Medical Notes"
                      placeholder="e.g. Asthmatic, allergic to peanuts. Carries Ventolin inhaler."
                      minRows={2}
                      value={formData.allergiesMedicalNotes}
                      onChange={(e) => setField('allergiesMedicalNotes', e.currentTarget.value)}
                      radius="md"
                      id="modal-allergies-notes"
                    />
                  </Grid.Col>
                </Grid>

                <Divider
                  my="xs"
                  label="Emergency Contact (Alternate to Parents)"
                  labelPosition="center"
                />

                <Grid gutter="sm">
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                      label="Emergency Contact Person"
                      placeholder="e.g. Uncle Kwame Mensah"
                      value={formData.emergencyContactName}
                      onChange={(e) => setField('emergencyContactName', e.currentTarget.value)}
                      radius="md"
                      id="modal-emergency-name"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                      label="Emergency Phone"
                      placeholder="e.g. +233244999888"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setField('emergencyContactPhone', e.currentTarget.value)}
                      radius="md"
                      id="modal-emergency-phone"
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Select
                      label="Relationship"
                      data={[
                        'Mother',
                        'Father',
                        'Uncle',
                        'Aunt',
                        'Grandparent',
                        'Guardian',
                        'Family Friend',
                      ]}
                      value={formData.emergencyContactRelationship || null}
                      onChange={(v) => setField('emergencyContactRelationship', v ?? '')}
                      radius="md"
                      id="modal-emergency-relationship"
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Stepper.Step>
          </Stepper>

          {/* Stepper Navigation Buttons */}
          <Group justify="space-between" mt="xl" pt="sm" style={{ borderTop: '1px solid #f1f5f9' }}>
            <Group gap="xs">
              <Button variant="default" onClick={onClose} radius="md">
                Cancel
              </Button>
              {activeStep > 0 ? (
                <Button
                  variant="subtle"
                  leftSection={<ArrowLeft size={16} />}
                  onClick={handlePrevStep}
                  radius="md"
                  id="btn-stepper-back"
                >
                  Previous Step
                </Button>
              ) : null}
            </Group>

            {activeStep < 3 ? (
              // Distinct keys so React replaces the button instead of turning the
              // clicked Next Step into a submit mid-click (QA-210).
              <Button
                key="next"
                type="button"
                rightSection={<ArrowRight size={16} />}
                color="fastrackRed"
                onClick={handleNextStep}
                radius="md"
                id="btn-stepper-next"
              >
                Next Step
              </Button>
            ) : (
              <Button
                key="submit"
                type="submit"
                color="fastrackRed"
                radius="md"
                loading={isSubmitting}
                id="modal-btn-submit-admission"
              >
                Complete Admission
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
