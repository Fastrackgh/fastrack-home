'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Box,
  Group,
  Text,
  Badge,
  SimpleGrid,
  UnstyledButton,
  Avatar,
  Stack,
  Table,
  Progress,
} from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Users,
  CreditCard,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  Send,
  Smartphone,
  Cpu,
  ArrowUpRight,
  RefreshCw,
  Building2,
  ShieldCheck,
} from 'lucide-react';

interface DashboardPreviewProps {
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

type TabType = 'overview' | 'admissions' | 'fees' | 'sms' | 'payroll';

export const DashboardPreview: React.FC<DashboardPreviewProps> = ({ fullWidth = false, style }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [bellRinging, setBellRinging] = useState(false);

  const triggerBell = () => {
    setBellRinging(true);
    setTimeout(() => setBellRinging(false), 800);
  };

  return (
    <Box
      className="dashboard-shadow"
      style={{
        borderRadius: fullWidth ? '0px' : '16px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        width: '100%',
        maxWidth: fullWidth ? '100%' : '1080px',
        margin: '0 auto',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* 1. App Top Navigation */}
      <Box
        style={{
          padding: '12px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <Group gap="sm">
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 8px',
              borderRadius: 6,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
            }}
          >
            <Image
              src="/logo(1).png"
              alt="Fastrack"
              width={65}
              height={22}
              style={{ height: '22px', width: 'auto', objectFit: 'contain' }}
            />
          </Box>

          <Badge
            size="xs"
            variant="dot"
            color="green"
            style={{ textTransform: 'none', fontWeight: 600, background: '#ffffff' }}
          >
            Cloud Node: Accra Live
          </Badge>
        </Group>

        <Group gap="md">
          {/* Quick Search */}
          <Box
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '240px',
            }}
          >
            <Search size={14} color="#64748b" />
            <Text size="xs" c="dimmed">
              Search student, fee ID, parent...
            </Text>
          </Box>

          <Group gap="xs">
            <motion.div
              animate={bellRinging ? { rotate: [-15, 15, -10, 10, 0], scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.5 }}
              onClick={triggerBell}
              style={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <Bell size={15} color="#475569" />
              <Box
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#e01a2b',
                }}
              />
            </motion.div>

            <Avatar src="" alt="Admin User" size={34} radius="sm" color="fastrackRed">
              HA
            </Avatar>
          </Group>
        </Group>
      </Box>

      {/* 2. Main Workspace Layout */}
      <Box style={{ display: 'flex', minHeight: '460px' }}>
        {/* Left Sidebar */}
        <Box
          style={{
            width: '225px',
            background: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
            padding: '18px 12px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          visibleFrom="sm"
        >
          <Box>
            <Text size="10px" fw={700} c="dimmed" mb="xs" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 8 }}>
              System Modules
            </Text>

