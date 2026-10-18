'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Loader,
  Modal,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Download,
  Filter,
  HeartPulse,
  RefreshCw,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { DashboardShell } from '@/components/organisms';
import { apiClient } from '@/lib/api-client';

interface StudentListItem {
  id: string;
  studentId: string;
  studentCode: string;
  firstName: string;
  surname: string;
  otherName?: string | null;
  fullName: string;
  gender: 'Male' | 'Female' | string;
  status: 'Active' | 'Inactive' | string;
  classId: string;
  classCode?: string;
  className: string;
  guardianName?: string | null;
  guardianContact?: string | null;
  nationalId?: string | null;
  bloodGroup?: string | null;
  boardingStatus?: string | null;
  admissionDate?: string | null;
  createdAt: string;
}

interface SchoolClass {
  id: string;
  classCode: string;
  className: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface AcademicContext {
  yearId: string;
  yearLabel: string;
  termId: string;
  termLabel: string;
}

const initialFormData = {
  // Step 1: Personal Details
  firstName: '',
  surname: '',
  otherName: '',
  gender: 'Male',
  birthDate: '',
  nationalId: '',
  nationality: 'Ghanaian',
  religion: 'Christian',
  residence: '',
  digitalAddress: '',

  // Step 2: Academic Placement
  classId: '',
  department: 'Primary',
  previousSchool: '',
  boardingStatus: 'Day',
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
  bloodGroup: 'O+',
  genotype: 'AA',
  allergiesMedicalNotes: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: 'Mother',
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicContext, setAcademicContext] = useState<AcademicContext | null>(null);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Admit Student Modal & Stepper state
  const [admitOpened, { open: openAdmit, close: closeAdmit }] = useDisclosure(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState(initialFormData);

  // Fetch initial classes and academic context
  useEffect(() => {
    async function loadPrerequisites() {
      try {
        const [classesRes, yearRes, termRes] = await Promise.allSettled([
          apiClient.get<SchoolClass[]>('/schools/me/classes'),
          apiClient.get<{ id: string; yearLabel: string }>('/schools/me/academic-years/current'),
          apiClient.get<{ id: string; termLabel: string }>('/schools/me/academic-terms/current'),
        ]);

        if (classesRes.status === 'fulfilled' && classesRes.value.data) {
          setClasses(classesRes.value.data);
        }

        const year = yearRes.status === 'fulfilled' ? yearRes.value.data : null;
        const term = termRes.status === 'fulfilled' ? termRes.value.data : null;

        if (year && term) {
          setAcademicContext({
            yearId: year.id,
            yearLabel: year.yearLabel,
            termId: term.id,
            termLabel: term.termLabel,
          });
        }
      } catch (err) {
        console.error('Failed to load classes or calendar:', err);
      }
    }
    loadPrerequisites();
  }, []);

  // Fetch students with filtering & pagination
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '10');
      if (query.trim()) params.append('search', query.trim());
      if (gradeFilter && gradeFilter !== 'all' && gradeFilter.trim() !== '') params.append('classId', gradeFilter);
      if (statusFilter && statusFilter !== 'All' && statusFilter.trim() !== '') params.append('status', statusFilter);

