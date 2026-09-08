'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { BrandLogo } from '@/components/atoms';

const highlights = [
  {
    title: 'One connected campus',
    desc: 'Attendance, grades, fees, and payroll unified in real time.',
  },
  {
    title: 'Trusted by 260+ schools',
    desc: 'Proven across Ghana with 99.98% platform uptime.',
  },
  {
    title: 'Guardian first communication',
    desc: 'Bulk SMS and instant alerts keep parents in the loop.',
  },
];

const stats = [
  { value: '1,447', label: 'Students managed' },
  { value: 'GHS 824k', label: 'Fees this term' },
  { value: '99.98%', label: 'Uptime' },
];

export default function SchoolAdminLoginPage() {
  return (
    <Box style={{ minHeight: '100vh', display: 'flex', background: '#ffffff' }}>
      {/* Left brand panel */}
      <Box
        visibleFrom="md"
        style={{
          position: 'relative',
          width: '46%',
          padding: '48px 56px',
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 18% 12%, rgba(224, 26, 43, 0.35), transparent 45%), linear-gradient(160deg, #0b0f17 0%, #131a26 55%, #0b0f17 100%)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Ambient glow */}
        <Box
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-8%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(224, 26, 43, 0.25)',
            filter: 'blur(90px)',
            pointerEvents: 'none',
          }}
        />
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '46px 46px',
            maskImage: 'radial-gradient(circle at 30% 20%, black 30%, transparent 90%)',
            pointerEvents: 'none',
          }}
        />

        <Box style={{ position: 'relative', zIndex: 1 }}>
          {/* <Group
            gap="xs"
            px="sm"
            py={6}
            w="fit-content"
            style={{
              borderRadius: 999,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: 'rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Box
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 10px #22c55e',
              }}
            />
            <Text size="xs" fw={600} c="#e2e8f0">
              School Admin Portal · Live
            </Text>
          </Group> */}
        </Box>

        <Box style={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Title
              order={1}
              c="white"
              style={{ fontFamily: 'var(--font-heading)', fontSize: '2.6rem', lineHeight: 1.1 }}
            >
              Run your school from one calm command center.
            </Title>
            <Text mt="md" size="md" c="#94a3b8" maw={420}>
              Fastrack gives school leadership a single, confident source of truth from morning attendance to end-of-term analytics.
            </Text>
          </motion.div>

          <Stack mt={36} gap="md">
            {highlights.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
              >
                <Group align="flex-start" gap="sm" wrap="nowrap">
                  <ThemeIcon size={26} radius="xl" variant="light" color="green">
                    <CheckCircle2 size={15} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600} size="sm" c="#f1f5f9">
                      {item.title}
                    </Text>
                    <Text size="xs" c="#94a3b8">
                      {item.desc}
                    </Text>
                  </Box>
                </Group>
              </motion.div>
            ))}
          </Stack>
        </Box>

        <Group
          gap={0}
          style={{
            position: 'relative',
            zIndex: 1,
            borderTop: '1px solid rgba(148, 163, 184, 0.18)',
            paddingTop: 22,
          }}
        >
          {stats.map((stat, i) => (
            <Box
              key={stat.label}
              style={{
                flex: 1,
                paddingLeft: i === 0 ? 0 : 20,
                borderLeft: i === 0 ? 'none' : '1px solid rgba(148, 163, 184, 0.18)',
              }}
            >
              <Text fw={800} size="lg" c="white" style={{ fontFamily: 'var(--font-heading)' }}>
                {stat.value}
              </Text>
              <Text size="xs" c="#94a3b8">
                {stat.label}
              </Text>
            </Box>
          ))}
        </Group>
      </Box>

      {/* Right form panel */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(24px, 5vw, 56px)',
          position: 'relative',
        }}
      >
        <Group justify="space-between">
          <BrandLogo size="md" />
          <Button
            component={Link}
            href="/"
            variant="subtle"
            color="gray"
            size="sm"
            leftSection={<ArrowLeft size={14} />}
          >
            Back to Website
          </Button>
        </Group>

        <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%', maxWidth: 420 }}
          >
            <Stack gap="lg">
              <Box>
                <ThemeIcon size={48} radius="lg" variant="light" color="fastrackRed" mb="md">
                  <Lock size={22} />
                </ThemeIcon>
                <Title order={2} style={{ fontFamily: 'var(--font-heading)', fontSize: '1.9rem' }}>
                  Welcome back
                </Title>
                <Text c="dimmed" size="sm" mt={4}>
                  Sign in to your school administrator dashboard.
                </Text>
              </Box>

              <Stack gap="md">
                <TextInput
                  label="School email"
                  placeholder="admin@school.edu.gh"
                  required
                  size="md"
                  radius="md"
                  leftSection={<Mail size={16} />}
                />

                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
                  required
                  size="md"
                  radius="md"
                  leftSection={<ShieldCheck size={16} />}
                />

                <Group justify="space-between">
                  <Checkbox label="Remember me" size="sm" />
                  <Text
                    component={Link}
                    href="#"
                    size="sm"
                    fw={600}
                    c="fastrackRed"
                    style={{ textDecoration: 'none' }}
                  >
                    Forgot password?
                  </Text>
                </Group>

                <Button
                  component={Link}
                  href="/school-admin/dashboard"
                  size="md"
                  radius="md"
                  fullWidth
                  rightSection={<ArrowRight size={16} />}
                  style={{
                    background: 'linear-gradient(110deg, #e01a2b 0%, #ba1020 100%)',
                    boxShadow: '0 16px 30px -14px rgba(224, 26, 43, 0.6)',
                  }}
                >
                  Sign in to dashboard
                </Button>
              </Stack>

              <Divider label="or" labelPosition="center" />

              <Button
                variant="default"
                size="md"
                radius="md"
                fullWidth
                leftSection={<GraduationCap size={16} />}
              >
                Continue with Fastrack SSO
              </Button>

              <Group gap={6} justify="center">
                <Sparkles size={13} color="#94a3b8" />
                <Text size="xs" c="dimmed" ta="center">
                  Protected by enterprise-grade encryption and activity monitoring.
                </Text>
              </Group>
            </Stack>
          </motion.div>
        </Box>

        <Text size="xs" c="dimmed" ta="center">
          © {new Date().getFullYear()} Fastrack Management Services. All rights reserved.
        </Text>
      </Box>
    </Box>
  );
}