            <Stack gap={4}>
              {[
                { id: 'overview', label: 'Dashboard Overview', icon: <Layers size={16} /> },
                { id: 'admissions', label: 'Admissions & Grades', icon: <Users size={16} /> },
                { id: 'fees', label: 'Fees & MoMo Gateway', icon: <CreditCard size={16} /> },
                { id: 'sms', label: 'Bulk SMS Broadcasts', icon: <MessageSquare size={16} /> },
                { id: 'payroll', label: 'Staff Payroll & HR', icon: <Building2 size={16} /> },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <UnstyledButton
                      onClick={() => setActiveTab(item.id as TabType)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: isActive ? '#ffffff' : 'transparent',
                        color: isActive ? '#e01a2b' : '#475569',
                        border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
                        boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebarActivePill"
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '15%',
                            bottom: '15%',
                            width: '3px',
                            background: '#e01a2b',
                            borderRadius: '0 4px 4px 0',
                          }}
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <Box style={{ color: isActive ? '#e01a2b' : '#64748b' }}>
                        {item.icon}
                      </Box>
                      <Text size="xs" fw={isActive ? 700 : 500} style={{ color: 'inherit', lineHeight: 1.2 }}>
                        {item.label}
                      </Text>
                    </UnstyledButton>
                  </motion.div>
                );
              })}
            </Stack>
          </Box>

          <Box
            p="xs"
            style={{
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <Group gap={6} align="center">
              <ShieldCheck size={14} color="#e01a2b" />
              <Text size="10px" fw={700} c="dark">
                Enterprise Cloud Node
              </Text>
            </Group>
            <Text size="9px" c="dimmed" style={{ marginTop: 3 }}>
              256-Bit SSL Encrypted & Synced
            </Text>
          </Box>
        </Box>

        {/* Right Main Content Area with Framer Motion Tab Transitions */}
        <Box style={{ flex: 1, padding: '22px 26px', background: '#ffffff', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {/* Header Action Row */}
                <Group justify="space-between" align="center" mb="lg">
                  <Box>
                    <Text size="md" fw={800} c="dark" style={{ fontFamily: 'var(--font-heading)' }}>
                      School Operations Dashboard
                    </Text>
                    <Text size="xs" c="dimmed">
                      Real-time synchronization across Cloud, Mobile Money & SMS gateways
                    </Text>
                  </Box>

                  <Group gap="xs">
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                      <Box
                        onClick={() => setActiveTab('admissions')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          background: '#e01a2b',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        + New Student Admission
                      </Box>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                      <Box
                        onClick={() => setActiveTab('sms')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Send size={12} />
                        Send Bulk SMS
                      </Box>
                    </motion.div>
                  </Group>
                </Group>

                {/* 4 Metric Cards with Framer Motion hover elevation */}
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="lg">
                  {[
                    {
                      label: 'Enrolled Students',
                      icon: <Users size={16} color="#64748b" />,
                      value: '1,482',
                      trend: '+12% this term',
                      trendColor: 'green.7',
                      trendIcon: <TrendingUp size={12} color="#16a34a" />,
                    },
                    {
                      label: 'Tuition Collected',
                      icon: <CreditCard size={16} color="#e01a2b" />,
                      value: 'GH₵ 648,250',
                      trend: '94.2% collected',
                      trendColor: 'green.7',
                      trendIcon: <CheckCircle2 size={12} color="#16a34a" />,
                    },
                    {
                      label: 'Bulk SMS Sent',
                      icon: <MessageSquare size={16} color="#64748b" />,
                      value: '14,280',
                      trend: '99.8% delivered',
                      trendColor: 'green.7',
                      trendIcon: <CheckCircle2 size={12} color="#16a34a" />,
                    },
                    {
                      label: "Today's Attendance",
                      icon: <CheckCircle2 size={16} color="#16a34a" />,
                      value: '98.4%',
                      trend: '1,458 present',
                      trendColor: 'dimmed',
                      trendIcon: <Clock size={12} color="#64748b" />,
                    },
                  ].map((stat, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -4, scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Box p="md" style={{ borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Group justify="space-between" align="flex-start" mb={4}>
                          <Text size="xs" c="dimmed" fw={600}>
                            {stat.label}
                          </Text>
                          {stat.icon}
                        </Group>
                        <Text size="xl" fw={800} c="dark" style={{ fontFamily: 'var(--font-heading)' }}>
                          {stat.value}
                        </Text>
                        <Group gap={4} mt={4}>
                          {stat.trendIcon}
                          <Text size="10px" c={stat.trendColor} fw={600}>
                            {stat.trend}
                          </Text>
                        </Group>
                      </Box>
                    </motion.div>
                  ))}
                </SimpleGrid>

                {/* Lower Grid: Chart & Real Activity Log */}
                <SimpleGrid cols={{ base: 1, lg: 12 }} spacing="md">
                  {/* Revenue Trend Line */}
                  <Box
                    style={{
                      gridColumn: 'span 7',
                      padding: '16px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <Group justify="space-between" align="center" mb="sm">
                      <Text size="xs" fw={700} c="dark">
                        Fee Collection & MoMo Trends (GH₵)
                      </Text>
                      <Badge size="xs" variant="light" color="red">
                        +GH₵ 124K THIS WEEK
                      </Badge>
                    </Group>

                    {/* SVG Area Chart with Framer Motion path animation */}
                    <Box style={{ height: '140px', width: '100%', position: 'relative' }}>
                      <svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="fastrackRedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e01a2b" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#e01a2b" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 100 Q 80 85 160 55 T 320 30 L 400 20 L 400 120 L 0 120 Z"
                          fill="url(#fastrackRedGrad)"
                        />
                        <motion.path
                          d="M 0 100 Q 80 85 160 55 T 320 30 L 400 20"
                          fill="none"
                          stroke="#e01a2b"
                          strokeWidth="2.5"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.2, ease: 'easeInOut' }}
                        />
                        <circle cx="160" cy="55" r="4" fill="#e01a2b" />
                        <circle cx="320" cy="30" r="4" fill="#e01a2b" />
                        <circle cx="400" cy="20" r="5" fill="#e01a2b" stroke="#ffffff" strokeWidth="2" />
                      </svg>
                    </Box>

                    <Group justify="space-between" mt="xs">
                      <Text size="10px" c="dimmed">Week 1</Text>
                      <Text size="10px" c="dimmed">Week 4</Text>
                      <Text size="10px" c="dimmed">Week 8</Text>
                      <Text size="10px" c="dark" fw={700}>Week 12 (Current)</Text>
                    </Group>
                  </Box>

                  {/* Live Gateway Activity Stream */}
                  <Box
                    style={{
                      gridColumn: 'span 5',
                      padding: '16px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <Group justify="space-between" align="center" mb="xs">
                      <Text size="xs" fw={700} c="dark">
                        Live Stream & Gateway Alerts
                      </Text>
                      <Badge size="xs" variant="dot" color="green">
                        Active Gateway
                      </Badge>
                    </Group>

                    <Stack gap="xs">
                      {[
                        {
                          title: 'MoMo Fee Received: GH₵ 2,450.00',
                          sub: 'Kofi Mensah (Class 6B) • MTN MoMo',
                          time: '1m ago',
                          badge: 'PAID',
                          color: 'green',
                        },
                        {
                          title: 'Morning Attendance SMS Dispatched',
                          sub: '1,420 parents notified (99.9% delivery)',
                          time: '8m ago',
                          badge: 'DELIVERED',
                          color: 'red',
                        },
                        {
                          title: 'Terminal GPA Reports Generated',
                          sub: 'JHS 3 Batch A • Cambridge & GES Scale',
                          time: '24m ago',
                          badge: 'READY',
                          color: 'blue',
                        },
                      ].map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          whileHover={{ x: 3 }}
                        >
                          <Box
                            p="xs"
                            style={{ borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0' }}
                          >
                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                              <Box>
                                <Text size="xs" fw={700} c="dark" style={{ lineHeight: 1.2 }}>
                                  {item.title}
                                </Text>
                                <Text size="10px" c="dimmed" style={{ lineHeight: 1.2, marginTop: 2 }}>
                                  {item.sub}
                                </Text>
                              </Box>
                              <Badge size="xs" variant="light" color={item.color} style={{ fontSize: '8px' }}>
                                {item.badge}
                              </Badge>
                            </Group>
                          </Box>
                        </motion.div>
                      ))}
                    </Stack>
                  </Box>
                </SimpleGrid>
              </motion.div>
            )}

            {activeTab === 'admissions' && (
              <motion.div
                key="admissions"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <Group justify="space-between" align="center" mb="md">
                  <Box>
                    <Text size="md" fw={800} c="dark" style={{ fontFamily: 'var(--font-heading)' }}>
                      Student Directory & Enrollment Lifecycles
                    </Text>
                    <Text size="xs" c="dimmed">
                      Complete digital biodata, medical records & terminal academic scoring
                    </Text>
                  </Box>
                  <Badge size="sm" variant="light" color="red">
                    100% Paperless Enrollment
                  </Badge>
                </Group>

                <Stack gap="xs">
                  {[
                    { id: 'STU-2024-001', name: 'Ama Owusu-Ansah', class: 'Class 6A (Primary)', gpa: '3.92 (Grade 1)', fee: 'Fully Paid', status: 'Enrolled' },
                    { id: 'STU-2024-002', name: 'Kwame Boateng', class: 'JHS 2 (Junior High)', gpa: '3.78 (Grade 1)', fee: 'GH₵ 450 Bal', status: 'Enrolled' },
                    { id: 'STU-2024-003', name: 'Abena Serwaa', class: 'SHS 1 Science', gpa: '4.00 (Grade 1)', fee: 'Fully Paid', status: 'New Admission' },
                    { id: 'STU-2024-004', name: 'Emmanuel Tetteh', class: 'Class 4B (Primary)', gpa: '3.65 (Grade 2)', fee: 'Fully Paid', status: 'Enrolled' },
                  ].map((stu, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      whileHover={{ x: 4 }}
                    >
                      <Box
                        p="sm"
                        style={{
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Group gap="sm">
                          <Avatar radius="xl" size={32} color="fastrackRed">
                            {stu.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Text size="xs" fw={700} c="dark">{stu.name}</Text>
                            <Text size="10px" c="dimmed">{stu.id} • {stu.class}</Text>
                          </Box>
                        </Group>
                        <Group gap="md">
                          <Box style={{ textAlign: 'right' }}>
                            <Text size="xs" fw={700} c="dark">{stu.gpa}</Text>
                            <Text size="10px" c={stu.fee.includes('Paid') ? 'green.7' : 'red.7'}>{stu.fee}</Text>
                          </Box>
                          <Badge size="xs" variant="light" color={stu.status.includes('New') ? 'blue' : 'green'}>
                            {stu.status}
                          </Badge>
                        </Group>
                      </Box>
                    </motion.div>
                  ))}
                </Stack>
              </motion.div>
            )}

            {activeTab === 'fees' && (
              <motion.div
                key="fees"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <Group justify="space-between" align="center" mb="md">
                  <Box>
                    <Text size="md" fw={800} c="dark" style={{ fontFamily: 'var(--font-heading)' }}>
                      Mobile Money & Bank Fee Collection
                    </Text>
                    <Text size="xs" c="dimmed">
                      Automated reconciliation across MTN MoMo, Telecel Cash & Bank deposits
                    </Text>
                  </Box>
                  <Badge size="sm" variant="light" color="green">
                    94.2% Collection Rate
                  </Badge>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
                  <Box p="md" style={{ borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text size="xs" c="dimmed">MTN Mobile Money</Text>
                    <Text size="lg" fw={800} c="dark">GH₵ 412,800</Text>
                    <Text size="10px" c="green.7">64% of total receipts</Text>
                  </Box>
                  <Box p="md" style={{ borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text size="xs" c="dimmed">Telecel Cash</Text>
                    <Text size="lg" fw={800} c="dark">GH₵ 142,450</Text>
                    <Text size="10px" c="green.7">22% of total receipts</Text>
                  </Box>
                  <Box p="md" style={{ borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text size="xs" c="dimmed">Direct Bank Deposit</Text>
                    <Text size="lg" fw={800} c="dark">GH₵ 93,000</Text>
                    <Text size="10px" c="green.7">14% of total receipts</Text>
                  </Box>
                </SimpleGrid>

                <Box p="md" style={{ borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Group justify="space-between" mb="xs">
                    <Text size="xs" fw={700}>Term 2 Overall Fee Target Reconciliation</Text>
                    <Text size="xs" fw={700} c="green.7">GH₵ 648,250 / GH₵ 688,000</Text>
                  </Group>
                  <Progress value={94.2} color="red" size="md" radius="xl" />
                </Box>
              </motion.div>
            )}

            {activeTab === 'sms' && (
              <motion.div
                key="sms"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <Group justify="space-between" align="center" mb="md">
                  <Box>
                    <Text size="md" fw={800} c="dark" style={{ fontFamily: 'var(--font-heading)' }}>
                      High-Throughput Bulk SMS Broadcasts
                    </Text>
                    <Text size="xs" c="dimmed">
                      Carrier-grade Ghanaian SMS gateway with instant DND bypass & 99.8% open rate
                    </Text>
                  </Box>
                  <Badge size="sm" variant="light" color="red">
                    Instant Carrier Delivery
                  </Badge>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Box p="md" style={{ borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text size="xs" fw={700} mb="xs">Live SMS Dispatch Demo</Text>
                    <Box p="sm" style={{ borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1' }}>
                      <Text size="xs" fw={600} c="dark">Sender ID: FASTRACK-SCH</Text>
                      <Text size="xs" c="dimmed" mt={4}>
                        "Dear Parent, Terminal 2 GPA reports for Kofi Mensah are now live on the portal. Fee balance: GH₵ 0.00. Thank you."
                      </Text>
                    </Box>
                    <Group justify="space-between" mt="sm">
                      <Badge size="xs" color="green">99.8% Delivered</Badge>
                      <Text size="10px" c="dimmed">Dispatched in 0.8s</Text>
                    </Group>
                  </Box>

                  <Box p="md" style={{ borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text size="xs" fw={700} mb="xs">Campaign Types</Text>
                    <Stack gap={6}>
                      {['Daily Morning Attendance Alerts', 'Fee Payment Due Reminders', 'PTA Emergency Announcements', 'Terminal Exam Schedules'].map((c, i) => (
                        <Group key={i} gap="xs">
                          <CheckCircle2 size={13} color="#e01a2b" />
                          <Text size="xs" c="dark" fw={500}>{c}</Text>
                        </Group>
                      ))}
                    </Stack>
                  </Box>
                </SimpleGrid>
              </motion.div>
            )}

            {activeTab === 'payroll' && (
              <motion.div
                key="payroll"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <Group justify="space-between" align="center" mb="md">
                  <Box>
                    <Text size="md" fw={800} c="dark" style={{ fontFamily: 'var(--font-heading)' }}>
                      Staff Payroll, HR & Statutory Filing
                    </Text>
                    <Text size="xs" c="dimmed">
                      Automated GRA PAYE, SSNIT Tier 1 & 2 schedules, and direct staff bank disbursement files
                    </Text>
                  </Box>
                  <Badge size="sm" color="green" variant="light">
                    GRA & SSNIT Compliant
                  </Badge>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
                  <Box p="md" style={{ borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text size="xs" c="dimmed">Monthly Net Payroll</Text>
                    <Text size="lg" fw={800} c="dark">GH₵ 142,600</Text>
                    <Text size="10px" c="green.7">48 Teaching & Admin Staff</Text>
                  </Box>
                  <Box p="md" style={{ borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text size="xs" c="dimmed">GRA PAYE Tax Schedule</Text>
                    <Text size="lg" fw={800} c="dark">GH₵ 18,450</Text>
                    <Text size="10px" c="green.7">Monthly Deduction Filed</Text>
                  </Box>
                  <Box p="md" style={{ borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text size="xs" c="dimmed">SSNIT Tier 1 & 2</Text>
                    <Text size="lg" fw={800} c="dark">GH₵ 19,250</Text>
                    <Text size="10px" c="green.7">Export Ready for Bank</Text>
                  </Box>
                </SimpleGrid>

                <Stack gap="xs">
                  {[
                    { name: 'Dr. Michael Asare', role: 'Headmaster / Administrator', net: 'GH₵ 8,500.00', status: 'Disbursed', bank: 'GCB Bank' },
                    { name: 'Grace Quaye', role: 'Head of Mathematics (JHS)', net: 'GH₵ 4,200.00', status: 'Disbursed', bank: 'Ecobank' },
                    { name: 'Samuel Owusu', role: 'Senior Science Master', net: 'GH₵ 4,100.00', status: 'Disbursed', bank: 'Stanbic Bank' },
                  ].map((staff, i) => (
                    <motion.div key={i} whileHover={{ x: 4 }}>
                      <Box
                        p="sm"
                        style={{
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Group gap="sm">
                          <Avatar radius="xl" size={30} color="fastrackRed">
                            {staff.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Text size="xs" fw={700} c="dark">{staff.name}</Text>
                            <Text size="10px" c="dimmed">{staff.role} • {staff.bank}</Text>
                          </Box>
                        </Group>
                        <Group gap="md">
                          <Text size="xs" fw={700} c="dark">{staff.net}</Text>
                          <Badge size="xs" variant="light" color="green">{staff.status}</Badge>
                        </Group>
                      </Box>
                    </motion.div>
                  ))}
                </Stack>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
};