      const res = await apiClient.get<StudentListItem[]>(`/schools/me/students?${params.toString()}`);
      if (res.data) {
        setStudents(res.data);
      }
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch students:', err);
      notifications.show({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Could not fetch students list.',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, query, gradeFilter, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Stepper navigation and step validation
  const validateStep = (step: number): boolean => {
    setFormError(null);
    if (step === 0) {
      if (!formData.firstName.trim() || !formData.surname.trim()) {
        setFormError('First Name and Surname are required to proceed.');
        return false;
      }
    }
    if (step === 1) {
      if (!formData.classId) {
        setFormError('Please select a Class Cohort for admission.');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep((current) => (current < 3 ? current + 1 : current));
    }
  };

  const handlePrevStep = () => {
    setFormError(null);
    setActiveStep((current) => (current > 0 ? current - 1 : current));
  };

  // Handle admit submission
  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.firstName.trim() || !formData.surname.trim()) {
      setFormError('First name and surname are required.');
      setActiveStep(0);
      return;
    }
    if (!formData.classId) {
      setFormError('Please select a class for admission.');
      setActiveStep(1);
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
        gender: formData.gender,
        admissionAcademicYearId: academicContext.yearId,
        admissionTermId: academicContext.termId,
        admissionClassId: formData.classId,
      };

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
      if (formData.entranceExamNotes.trim()) payload.entranceExamNotes = formData.entranceExamNotes.trim();

      if (formData.motherName.trim()) payload.motherName = formData.motherName.trim();
      if (formData.motherContact.trim()) payload.motherContact = formData.motherContact.trim();
      if (formData.motherEmail.trim()) payload.motherEmail = formData.motherEmail.trim();
      if (formData.motherOccupation.trim()) payload.motherOccupation = formData.motherOccupation.trim();

      if (formData.fatherName.trim()) payload.fatherName = formData.fatherName.trim();
      if (formData.fatherContact.trim()) payload.fatherContact = formData.fatherContact.trim();
      if (formData.fatherEmail.trim()) payload.fatherEmail = formData.fatherEmail.trim();
      if (formData.fatherOccupation.trim()) payload.fatherOccupation = formData.fatherOccupation.trim();

      if (formData.bloodGroup) payload.bloodGroup = formData.bloodGroup;
      if (formData.genotype) payload.genotype = formData.genotype;
      if (formData.allergiesMedicalNotes.trim()) payload.allergiesMedicalNotes = formData.allergiesMedicalNotes.trim();
      if (formData.emergencyContactName.trim()) payload.emergencyContactName = formData.emergencyContactName.trim();
      if (formData.emergencyContactPhone.trim()) payload.emergencyContactPhone = formData.emergencyContactPhone.trim();
      if (formData.emergencyContactRelationship.trim()) {
        payload.emergencyContactRelationship = formData.emergencyContactRelationship.trim();
      }

      const res = await apiClient.post<{
        fullName: string;
        studentCode: string;
      }>('/schools/me/students', payload);

      notifications.show({
        title: 'Student Admitted Successfully',
        message: `${res.data.fullName} enrolled with code: ${res.data.studentCode}`,
        color: 'green',
        icon: <CheckCircle size={18} />,
        autoClose: 5000,
      });

      // Reset form, stepper & close modal
      setFormData(initialFormData);
      setActiveStep(0);
      closeAdmit();
      fetchStudents();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to admit student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const classSelectOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All classes' },
      ...classes.map((c) => ({ value: c.id, label: `${c.className} (${c.classCode})` })),
    ];
  }, [classes]);

  const modalClassOptions = useMemo(() => {
    return classes.map((c) => ({ value: c.id, label: `${c.className} (${c.classCode})` }));
  }, [classes]);

  // Derived stats
  const totalStudents = meta.total;
  const activeCount = useMemo(() => {
    return students.filter((s) => s.status?.toLowerCase() === 'active').length;
  }, [students]);

  return (
    <DashboardShell
      active="students"
      title="Student Directory"
      subtitle="Comprehensive student admissions, enrollment dossiers & classroom assignments"
    >
      {/* Header action bar */}
      <Group justify="space-between" mb="lg" wrap="wrap">
        <Box>
          <Title order={3} style={{ fontFamily: 'var(--font-heading)' }}>
            Students Management
          </Title>
          <Text size="sm" c="dimmed">
            Manage student registrations, personal dossiers, guardians & class cohorts
          </Text>
        </Box>
        <Group gap="xs">
          <Button
            leftSection={<RefreshCw size={16} />}
            variant="default"
            radius="md"
            onClick={() => fetchStudents()}
            loading={isLoading}
          >
            Refresh
          </Button>
          <Button
            leftSection={<UserPlus size={16} />}
            color="fastrackRed"
            radius="md"
            onClick={() => {
              setFormData(initialFormData);
              setActiveStep(0);
              setFormError(null);
              openAdmit();
            }}
            id="btn-admit-student"
          >
            Admit New Student
          </Button>
        </Group>
      </Group>

      {/* Metric Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Total Enrolled
            </Text>
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(224, 26, 43, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} color="#e01a2b" />
            </Box>
          </Group>
          <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
            {totalStudents}
          </Text>
          <Text size="sm" c="dimmed">
            Across {classes.length} classroom cohorts
          </Text>
        </Card>

        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Active Students
            </Text>
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={20} color="#10b981" />
            </Box>
          </Group>
          <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
            {activeCount}
          </Text>
          <Text size="sm" c="teal.7">
            Currently attending classes
          </Text>
        </Card>

        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Academic Year
            </Text>
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={20} color="#3b82f6" />
            </Box>
          </Group>
          <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
            {academicContext?.yearLabel || '2026/2027'}
          </Text>
          <Text size="sm" c="dimmed">
            Active School Year
          </Text>
        </Card>

        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Current Term
            </Text>
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(224, 26, 43, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserX size={20} color="#e01a2b" />
            </Box>
          </Group>
          <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
            {academicContext?.termLabel || 'Term 2'}
          </Text>
          <Text size="sm" c="dimmed">
            Active Term Session
          </Text>
        </Card>
      </SimpleGrid>

      {/* Main Table Card */}
      <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Group gap="sm" wrap="wrap">
            <TextInput
              placeholder="Search by student name or code…"
              value={query}
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setPage(1);
              }}
              radius="md"
              w={280}
              id="input-search-student"
            />
            <Select
              placeholder="Filter by Class"
              data={classSelectOptions}
              value={gradeFilter || 'all'}
              onChange={(v) => {
                setGradeFilter(v === 'all' || !v ? null : v);
                setPage(1);
              }}
              radius="md"
              w={180}
              id="select-filter-class"
            />
          </Group>
          <SegmentedControl
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            data={['All', 'Active', 'Inactive']}
            radius="md"
          />
        </Group>

        <ScrollArea>
          <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 840 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Student</Table.Th>
                <Table.Th>Student Code</Table.Th>
                <Table.Th>Class</Table.Th>
                <Table.Th>Gender</Table.Th>
                <Table.Th>Guardian</Table.Th>
                <Table.Th>Guardian Contact</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Stack align="center" py="xl" gap="sm">
                      <Loader size="sm" color="fastrackRed" />
                      <Text size="sm" c="dimmed">
                        Loading student records from server…
                      </Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : students.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Stack align="center" py="xl" gap={4}>
                      <Filter size={22} color="#94a3b8" />
                      <Text size="sm" c="dimmed">
                        No students match your filter criteria.
                      </Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                students.map((student) => {
                  const initials = `${student.firstName?.[0] || ''}${student.surname?.[0] || ''}`.toUpperCase();
                  return (
                    <Table.Tr key={student.id} id={`row-student-${student.studentCode}`}>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Avatar radius="xl" size={32} color="fastrackRed">
                            {initials}
                          </Avatar>
                          <Box>
                            <Text fw={600} size="sm">
                              {student.fullName}
                            </Text>
                            {student.nationalId ? (
                              <Text size="xs" c="dimmed">
                                ID: {student.nationalId}
                              </Text>
                            ) : null}
                          </Box>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="outline" color="dark" radius="sm" tt="none">
                          {student.studentCode}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="blue" radius="sm" tt="none">
                          {student.className || student.classCode}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={student.gender?.toLowerCase() === 'female' ? 'pink' : 'blue'}
                          radius="sm"
                          tt="none"
                        >
                          {student.gender || '—'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{student.guardianName || '—'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {student.guardianContact || '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <Badge
                            variant="light"
                            radius="sm"
                            color={student.status?.toLowerCase() === 'active' ? 'green' : 'red'}
                          >
                            {student.status}
                          </Badge>
                          {student.boardingStatus && student.boardingStatus !== 'Day' ? (
                            <Badge variant="outline" color="orange" radius="sm" size="xs">
                              {student.boardingStatus}
                            </Badge>
                          ) : null}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        <Group justify="space-between" mt="md" wrap="wrap">
          <Text size="sm" c="dimmed">
            Showing {students.length} of {meta.total} registered students
          </Text>
          <Pagination
            total={meta.totalPages || 1}
            value={page}
            onChange={setPage}
            color="fastrackRed"
            radius="md"
          />
        </Group>
      </Card>

      {/* 4-Step Comprehensive Student Admission Stepper Modal */}
      <Modal
        opened={admitOpened}
        onClose={closeAdmit}
        closeOnClickOutside={false}
        title={
          <Box>
            <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
              Comprehensive Student Enrollment
            </Title>
            <Text size="xs" c="dimmed">
              Session: {academicContext ? `${academicContext.yearLabel} • ${academicContext.termLabel}` : 'Active Session'}
            </Text>
          </Box>
        }
        size="xl"
        radius="lg"
        centered
      >
        <form onSubmit={handleAdmit}>
          <Stack gap="md">
            {formError ? (
              <Alert icon={<AlertCircle size={16} />} title="Admission Form Alert" color="red" radius="md">
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
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                    Student Identity & Demographics
                  </Text>

                  <Grid gutter="sm">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="First Name"
                        placeholder="e.g. Kwame"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.currentTarget.value })}
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
                        onChange={(e) => setFormData({ ...formData, surname: e.currentTarget.value })}
                        radius="md"
                        id="modal-surname"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Middle / Other Name"
                        placeholder="e.g. Kofi"
                        value={formData.otherName}
                        onChange={(e) => setFormData({ ...formData, otherName: e.currentTarget.value })}
                        radius="md"
                        id="modal-other-name"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="Gender"
                        data={['Male', 'Female']}
                        value={formData.gender}
                        onChange={(v) => setFormData({ ...formData, gender: v || 'Male' })}
                        radius="md"
                        id="modal-gender"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Date of Birth"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.currentTarget.value })}
                        radius="md"
                        id="modal-birth-date"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="National ID / Ghana Card"
                        placeholder="e.g. GHA-723456789-1"
                        value={formData.nationalId}
                        onChange={(e) => setFormData({ ...formData, nationalId: e.currentTarget.value })}
                        radius="md"
                        id="modal-national-id"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Nationality"
                        placeholder="e.g. Ghanaian"
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.currentTarget.value })}
                        radius="md"
                        id="modal-nationality"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="Religion"
                        data={['Christian', 'Muslim', 'Traditional', 'Other']}
                        value={formData.religion}
                        onChange={(v) => setFormData({ ...formData, religion: v || 'Christian' })}
                        radius="md"
                        id="modal-religion"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Residential Address"
                        placeholder="e.g. Hse 14, Airport Residential, Accra"
                        value={formData.residence}
                        onChange={(e) => setFormData({ ...formData, residence: e.currentTarget.value })}
                        radius="md"
                        id="modal-residence"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Digital Address (GhanaPost GPS)"
                        placeholder="e.g. GA-183-9020"
                        value={formData.digitalAddress}
                        onChange={(e) => setFormData({ ...formData, digitalAddress: e.currentTarget.value })}
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
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                    Enrollment Placement & School Program
                  </Text>

                  <Grid gutter="sm">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="Class Cohort"
                        placeholder="Assign to classroom cohort"
                        data={modalClassOptions}
                        value={formData.classId}
                        onChange={(v) => setFormData({ ...formData, classId: v || '' })}
                        required
                        radius="md"
                        id="modal-class-select"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="Department / Track"
                        data={['Creche & Nursery', 'Kindergarten', 'Primary', 'Junior High', 'Senior High (General Science)', 'Senior High (General Arts)', 'Senior High (Business)']}
                        value={formData.department}
                        onChange={(v) => setFormData({ ...formData, department: v || 'Primary' })}
                        radius="md"
                        id="modal-department"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Previous School Attended"
                        placeholder="e.g. Morning Star Preparatory"
                        value={formData.previousSchool}
                        onChange={(e) => setFormData({ ...formData, previousSchool: e.currentTarget.value })}
                        radius="md"
                        id="modal-previous-school"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="Boarding Status"
                        data={['Day', 'Boarding']}
                        value={formData.boardingStatus}
                        onChange={(v) => setFormData({ ...formData, boardingStatus: v || 'Day' })}
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
                        onChange={(v) => setFormData({ ...formData, transportRoute: v || 'None (Self Transport)' })}
                        radius="md"
                        id="modal-transport-route"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Entrance Exam Notes / Remarks"
                        placeholder="e.g. Admitted on merit; strong literacy"
                        value={formData.entranceExamNotes}
                        onChange={(e) => setFormData({ ...formData, entranceExamNotes: e.currentTarget.value })}
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
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                    Mother & Maternal Information
                  </Text>
                  <Grid gutter="sm">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Mother's Full Name"
                        placeholder="e.g. Akosua Mensah"
                        value={formData.motherName}
                        onChange={(e) => setFormData({ ...formData, motherName: e.currentTarget.value })}
                        radius="md"
                        id="modal-mother-name"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Mother's Phone Contact"
                        placeholder="e.g. +233244111222"
                        value={formData.motherContact}
                        onChange={(e) => setFormData({ ...formData, motherContact: e.currentTarget.value })}
                        radius="md"
                        id="modal-mother-phone"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Mother's Email Address"
                        placeholder="e.g. akosua@example.com"
                        type="email"
                        value={formData.motherEmail}
                        onChange={(e) => setFormData({ ...formData, motherEmail: e.currentTarget.value })}
                        radius="md"
                        id="modal-mother-email"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Mother's Occupation"
                        placeholder="e.g. Chartered Accountant"
                        value={formData.motherOccupation}
                        onChange={(e) => setFormData({ ...formData, motherOccupation: e.currentTarget.value })}
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
                        onChange={(e) => setFormData({ ...formData, fatherName: e.currentTarget.value })}
                        radius="md"
                        id="modal-father-name"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Father's Phone Contact"
                        placeholder="e.g. +233244333444"
                        value={formData.fatherContact}
                        onChange={(e) => setFormData({ ...formData, fatherContact: e.currentTarget.value })}
                        radius="md"
                        id="modal-father-phone"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Father's Email Address"
                        placeholder="e.g. kojo@example.com"
                        type="email"
                        value={formData.fatherEmail}
                        onChange={(e) => setFormData({ ...formData, fatherEmail: e.currentTarget.value })}
                        radius="md"
                        id="modal-father-email"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <TextInput
                        label="Father's Occupation"
                        placeholder="e.g. Civil Engineer"
                        value={formData.fatherOccupation}
                        onChange={(e) => setFormData({ ...formData, fatherOccupation: e.currentTarget.value })}
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
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                    Student Health & Medical Profile
                  </Text>

                  <Grid gutter="sm">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="Blood Group"
                        data={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']}
                        value={formData.bloodGroup}
                        onChange={(v) => setFormData({ ...formData, bloodGroup: v || 'O+' })}
                        radius="md"
                        id="modal-blood-group"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Select
                        label="Genotype"
                        data={['AA', 'AS', 'SS', 'AC']}
                        value={formData.genotype}
                        onChange={(v) => setFormData({ ...formData, genotype: v || 'AA' })}
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
                        onChange={(e) => setFormData({ ...formData, allergiesMedicalNotes: e.currentTarget.value })}
                        radius="md"
                        id="modal-allergies-notes"
                      />
                    </Grid.Col>
                  </Grid>

                  <Divider my="xs" label="Emergency Contact (Alternate to Parents)" labelPosition="center" />

                  <Grid gutter="sm">
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <TextInput
                        label="Emergency Contact Person"
                        placeholder="e.g. Uncle Kwame Mensah"
                        value={formData.emergencyContactName}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.currentTarget.value })}
                        radius="md"
                        id="modal-emergency-name"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <TextInput
                        label="Emergency Phone"
                        placeholder="e.g. +233244999888"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.currentTarget.value })}
                        radius="md"
                        id="modal-emergency-phone"
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <Select
                        label="Relationship"
                        data={['Mother', 'Father', 'Uncle', 'Aunt', 'Grandparent', 'Guardian', 'Family Friend']}
                        value={formData.emergencyContactRelationship}
                        onChange={(v) => setFormData({ ...formData, emergencyContactRelationship: v || 'Uncle' })}
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
                <Button variant="default" onClick={closeAdmit} radius="md">
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
                <Button
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
    </DashboardShell>
  );
}
