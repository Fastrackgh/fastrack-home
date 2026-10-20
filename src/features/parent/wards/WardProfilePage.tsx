'use client';

import React from 'react';
import Link from 'next/link';
import { Anchor, Avatar, Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react';
import { parentApi } from '../api';
import { QueryView } from '../components';
import { formatDate, wardInitials, wardName, wardStatusColor, wardStatusLabel } from '../format';
import { useParentQuery } from '../useParentQuery';

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </div>
  );
}

export function WardProfilePage({ studentId }: { studentId: string }) {
  const query = useParentQuery(`ward:${studentId}`, () => parentApi.getWard(studentId));

  return (
    <>
      <Anchor
        component={Link}
        href="/parent/wards"
        size="sm"
        c="dimmed"
        mb="md"
        display="inline-flex"
        style={{ alignItems: 'center', gap: 4 }}
      >
        <ArrowLeft size={14} /> My children
      </Anchor>
      <QueryView query={query}>
        {(ward) => (
          <Stack gap="md">
            <Card withBorder radius="lg" padding="lg">
              <Group wrap="nowrap">
                <Avatar src={ward.photoUrl ?? undefined} color="fastrackRed" radius="xl" size={72}>
                  {wardInitials(ward)}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <Title order={3} style={{ fontFamily: 'var(--font-heading)' }}>
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
                <Detail label="Student code" value={ward.studentCode} />
                <Detail label="Date of birth" value={formatDate(ward.birthDate)} />
                <Detail label="Gender" value={ward.gender} />
                <Detail label="Department" value={ward.currentClass?.department} />
                <Detail label="House" value={ward.house} />
                <Detail label="Admitted" value={formatDate(ward.admissionDate)} />
                <Detail label="Your relationship" value={ward.relationship} />
              </SimpleGrid>
            </Card>

            <Card withBorder radius="lg" padding="lg">
              <Text fw={700} mb="sm">
                School
              </Text>
              <Text fw={600}>{ward.school.name}</Text>
              <Stack gap={6} mt="xs">
                {ward.school.address && (
                  <Group gap={8} c="dimmed">
                    <MapPin size={14} />
                    <Text size="sm">{ward.school.address}</Text>
                  </Group>
                )}
                {ward.school.phone && (
                  <Anchor href={`tel:${ward.school.phone.replace(/\s/g, '')}`} size="sm">
                    <Group gap={8}>
                      <Phone size={14} /> {ward.school.phone}
                    </Group>
                  </Anchor>
                )}
                {ward.school.email && (
                  <Anchor href={`mailto:${ward.school.email}`} size="sm">
                    <Group gap={8}>
                      <Mail size={14} /> {ward.school.email}
                    </Group>
                  </Anchor>
                )}
              </Stack>
            </Card>

            {ward.guardians.length > 0 && (
              <Card withBorder radius="lg" padding="lg">
                <Text fw={700} mb="sm">
                  Guardians on file
                </Text>
                <Stack gap="sm">
                  {ward.guardians.map((guardian) => (
                    <Group
                      key={`${guardian.name}${guardian.phone}`}
                      justify="space-between"
                      wrap="nowrap"
                    >
                      <div>
                        <Text size="sm" fw={600}>
                          {guardian.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {[guardian.relationship, guardian.phone, guardian.email]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </div>
                    </Group>
                  ))}
                </Stack>
                <Text size="xs" c="dimmed" mt="md">
                  To change these details, contact the school office.
                </Text>
              </Card>
            )}
          </Stack>
        )}
      </QueryView>
    </>
  );
}
