'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  Download,
  Filter,
  TrendingUp,
  UserPlus,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { DashboardShell } from '@/components/organisms';

type Student = {
  id: string;
  name: string;
  grade: string;
  gender: 'Male' | 'Female';
  guardian: string;
  contact: string;
  status: 'Active' | 'Inactive';
  attendance: number;
  balance: string;
};

const students: Student[] = [
  { id: 'FTS-0001', name: 'Kwame Mensah', grade: 'JHS 1', gender: 'Male', guardian: 'Akosua Mensah', contact: '024 555 1010', status: 'Active', attendance: 96, balance: 'Paid' },
  { id: 'FTS-0002', name: 'Abena Owusu', grade: 'JHS 1', gender: 'Female', guardian: 'Kofi Owusu', contact: '020 555 1212', status: 'Active', attendance: 92, balance: 'GHS 150' },
  { id: 'FTS-0003', name: 'Yaw Boateng', grade: 'JHS 2', gender: 'Male', guardian: 'Yaw Boateng Sr.', contact: '027 555 1313', status: 'Active', attendance: 88, balance: 'Paid' },
  { id: 'FTS-0004', name: 'Akua Danso', grade: 'JHS 2', gender: 'Female', guardian: 'Comfort Danso', contact: '055 555 1414', status: 'Active', attendance: 97, balance: 'Paid' },
  { id: 'FTS-0005', name: 'Kofi Asante', grade: 'SHS 1', gender: 'Male', guardian: 'Mary Asante', contact: '024 555 1515', status: 'Active', attendance: 74, balance: 'GHS 320' },
  { id: 'FTS-0006', name: 'Efua Appiah', grade: 'SHS 1', gender: 'Female', guardian: 'Daniel Appiah', contact: '020 555 1616', status: 'Active', attendance: 99, balance: 'Paid' },
  { id: 'FTS-0007', name: 'Kojo Antwi', grade: 'SHS 2', gender: 'Male', guardian: 'Grace Antwi', contact: '027 555 1717', status: 'Inactive', attendance: 41, balance: 'GHS 480' },
  { id: 'FTS-0008', name: 'Ama Serwaa', grade: 'SHS 2', gender: 'Female', guardian: 'Nana Serwaa', contact: '055 555 1818', status: 'Active', attendance: 95, balance: 'Paid' },
  { id: 'FTS-0009', name: 'Nana Yaa Kyerewaa', grade: 'JHS 1', gender: 'Female', guardian: 'Elizabeth Kyerewaa', contact: '024 555 1919', status: 'Active', attendance: 90, balance: 'GHS 75' },
  { id: 'FTS-0010', name: 'Kweku Nyarko', grade: 'SHS 1', gender: 'Male', guardian: 'Adwoa Nyarko', contact: '020 555 2020', status: 'Active', attendance: 86, balance: 'Paid' },
  { id: 'FTS-0011', name: 'Adwoa Safo', grade: 'JHS 2', gender: 'Female', guardian: 'Kwabena Safo', contact: '027 555 2121', status: 'Active', attendance: 93, balance: 'Paid' },
  { id: 'FTS-0012', name: 'Yaw Darko', grade: 'SHS 2', gender: 'Male', guardian: 'Gifty Darko', contact: '055 555 2222', status: 'Active', attendance: 81, balance: 'GHS 210' },
];

const summaryStats = [
  { title: 'Total Students', value: '1,447', icon: Users, color: '#2563eb', tint: 'rgba(37, 99, 235, 0.1)' },
  { title: 'Active', value: '1,421', icon: UserCheck, color: '#16a34a', tint: 'rgba(22, 163, 74, 0.1)' },
  { title: 'Inactive', value: '26', icon: UserX, color: '#e01a2b', tint: 'rgba(224, 26, 43, 0.1)' },
  { title: 'New This Term', value: '58', icon: TrendingUp, color: '#ea580c', tint: 'rgba(234, 88, 12, 0.1)' },
];

const PAGE_SIZE = 8;

export default function StudentsPage() {
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesQuery =
        query.trim() === '' ||
        `${s.name} ${s.id} ${s.guardian}`.toLowerCase().includes(query.trim().toLowerCase());
      const matchesGrade = !gradeFilter || gradeFilter === 'All grades' || s.grade === gradeFilter;
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchesQuery && matchesGrade && matchesStatus;
    });
  }, [query, gradeFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <DashboardShell
      active="students"
      title="Students"
      subtitle="Manage enrollment, guardian contacts and student records."
      actions={
        <>
          <Button variant="default" radius="md" leftSection={<Download size={15} />}>
            Export
          </Button>
          <Button radius="md" color="fastrackRed" leftSection={<UserPlus size={15} />}>
            Add Student
          </Button>
        </>
      }
    >
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {summaryStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              <Card radius="lg" p="lg" withBorder style={{ borderColor: '#e8edf3', height: '100%' }}>
                <Group justify="space-between" align="center">
                  <Box
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: stat.tint,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} color={stat.color} />
                  </Box>
                </Group>
                <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
                  {stat.value}
                </Text>
                <Text size="sm" c="dimmed">
                  {stat.title}
                </Text>
              </Card>
            </motion.div>
          );
        })}
      </SimpleGrid>

      <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Group gap="sm" wrap="wrap">
            <TextInput
              placeholder="Search by name, ID or guardian…"
              value={query}
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setPage(1);
              }}
              radius="md"
              w={280}
            />
            <Select
              placeholder="Grade"
              data={['All grades', 'JHS 1', 'JHS 2', 'SHS 1', 'SHS 2']}
              value={gradeFilter}
              onChange={(v) => {
                setGradeFilter(v);
                setPage(1);
              }}
              radius="md"
              clearable
              w={150}
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
          <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 720 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Student</Table.Th>
                <Table.Th>ID</Table.Th>
                <Table.Th>Grade</Table.Th>
                <Table.Th>Guardian</Table.Th>
                <Table.Th>Contact</Table.Th>
                <Table.Th>Attendance</Table.Th>
                <Table.Th>Fee Balance</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((student) => (
                <Table.Tr key={student.id}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Avatar radius="xl" size={32} color="fastrackRed">
                        {student.name
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')}
                      </Avatar>
                      <Text fw={600} size="sm">
                        {student.name}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {student.id}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="gray" radius="sm" tt="none">
                      {student.grade}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{student.guardian}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {student.contact}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600} c={student.attendance < 75 ? '#e01a2b' : undefined}>
                      {student.attendance}%
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      radius="sm"
                      tt="none"
                      color={student.balance === 'Paid' ? 'green' : 'orange'}
                    >
                      {student.balance}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      radius="sm"
                      color={student.status === 'Active' ? 'green' : 'red'}
                    >
                      {student.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
              {rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Stack align="center" py="xl" gap={4}>
                      <Filter size={22} color="#94a3b8" />
                      <Text size="sm" c="dimmed">
                        No students match your filters.
                      </Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        <Group justify="space-between" mt="md" wrap="wrap">
          <Text size="sm" c="dimmed">
            Showing {rows.length} of {filtered.length} students
          </Text>
          <Pagination
            total={pageCount}
            value={currentPage}
            onChange={setPage}
            color="fastrackRed"
            radius="md"
          />
        </Group>
      </Card>
    </DashboardShell>
  );
}
