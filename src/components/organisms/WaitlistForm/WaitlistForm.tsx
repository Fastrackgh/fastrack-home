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
import { businessInfo } from '@/data/businessInfo';
import { motion } from 'framer-motion';

export const WaitlistForm: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    schoolName: '',
    adminName: '',
    email: '',
    phone: '',
    studentCount: '200 - 500 Students',
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
          padding: 'clamp(24px, 4vw, 40px)',
          borderRadius: '16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
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
            fontSize: 'clamp(1.25rem, 2vw, 1.6rem)',
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
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ShieldCheck size={16} color="#f97316" />
          <Text size="xs" fw={600} c="dark">
            Direct Support Line: {businessInfo.phone} | {businessInfo.email}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      style={{
        padding: 'clamp(20px, 3.5vw, 32px)',
        borderRadius: '16px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)',
      }}
    >
      <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="xs">
        <Box>
          <Text
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 'clamp(1.1rem, 1.8vw, 1.35rem)',
              color: '#0f172a',
            }}
          >
            Early Access Registration Form
          </Text>
          <Text size="xs" c="dimmed">
            Reserve priority cloud onboarding for your institution
          </Text>
        </Box>

        <Badge variant="light" color="orange" size="sm">
          Phase 1 Priority
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
              radius="md"
            />
            <TextInput
              label="Headmaster / Administrator Name"
              placeholder="e.g. Dr. Kwesi Boateng"
              required
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              radius="md"
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
              radius="md"
            />
            <TextInput
              label="Phone / WhatsApp Number"
              placeholder="0243-630-648"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              radius="md"
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Estimated Student Population"
              data={['Less than 200 Students', '200 - 500 Students', '500 - 1,500 Students', '1,500+ Students']}
              value={form.studentCount}
              onChange={(val) => setForm({ ...form, studentCount: val || '' })}
              radius="md"
            />
            <Select
              label="Current Administration System"
              data={['Manual Records / Excel', 'Legacy Software', 'Paper-Based Only', 'Other']}
              value={form.currentSystem}
              onChange={(val) => setForm({ ...form, currentSystem: val || '' })}
              radius="md"
            />
          </SimpleGrid>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              color="fastrackOrange"
              size="md"
              radius="xl"
              fullWidth
              rightSection={<ArrowRight size={16} />}
              style={{
                marginTop: 6,
                background: 'linear-gradient(135deg, #f97316 0%, #e01a2b 100%)',
                boxShadow: '0 6px 20px rgba(249, 115, 22, 0.4)',
                fontWeight: 700,
                height: 46,
              }}
            >
              Submit Early Access Request
            </Button>
          </motion.div>

          <Text size="10px" c="dimmed" style={{ textAlign: 'center' }}>
            Direct Support: 0243-630-648 • Accra, Ghana
          </Text>
        </Stack>
      </form>
    </Box>
  );
};
