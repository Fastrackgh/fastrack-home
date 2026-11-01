'use client';

import { Anchor, Avatar, Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useWardProfile } from '../data/queries';
import { formatDate, joinDetails } from '../domain/format';
import { wardInitials, wardName, wardStatusColor, wardStatusLabel } from '../domain/wards';
import { parentRoutes } from '../routes';
import type { Guardian, WardProfile } from '../types';
import { BackLink, LabelledValue, QueryView } from '../ui';

export function WardProfilePage({ studentId }: { studentId: string }) {
  const query = useWardProfile(studentId);
  return (
    <>
      <BackLink href={parentRoutes.wards}>My children</BackLink>
      <QueryView query={query}>
        {(ward) => (
          <Stack gap="md">
            <ProfileCard ward={ward} />
            <SchoolCard school={ward.school} />
            <GuardiansCard guardians={ward.guardians} />
          </Stack>
        )}
      </QueryView>
    </>
  );
}

function ProfileCard({ ward }: { ward: WardProfile }) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Group wrap="nowrap">
        <Avatar src={ward.photoUrl ?? undefined} color="fastrackRed" radius="xl" size={72}>
          {wardInitials(ward)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Title order={3}>
            {wardName(ward)}
            {ward.otherName ? ` ${ward.otherName}` : ''}
          </Title>
          <Text size="sm" c="dimmed">
            {ward.currentClass?.name ?? 'No class assigned'}
          </Text>
          <Badge mt={6} size="sm" variant="light" color={wardStatusColor(ward.status)}>
            {wardStatusLabel(ward.status)}
          </Badge>
        </div>
      </Group>
      <SimpleGrid cols={{ base: 2, sm: 3 }} mt="lg" spacing="md">
        <LabelledValue label="Student code" value={ward.studentCode} />
        <LabelledValue label="Date of birth" value={formatDate(ward.birthDate)} />
        <LabelledValue label="Gender" value={ward.gender} />
        <LabelledValue label="Department" value={ward.currentClass?.department} />
        <LabelledValue label="Boarding" value={ward.boardingStatus} />
        <LabelledValue label="Admitted" value={formatDate(ward.admissionDate)} />
        <LabelledValue label="Your relationship" value={ward.relationship} />
      </SimpleGrid>
    </Card>
  );
}

function SchoolCard({ school }: { school: WardProfile['school'] }) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Text fw={700} mb="sm">
        School
      </Text>
      <Text fw={600}>{school.name}</Text>
      <Stack gap={6} mt="xs">
        {school.address && (
          <Group gap={8} c="dimmed">
            <MapPin size={14} />
            <Text size="sm">{school.address}</Text>
          </Group>
        )}
        {school.phone && (
          <Anchor href={`tel:${school.phone.replace(/\s/g, '')}`} size="sm">
            <Group gap={8}>
              <Phone size={14} /> {school.phone}
            </Group>
          </Anchor>
        )}
        {school.email && (
          <Anchor href={`mailto:${school.email}`} size="sm">
            <Group gap={8}>
              <Mail size={14} /> {school.email}
            </Group>
          </Anchor>
        )}
      </Stack>
    </Card>
  );
}

function GuardiansCard({ guardians }: { guardians: Guardian[] }) {
  if (guardians.length === 0) return null;
  return (
    <Card withBorder radius="lg" padding="lg">
      <Text fw={700} mb="sm">
        Guardians on file
      </Text>
      <Stack gap="sm">
        {guardians.map((guardian) => (
          <div key={`${guardian.name}${guardian.phone}`}>
            <Text size="sm" fw={600}>
              {guardian.name}
            </Text>
            <Text size="xs" c="dimmed">
              {joinDetails(guardian.relationship, guardian.phone, guardian.email)}
            </Text>
          </div>
        ))}
      </Stack>
      <Text size="xs" c="dimmed" mt="md">
        To change these details, contact the school office.
      </Text>
    </Card>
  );
}
