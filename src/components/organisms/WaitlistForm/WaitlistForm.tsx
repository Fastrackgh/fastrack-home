'use client';

import React, { useState } from 'react';
import {
  Box,
  Stack,
  Text,
  TextInput,
  Select,
  Button,
  SimpleGrid,
  Group,
  Badge,
} from '@mantine/core';
import { Check, ShieldCheck, ArrowRight } from 'lucide-react';

export const WaitlistForm: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    schoolName: '',
    adminName: '',
    email: '',
    phone: '',
    studentCount: '200-500',
    currentSystem: 'Manual Records / Excel',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.schoolName || !form.email || !form.adminName) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Box
        style={{
          padding: '36px 28px',
          borderRadius: '12px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          textAlign: 'center',
        }}
      >
        <Box
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: '#16a34a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Check size={28} strokeWidth={3} />
        </Box>

        <Badge size="md" color="green" variant="light" mb="xs">
          Waitlist Registration Confirmed
        </Badge>

        <Text
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: 8,
          }}
        >
          Registration Received for {form.schoolName}
        </Text>

        <Text size="sm" c="dimmed" style={{ maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.6 }}>
          Thank you. Our team from Fastrack Accra headquarters will send login credentials and system onboarding materials to <strong>{form.email}</strong>.
        </Text>

        <Box
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ShieldCheck size={16} color="#e01a2b" />
          <Text size="xs" fw={600} c="dark">
            Direct Support Line: +233-243-630 | fastrackus@gmail.com
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      style={{
        padding: '32px 28px',
        borderRadius: '12px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
      }}
    >
      <Group justify="space-between" align="center" mb="md">
        <Box>
          <Text
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1.25rem',
              color: '#0f172a',
            }}
          >
            Early Access Registration Form
          </Text>
          <Text size="xs" c="dimmed">
            Reserve priority cloud onboarding for your institution
          </Text>
        </Box>

        <Badge variant="outline" color="gray" size="sm">
          Phase 1 Onboarding
        </Badge>
      </Group>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="School / Institution Name"
              placeholder="e.g. Achimota Prep Academy"
              required
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
              radius="sm"
            />
            <TextInput
              label="Headmaster / Administrator Name"
              placeholder="e.g. Dr. Kwesi Boateng"
              required
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              radius="sm"
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Official Email Address"
              placeholder="admin@school.edu.gh"
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              radius="sm"
            />
            <TextInput
              label="Phone / WhatsApp Number"
              placeholder="+233 24 123 4567"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              radius="sm"
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Estimated Student Population"
              data={['Less than 200 Students', '200 - 500 Students', '500 - 1,500 Students', '1,500+ Students']}
              value={form.studentCount}
              onChange={(val) => setForm({ ...form, studentCount: val || '' })}
              radius="sm"
            />
            <Select
              label="Current Administration System"
              data={['Manual Records / Excel', 'Legacy Software', 'Paper-Based Only', 'Other']}
              value={form.currentSystem}
              onChange={(val) => setForm({ ...form, currentSystem: val || '' })}
              radius="sm"
            />
          </SimpleGrid>

          <Button
            type="submit"
            color="fastrackRed"
            size="md"
            radius="sm"
            rightSection={<ArrowRight size={16} />}
            style={{
              marginTop: 8,
              background: '#e01a2b',
              fontWeight: 700,
              height: 44,
            }}
          >
            Submit Early Access Request
          </Button>

          <Text size="10px" c="dimmed" style={{ textAlign: 'center' }}>
            Hosted in Accra, Ghana. Fastrack Management Services.
          </Text>
        </Stack>
      </form>
    </Box>
  );
};
