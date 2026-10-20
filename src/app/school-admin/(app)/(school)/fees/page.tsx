'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CopyButton,
  Divider,
  Drawer,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  Check,
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  PlusCircle,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/features/workspace';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';

// Interfaces matching backend DTOs
interface InvoiceLineItem {
  id: string;
  feeTypeId: string;
  feeTypeName: string;
  amount: number;
  isOptional: boolean;
}

interface StudentInvoice {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  title?: string | null;
  accessToken?: string | null;
  viewUrl?: string | null;
  schoolId: string;
  schoolStudentId: string;
  studentId: string;
  studentCode?: string | null;
  studentName?: string;
  className?: string;
  academicYearId: string;
  yearLabel?: string;
  termId: string;
  termLabel?: string;
  arrearsBf: number;
  totalFees: number;
  accFees: number;
  discountAmount: number;
  feePayable: number;
  totalPayment: number;
  balance: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERPAID' | string;
  lineItems: InvoiceLineItem[];
  signature?: string | null;
  signedAt?: string | null;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  receiptNumber: string;
  paymentDate: string;
  amountPaid: number;
  paymentMethod: string;
  bankType?: string | null;
  transactionReference?: string | null;
  invoiceId: string;
  invoiceNumber?: string;
  studentId?: string;
  studentCode?: string | null;
  studentName?: string;
  className?: string;
  previousBalance: number;
  newBalance: number;
  surplusCredit: number;
  recordedByName?: string;
  createdAt: string;
}

interface FeeStructure {
  id: string;
  schoolId: string;
  feeTypeId: string;
  feeTypeName: string;
  classId?: string | null;
  className?: string | null;
  amount: number;
  academicYearId: string;
  yearLabel?: string;
  academicTermId: string;
  termLabel?: string;
  isOptional: boolean;
}

interface SchoolClass {
  id: string;
  classCode: string;
  className: string;
}

interface AcademicContext {
  yearId: string;
  yearLabel: string;
  termId: string;
  termLabel: string;
}

/** Values of the backend's `PaymentMethod` enum. */
const PAYMENT_METHODS = [
  { value: 'MoMo', label: 'Mobile Money' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank transfer' },
  { value: 'Cheque', label: 'Cheque' },
];

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

function notifyLoadError(what: string, err: unknown) {
  notifications.show({
    title: `Could not load ${what}`,
    message: errorMessage(err, 'Try refreshing the page.'),
    color: 'red',
  });
}

interface StudentOption {
  id: string;
  studentId: string;
  fullName: string;
  studentCode: string;
  className: string;
}

export default function FeesPage() {
  const { can, school } = useAuth();
  const may = {
    readPayments: can('payments:read'),
    collectPayments: can('payments:collect'),
    generateInvoices: can('invoices:generate'),
    readStructures: can('fee_structures:read'),
  };
  const [activeTab, setActiveTab] = useState<string | null>('invoices');

  // Invoices state
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [debouncedInvoiceSearch] = useDebouncedValue(invoiceSearch.trim(), 300);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('All');
  const [invoiceClassFilter, setInvoiceClassFilter] = useState<string | null>(null);

  // Payments state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');

  // Fee structures state
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [structuresLoading, setStructuresLoading] = useState(false);

  // Prerequisites
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicContext, setAcademicContext] = useState<AcademicContext | null>(null);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);

  // Selected Invoice for Drawer
  const [selectedInvoice, setSelectedInvoice] = useState<StudentInvoice | null>(null);
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  // Batch Generation Modal state
  const [genModalOpened, { open: openGenModal, close: closeGenModal }] = useDisclosure(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genClassId, setGenClassId] = useState<string>('all');
  const [genDueDate, setGenDueDate] = useState<string>('');

  // Record Payment Modal state
  const [payModalOpened, { open: openPayModal, close: closePayModal }] = useDisclosure(false);
  const [isRecordingPay, setIsRecordingPay] = useState(false);
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<string | null>(null);
  const [studentBalanceLoading, setStudentBalanceLoading] = useState(false);
  const [studentBalanceInfo, setStudentBalanceInfo] = useState<{
    balance: number;
    feePayable: number;
    totalPayment: number;
    invoiceNumber: string;
    invoiceId: string;
  } | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState<string>('MoMo');
  const [payChannel, setPayChannel] = useState<string>('');
  const [payRef, setPayRef] = useState<string>('');

  // Printable Receipt Modal state
  const [receiptModalOpened, { open: openReceiptModal, close: closeReceiptModal }] =
    useDisclosure(false);
  const [activeReceipt, setActiveReceipt] = useState<PaymentRecord | null>(null);

  // 1. Load initial prerequisites
  useEffect(() => {
    async function loadPrerequisites() {
      try {
        const [classesRes, yearRes, termRes, studentsRes] = await Promise.allSettled([
          apiClient.get<SchoolClass[]>('/schools/me/classes'),
          apiClient.get<{ id: string; yearLabel: string }>('/schools/me/academic-years/current'),
          apiClient.get<{ id: string; termLabel: string }>('/schools/me/academic-terms/current'),
          apiClient.get<StudentOption[]>('/schools/me/students?limit=100'),
        ]);

        if (classesRes.status === 'fulfilled' && classesRes.value.data) {
          setClasses(classesRes.value.data);
        } else if (classesRes.status === 'rejected') {
          notifyLoadError('classes', classesRes.reason);
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

        if (studentsRes.status === 'fulfilled' && studentsRes.value.data) {
          setAllStudents(studentsRes.value.data);
        } else if (studentsRes.status === 'rejected') {
          notifyLoadError('students', studentsRes.reason);
        }
      } catch (err) {
        notifyLoadError('the school setup', err);
      }
    }
    loadPrerequisites();
  }, []);

  // 2. Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(invoicePage));
      params.append('limit', '20');
      if (debouncedInvoiceSearch) params.append('search', debouncedInvoiceSearch);
      if (invoiceClassFilter && invoiceClassFilter !== 'all')
        params.append('classId', invoiceClassFilter);
      if (invoiceStatusFilter && invoiceStatusFilter !== 'All')
        params.append('status', invoiceStatusFilter);

      const res = await apiClient.get<{ items: StudentInvoice[]; total: number }>(
        `/schools/me/invoices?${params.toString()}`,
      );
      if (res.data) {
        setInvoices(res.data.items || []);
        setInvoicesTotal(res.data.total || 0);
      }
    } catch (err) {
      notifyLoadError('invoices', err);
    } finally {
      setInvoicesLoading(false);
    }
  }, [invoicePage, debouncedInvoiceSearch, invoiceClassFilter, invoiceStatusFilter]);

  // 3. Fetch Payments
  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const res = await apiClient.get<{ items: PaymentRecord[]; total: number }>(
        '/schools/me/payments?limit=50',
      );
      if (res.data) {
        setPayments(res.data.items || []);
      }
    } catch (err) {
      notifyLoadError('payments', err);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  // 4. Fetch Fee Structures
  const fetchStructures = useCallback(async () => {
    setStructuresLoading(true);
    try {
      const res = await apiClient.get<{ items: FeeStructure[] }>('/schools/me/fee-structures');
      if (res.data) {
        setStructures(res.data.items || []);
      }
    } catch (err) {
      notifyLoadError('fee structures', err);
    } finally {
      setStructuresLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (activeTab === 'payments' && may.readPayments) fetchPayments();
    if (activeTab === 'structures' && may.readStructures) fetchStructures();
  }, [activeTab, may.readPayments, may.readStructures, fetchPayments, fetchStructures]);

  // Financial Metrics Calculation
  const metrics = useMemo(() => {
    const totalBilled = invoices.reduce((acc, inv) => acc + Number(inv.feePayable || 0), 0);
    const totalCollected = invoices.reduce((acc, inv) => acc + Number(inv.totalPayment || 0), 0);
    const outstanding = invoices.reduce((acc, inv) => acc + Number(inv.balance || 0), 0);
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    return {
      totalBilled,
      totalCollected,
      outstanding,
      collectionRate,
    };
  }, [invoices]);

  const visiblePayments = useMemo(() => {
    const term = paymentSearch.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter((p) =>
      [p.studentName, p.studentCode, p.receiptNumber, p.transactionReference].some((v) =>
        v?.toLowerCase().includes(term),
      ),
    );
  }, [payments, paymentSearch]);

  const startPayment = () => {
    setSelectedStudentForPay(null);
    setStudentBalanceInfo(null);
    setPayAmount('');
    setPayRef('');
    openPayModal();
  };

  // The list response has no line items, so the breakdown loads the full invoice.
  const openBreakdown = async (invoice: StudentInvoice) => {
    setSelectedInvoice(invoice);
    openDrawer();
    setInvoiceDetailLoading(true);
    try {
      const res = await apiClient.get<StudentInvoice>(
        `/schools/me/invoices/${encodeURIComponent(invoice.id)}`,
      );
      if (res.data) setSelectedInvoice(res.data);
    } catch (err) {
      notifyLoadError('the invoice breakdown', err);
    } finally {
      setInvoiceDetailLoading(false);
    }
  };

  // Handle student selection in Payment modal -> fetches outstanding balance
  useEffect(() => {
    if (!selectedStudentForPay) {
      setStudentBalanceInfo(null);
      return;
    }
    async function loadStudentDebt() {
      setStudentBalanceLoading(true);
      try {
        const res = await apiClient.get<StudentInvoice>(
          `/schools/me/invoices/students/${selectedStudentForPay}/latest`,
        );
        if (res.data) {
          setStudentBalanceInfo({
            balance: Number(res.data.balance || 0),
            feePayable: Number(res.data.feePayable || 0),
            totalPayment: Number(res.data.totalPayment || 0),
            invoiceNumber: res.data.invoiceNumber,
            invoiceId: res.data.id,
          });
          setPayAmount(Number(res.data.balance || 0));
        }
      } catch (err) {
        notifyLoadError("the student's balance", err);
        setStudentBalanceInfo(null);
      } finally {
        setStudentBalanceLoading(false);
      }
    }
    loadStudentDebt();
  }, [selectedStudentForPay]);

  // Submit Batch Invoice Generation
  const handleBatchGenerate = async () => {
    if (!academicContext?.termId) {
      notifications.show({
        title: 'Error',
        message: 'Active academic term is not configured.',
        color: 'red',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const payload: Record<string, unknown> = {
        academicTermId: academicContext.termId,
      };
      if (genClassId && genClassId !== 'all') {
        payload.classId = genClassId;
      }
      if (genDueDate) {
        payload.dueDate = genDueDate;
      }

      const res = await apiClient.post<{ totalInvoicesGenerated: number; totalFeePayable: number }>(
        '/schools/me/invoices/generate',
        payload,
      );

      notifications.show({
        title: 'Invoices Generated Successfully',
        message: `Generated ${res.data.totalInvoicesGenerated} student invoices totaling GHS ${Number(res.data.totalFeePayable).toLocaleString()}`,
        color: 'green',
        icon: <CheckCircle size={18} />,
        autoClose: 5000,
      });

      closeGenModal();
      fetchInvoices();
    } catch (err: unknown) {
      notifications.show({
        title: 'Invoice Generation Failed',
        message: errorMessage(err, 'Could not generate invoices.'),
        color: 'red',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit Payment Record
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPay) {
      notifications.show({ title: 'Error', message: 'Please select a student.', color: 'red' });
      return;
    }
    if (!payAmount || Number(payAmount) <= 0) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a valid payment amount.',
        color: 'red',
      });
      return;
    }

    setIsRecordingPay(true);
    try {
      const payload = {
        studentId: selectedStudentForPay,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        bankType: payChannel.trim() || undefined,
        transactionReference: payRef.trim() || undefined,
        invoiceId: studentBalanceInfo?.invoiceId,
      };

      const res = await apiClient.post<PaymentRecord[]>('/schools/me/payments', payload);
      const newPayment = Array.isArray(res.data) ? res.data[0] : res.data;

      notifications.show({
        title: 'Payment Recorded Successfully',
        message: `Receipt ${newPayment?.receiptNumber || ''} issued for GHS ${Number(payAmount).toLocaleString()}`,
        color: 'green',
        icon: <CheckCircle size={18} />,
        autoClose: 6000,
      });

      closePayModal();
      fetchInvoices();
      fetchPayments();

      if (newPayment) {
        setActiveReceipt(newPayment);
        openReceiptModal();
      }
    } catch (err: unknown) {
      notifications.show({
        title: 'Payment Failed',
        message: errorMessage(err, 'Could not record payment.'),
        color: 'red',
      });
    } finally {
      setIsRecordingPay(false);
    }
  };

  // Options for class filters & selects
  const classOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All classes' },
      ...classes.map((c) => ({ value: c.id, label: `${c.className} (${c.classCode})` })),
    ];
  }, [classes]);

  const studentSelectOptions = useMemo(() => {
    return allStudents.map((s) => ({
      value: s.studentId || s.id,
      label: `${s.fullName} (${s.studentCode || 'No Code'}) • ${s.className || 'Class'}`,
    }));
  }, [allStudents]);

  return (
    <>
      <PageHeader
        title="Fees & Billing"
        subtitle={
          academicContext
            ? `Invoices, payments and fee structures · ${academicContext.yearLabel} · ${academicContext.termLabel}`
            : 'Invoices, payments and fee structures.'
        }
        actions={
          <>
            <Button
              leftSection={<RefreshCw size={16} />}
              variant="default"
              radius="md"
              onClick={() => {
                fetchInvoices();
                if (may.readPayments) fetchPayments();
                if (may.readStructures) fetchStructures();
              }}
              loading={invoicesLoading || paymentsLoading}
            >
              Refresh
            </Button>
            {may.collectPayments && (
              <Button
                leftSection={<Receipt size={16} />}
                color="teal"
                radius="md"
                onClick={startPayment}
                id="btn-record-payment"
              >
                Record Payment
              </Button>
            )}
            {may.generateInvoices && (
              <Button
                leftSection={<PlusCircle size={16} />}
                color="fastrackRed"
                radius="md"
                onClick={openGenModal}
                id="btn-generate-invoices"
              >
                Generate Term Invoices
              </Button>
            )}
          </>
        }
      />

      {/* Financial Metrics Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Total Invoiced
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
              <FileText size={20} color="#3b82f6" />
            </Box>
          </Group>
          <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
            GHS{' '}
            {metrics.totalBilled.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text size="sm" c="dimmed">
            Across the {invoices.length} invoices shown
          </Text>
        </Card>

        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Total Collected
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
              <DollarSign size={20} color="#10b981" />
            </Box>
          </Group>
          <Text
            fw={800}
            size="1.6rem"
            mt="md"
            c="teal.7"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            GHS{' '}
            {metrics.totalCollected.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text size="sm" c="teal.7">
            {metrics.collectionRate}% revenue realized
          </Text>
        </Card>

        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Outstanding Arrears
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
              <Wallet size={20} color="#e01a2b" />
            </Box>
          </Group>
          <Text
            fw={800}
            size="1.6rem"
            mt="md"
            c="red.7"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            GHS{' '}
            {metrics.outstanding.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text size="sm" c="dimmed">
            Pending student fee balances
          </Text>
        </Card>

        <Card withBorder radius="lg" p="md" style={{ borderColor: '#e8edf3' }}>
          <Group justify="space-between" align="flex-start">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Collection Efficiency
            </Text>
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(168, 85, 247, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={20} color="#a855f7" />
            </Box>
          </Group>
          <Text fw={800} size="1.6rem" mt="md" style={{ fontFamily: 'var(--font-heading)' }}>
            {metrics.collectionRate}%
          </Text>
          <Text size="sm" c="dimmed">
            Of the invoices shown
          </Text>
        </Card>
      </SimpleGrid>

      {/* Main Tabs Card */}
      <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
        <Tabs value={activeTab} onChange={setActiveTab} color="fastrackRed">
          <Tabs.List mb="lg">
            <Tabs.Tab value="invoices" leftSection={<FileText size={16} />}>
              Invoices & Billing ({invoicesTotal})
            </Tabs.Tab>
            {may.readPayments && (
              <Tabs.Tab value="payments" leftSection={<Receipt size={16} />}>
                Payments & Receipts ({payments.length})
              </Tabs.Tab>
            )}
            {may.readStructures && (
              <Tabs.Tab value="structures" leftSection={<CreditCard size={16} />}>
                Fee Structures ({structures.length})
              </Tabs.Tab>
            )}
          </Tabs.List>

          {/* TAB 1: INVOICES & BILLING */}
          <Tabs.Panel value="invoices">
            <Group justify="space-between" mb="md" wrap="wrap">
              <Group gap="sm" wrap="wrap">
                <TextInput
                  placeholder="Search invoice or student…"
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.currentTarget.value);
                    setInvoicePage(1);
                  }}
                  leftSection={<Search size={15} color="#94a3b8" />}
                  radius="md"
                  w={260}
                  id="input-search-invoice"
                />
                <Select
                  placeholder="Filter by Class"
                  data={classOptions}
                  value={invoiceClassFilter || 'all'}
                  onChange={(v) => {
                    setInvoiceClassFilter(v === 'all' || !v ? null : v);
                    setInvoicePage(1);
                  }}
                  radius="md"
                  w={180}
                  id="select-filter-invoice-class"
                />
              </Group>
              <SegmentedControl
                value={invoiceStatusFilter}
                onChange={(v) => {
                  setInvoiceStatusFilter(v);
                  setInvoicePage(1);
                }}
                data={['All', 'UNPAID', 'PARTIAL', 'PAID']}
                radius="md"
                id="seg-invoice-status"
              />
            </Group>

            <ScrollArea>
              <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 880 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invoice #</Table.Th>
                    <Table.Th>Student</Table.Th>
                    <Table.Th>Class</Table.Th>
                    <Table.Th>Net Payable</Table.Th>
                    <Table.Th>Amount Paid</Table.Th>
                    <Table.Th>Balance</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {invoicesLoading ? (
                    <Table.Tr>
                      <Table.Td colSpan={8}>
                        <Stack align="center" py="xl" gap="sm">
                          <Loader size="sm" color="fastrackRed" />
                          <Text size="sm" c="dimmed">
                            Loading invoices…
                          </Text>
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : invoices.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={8}>
                        <Stack align="center" py="xl" gap={4}>
                          <Filter size={22} color="#94a3b8" />
                          <Text size="sm" c="dimmed">
                            No invoices match your search or filter.
                          </Text>
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    invoices.map((inv) => (
                      <Table.Tr key={inv.id} id={`row-invoice-${inv.invoiceNumber}`}>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <Badge variant="outline" color="dark" radius="sm">
                              {inv.invoiceNumber}
                            </Badge>
                            {inv.signature ? (
                              <Tooltip label="Cryptographically Signed & Tamper-Evident" withArrow>
                                <ThemeIcon size={20} radius="xl" color="green" variant="light">
                                  <ShieldCheck size={12} />
                                </ThemeIcon>
                              </Tooltip>
                            ) : null}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Box>
                            <Text fw={600} size="sm">
                              {inv.studentName || 'Unknown Student'}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {inv.studentCode || '—'}
                            </Text>
                          </Box>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="blue" radius="sm" tt="none">
                            {inv.className || 'Primary'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} size="sm">
                            GHS{' '}
                            {Number(inv.feePayable || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="teal.7">
                            GHS{' '}
                            {Number(inv.totalPayment || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text
                            fw={700}
                            size="sm"
                            c={Number(inv.balance || 0) > 0 ? 'red.7' : 'teal.7'}
                          >
                            GHS{' '}
                            {Number(inv.balance || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="light"
                            radius="sm"
                            color={
                              inv.status === 'PAID'
                                ? 'green'
                                : inv.status === 'PARTIAL'
                                  ? 'orange'
                                  : inv.status === 'OVERPAID'
                                    ? 'cyan'
                                    : 'red'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Group gap="xs" justify="flex-end" wrap="nowrap">
                            <Button
                              size="xs"
                              variant="subtle"
                              leftSection={<Eye size={14} />}
                              onClick={() => openBreakdown(inv)}
                            >
                              Breakdown
                            </Button>
                            {inv.viewUrl ? (
                              <CopyButton value={inv.viewUrl} timeout={2000}>
                                {({ copied, copy }) => (
                                  <Tooltip
                                    label={copied ? 'Copied Link!' : 'Copy Parent Link'}
                                    withArrow
                                  >
                                    <ActionIcon
                                      color={copied ? 'teal' : 'gray'}
                                      variant="subtle"
                                      onClick={copy}
                                    >
                                      {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </ActionIcon>
                                  </Tooltip>
                                )}
                              </CopyButton>
                            ) : null}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Tabs.Panel>

          {/* TAB 2: PAYMENTS & RECEIPTS */}
          <Tabs.Panel value="payments">
            <Group justify="space-between" mb="md" wrap="wrap">
              <TextInput
                placeholder="Filter by student, receipt or reference…"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.currentTarget.value)}
                leftSection={<Search size={15} color="#94a3b8" />}
                radius="md"
                w={280}
              />
              {may.collectPayments && (
                <Button
                  leftSection={<Receipt size={16} />}
                  color="teal"
                  radius="md"
                  onClick={startPayment}
                >
                  Record Payment
                </Button>
              )}
            </Group>

            <ScrollArea>
              <Table verticalSpacing="sm" horizontalSpacing="md" style={{ minWidth: 840 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Receipt #</Table.Th>
                    <Table.Th>Student</Table.Th>
                    <Table.Th>Amount Paid</Table.Th>
                    <Table.Th>Method</Table.Th>
                    <Table.Th>Reference</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Recorded By</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paymentsLoading ? (
                    <Table.Tr>
                      <Table.Td colSpan={8}>
                        <Stack align="center" py="xl">
                          <Loader size="sm" color="fastrackRed" />
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : visiblePayments.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={8}>
                        <Stack align="center" py="xl" gap={4}>
                          <Receipt size={22} color="#94a3b8" />
                          <Text size="sm" c="dimmed">
                            {payments.length === 0
                              ? 'No payment transactions recorded yet.'
                              : 'No payments match your filter.'}
                          </Text>
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    visiblePayments.map((p) => (
                      <Table.Tr key={p.id}>
                        <Table.Td>
                          <Badge variant="outline" color="teal" radius="sm">
                            {p.receiptNumber}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} size="sm">
                            {p.studentName || 'Student'}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {p.studentCode || ''}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={700} size="sm" c="teal.7">
                            GHS{' '}
                            {Number(p.amountPaid || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="gray" radius="sm">
                            {p.paymentMethod}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{p.transactionReference || '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {p.paymentDate}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{p.recordedByName || 'Staff'}</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Button
                            size="xs"
                            variant="light"
                            color="teal"
                            leftSection={<Printer size={13} />}
                            onClick={() => {
                              setActiveReceipt(p);
                              openReceiptModal();
                            }}
                          >
                            Receipt
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Tabs.Panel>

          {/* TAB 3: FEE STRUCTURES */}
          <Tabs.Panel value="structures">
            <Group justify="space-between" mb="md">
              <Text size="sm" c="dimmed">
                Active fee schedules configured for current school cohorts & terms.
              </Text>
            </Group>

            <ScrollArea>
              <Table verticalSpacing="sm" horizontalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fee Type</Table.Th>
                    <Table.Th>Class Cohort</Table.Th>
                    <Table.Th>Academic Term</Table.Th>
                    <Table.Th>Amount</Table.Th>
                    <Table.Th>Category</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {structuresLoading ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Stack align="center" py="xl">
                          <Loader size="sm" color="fastrackRed" />
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : structures.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text size="sm" c="dimmed" ta="center" py="xl">
                          No fee structures found.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    structures.map((s) => (
                      <Table.Tr key={s.id}>
                        <Table.Td>
                          <Text fw={600} size="sm">
                            {s.feeTypeName}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="blue" radius="sm">
                            {s.className || 'All School'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {s.termLabel || 'Active Term'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={700} size="sm">
                            GHS{' '}
                            {Number(s.amount || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="outline"
                            color={s.isOptional ? 'orange' : 'teal'}
                            radius="sm"
                          >
                            {s.isOptional ? 'Optional / Elective' : 'Mandatory'}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Invoice Breakdown Drawer */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        title={
          <Group gap="xs">
            <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
              Invoice Breakdown
            </Title>
            <Badge variant="outline" color="dark">
              {selectedInvoice?.invoiceNumber}
            </Badge>
          </Group>
        }
        position="right"
        size="lg"
      >
        {selectedInvoice ? (
          <Stack gap="md">
            <Card withBorder radius="md" p="md" bg="gray.0">
              <Group justify="space-between">
                <Box>
                  <Text fw={700} size="md">
                    {selectedInvoice.studentName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Code: {selectedInvoice.studentCode || '—'} • Class:{' '}
                    {selectedInvoice.className || 'Primary'}
                  </Text>
                </Box>
                <Badge
                  color={selectedInvoice.status === 'PAID' ? 'green' : 'red'}
                  radius="sm"
                  size="lg"
                >
                  {selectedInvoice.status}
                </Badge>
              </Group>
            </Card>

            <Divider label="Itemized Fee Schedule" labelPosition="left" />

            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fee Component</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {invoiceDetailLoading ? (
                  <Table.Tr>
                    <Table.Td colSpan={2}>
                      <Group justify="center" py="sm">
                        <Loader size="xs" color="fastrackRed" />
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ) : null}
                {selectedInvoice.lineItems?.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Text size="sm">{item.feeTypeName}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={600}>
                        GHS {Number(item.amount).toFixed(2)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {Number(selectedInvoice.arrearsBf || 0) > 0 ? (
                  <Table.Tr>
                    <Table.Td>
                      <Text size="sm" c="red.7" fw={600}>
                        Arrears Brought Forward
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" c="red.7" fw={700}>
                        GHS {Number(selectedInvoice.arrearsBf).toFixed(2)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : null}
                {Number(selectedInvoice.arrearsBf || 0) < 0 ? (
                  <Table.Tr>
                    <Table.Td>
                      <Text size="sm" c="teal.7" fw={600}>
                        Credit Brought Forward
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" c="teal.7" fw={700}>
                        - GHS {Math.abs(Number(selectedInvoice.arrearsBf)).toFixed(2)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : null}
              </Table.Tbody>
            </Table>

            <Divider />

            {/* Financial Summary */}
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Total Term Fees:
                </Text>
                <Text size="sm" fw={600}>
                  GHS {Number(selectedInvoice.totalFees || 0).toFixed(2)}
                </Text>
              </Group>
              {Number(selectedInvoice.discountAmount || 0) > 0 ? (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Scholarship / Discount:
                  </Text>
                  <Text size="sm" c="teal.7" fw={600}>
                    - GHS {Number(selectedInvoice.discountAmount).toFixed(2)}
                  </Text>
                </Group>
              ) : null}
              <Group justify="space-between">
                <Text size="md" fw={700}>
                  Net Fee Payable:
                </Text>
                <Text size="md" fw={800}>
                  GHS {Number(selectedInvoice.feePayable || 0).toFixed(2)}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Total Payments Received:
                </Text>
                <Text size="sm" c="teal.7" fw={700}>
                  GHS {Number(selectedInvoice.totalPayment || 0).toFixed(2)}
                </Text>
              </Group>
              <Group justify="space-between" pt="xs" style={{ borderTop: '1px solid #e2e8f0' }}>
                <Text
                  size="md"
                  fw={800}
                  c={Number(selectedInvoice.balance || 0) > 0 ? 'red.7' : 'teal.7'}
                >
                  Current Balance:
                </Text>
                <Text
                  size="lg"
                  fw={900}
                  c={Number(selectedInvoice.balance || 0) > 0 ? 'red.7' : 'teal.7'}
                >
                  GHS {Number(selectedInvoice.balance || 0).toFixed(2)}
                </Text>
              </Group>
            </Stack>

            {selectedInvoice.signature ? (
              <Alert
                icon={<ShieldCheck size={18} />}
                title="Cryptographically Signed"
                color="teal"
                radius="md"
              >
                <Text size="xs">
                  This bill is sealed with a digital SHA-256 HMAC signature ensuring immutability
                  for parents.
                </Text>
              </Alert>
            ) : null}

            {selectedInvoice.viewUrl ? (
              <Button
                component="a"
                href={selectedInvoice.viewUrl}
                target="_blank"
                variant="light"
                color="blue"
                leftSection={<ExternalLink size={16} />}
                radius="md"
              >
                Open Parent Public Invoice Link
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </Drawer>

      {/* Batch Invoice Generation Modal */}
      <Modal
        opened={genModalOpened}
        onClose={closeGenModal}
        title={
          <Box>
            <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
              Batch Invoice Generation
            </Title>
            <Text size="xs" c="dimmed">
              Term: {academicContext?.yearLabel} • {academicContext?.termLabel}
            </Text>
          </Box>
        }
        radius="lg"
        centered
      >
        <Stack gap="md">
          <Select
            label="Class Cohort"
            description="Select class or bill entire school"
            data={classOptions}
            value={genClassId}
            onChange={(v) => setGenClassId(v || 'all')}
            radius="md"
            id="modal-gen-class"
          />

          <TextInput
            label="Payment Due Date (Optional)"
            type="date"
            value={genDueDate}
            onChange={(e) => setGenDueDate(e.currentTarget.value)}
            radius="md"
            id="modal-gen-due-date"
          />

          <Alert icon={<Clock size={16} />} color="blue" radius="md">
            <Text size="xs">
              Fee schedules and prior term arrears will be computed automatically into each
              student&apos;s billing statement.
            </Text>
          </Alert>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeGenModal} radius="md">
              Cancel
            </Button>
            <Button
              color="fastrackRed"
              onClick={handleBatchGenerate}
              loading={isGenerating}
              radius="md"
              id="btn-confirm-generate"
            >
              Generate Invoices Now
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        opened={payModalOpened}
        onClose={closePayModal}
        title={
          <Box>
            <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
              Record Student Payment
            </Title>
            <Text size="xs" c="dimmed">
              Direct waterfall debt deduction & printable receipt generation
            </Text>
          </Box>
        }
        radius="lg"
        centered
      >
        <form onSubmit={handleRecordPayment}>
          <Stack gap="md">
            <Select
              label="Select Student"
              placeholder="Search by student name or code"
              data={studentSelectOptions}
              value={selectedStudentForPay}
              onChange={setSelectedStudentForPay}
              searchable
              required
              radius="md"
              id="select-pay-student"
            />

            {studentBalanceLoading ? (
              <Group gap="xs" py="xs">
                <Loader size="xs" color="fastrackRed" />
                <Text size="xs" c="dimmed">
                  Fetching student ledger debt...
                </Text>
              </Group>
            ) : studentBalanceInfo ? (
              <Card withBorder radius="md" p="sm" bg="gray.0">
                <Group justify="space-between">
                  <Box>
                    <Text size="xs" c="dimmed">
                      Target Invoice:
                    </Text>
                    <Text size="sm" fw={700}>
                      {studentBalanceInfo.invoiceNumber}
                    </Text>
                  </Box>
                  <Box ta="right">
                    <Text size="xs" c="dimmed">
                      Outstanding Debt:
                    </Text>
                    <Text
                      size="md"
                      fw={800}
                      c={studentBalanceInfo.balance > 0 ? 'red.7' : 'teal.7'}
                    >
                      GHS {studentBalanceInfo.balance.toFixed(2)}
                    </Text>
                  </Box>
                </Group>
              </Card>
            ) : null}

            <NumberInput
              label="Payment Amount (GHS)"
              placeholder="0.00"
              decimalScale={2}
              min={0.01}
              required
              value={payAmount}
              onChange={(v) => setPayAmount(typeof v === 'number' ? v : '')}
              radius="md"
              id="input-pay-amount"
            />

            <Grid gutter="sm">
              <Grid.Col span={6}>
                <Select
                  label="Payment Method"
                  data={PAYMENT_METHODS}
                  value={payMethod}
                  onChange={(v) => setPayMethod(v || 'MoMo')}
                  radius="md"
                  id="select-pay-method"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Channel / Network"
                  placeholder="e.g. MTN MoMo"
                  value={payChannel}
                  onChange={(e) => setPayChannel(e.currentTarget.value)}
                  radius="md"
                  id="input-pay-channel"
                />
              </Grid.Col>
            </Grid>

            <TextInput
              label="Transaction / Cheque Reference"
              placeholder="e.g. TXN-987654321"
              value={payRef}
              onChange={(e) => setPayRef(e.currentTarget.value)}
              radius="md"
              id="input-pay-ref"
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closePayModal} radius="md">
                Cancel
              </Button>
              <Button
                type="submit"
                color="teal"
                loading={isRecordingPay}
                radius="md"
                id="btn-confirm-payment"
              >
                Record Payment & Print Receipt
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Printable Receipt Modal */}
      <Modal
        opened={receiptModalOpened}
        onClose={closeReceiptModal}
        title={<Text fw={700}>Official Payment Receipt</Text>}
        size="md"
        radius="lg"
        centered
      >
        {activeReceipt ? (
          <Stack gap="md" p="xs" id="printable-receipt">
            {/* Header */}
            <Box ta="center" pb="sm" style={{ borderBottom: '2px solid #e2e8f0' }}>
              <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
                {school?.name}
              </Title>
              <Text size="xs" c="dimmed">
                {[school?.code && `School Code: ${school.code}`, school?.address]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
              <Badge color="teal" variant="light" size="lg" mt="xs">
                OFFICIAL RECEIPT — PAID & VERIFIED
              </Badge>
            </Box>

            {/* Receipt metadata */}
            <SimpleGrid cols={2} spacing="xs">
              <Box>
                <Text size="xs" c="dimmed">
                  Receipt Number:
                </Text>
                <Text size="sm" fw={700}>
                  {activeReceipt.receiptNumber}
                </Text>
              </Box>
              <Box ta="right">
                <Text size="xs" c="dimmed">
                  Payment Date:
                </Text>
                <Text size="sm" fw={600}>
                  {activeReceipt.paymentDate}
                </Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">
                  Student Name:
                </Text>
                <Text size="sm" fw={700}>
                  {activeReceipt.studentName || 'Student'}
                </Text>
                <Text size="xs" c="dimmed">
                  {activeReceipt.studentCode || ''}
                </Text>
              </Box>
              <Box ta="right">
                <Text size="xs" c="dimmed">
                  Class Cohort:
                </Text>
                <Text size="sm" fw={600}>
                  {activeReceipt.className || 'Primary'}
                </Text>
              </Box>
            </SimpleGrid>

            <Divider />

            {/* Financial trace */}
            <Stack gap={4}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Payment Method:
                </Text>
                <Badge variant="light" color="dark">
                  {activeReceipt.paymentMethod} • {activeReceipt.bankType || 'Cash'}
                </Badge>
              </Group>
              {activeReceipt.transactionReference ? (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Transaction Reference:
                  </Text>
                  <Text size="sm" fw={600}>
                    {activeReceipt.transactionReference}
                  </Text>
                </Group>
              ) : null}
              <Group
                justify="space-between"
                py="xs"
                style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}
              >
                <Text size="md" fw={700}>
                  Amount Paid:
                </Text>
                <Text size="lg" fw={800} c="teal.7">
                  GHS {Number(activeReceipt.amountPaid).toFixed(2)}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Previous Debt:
                </Text>
                <Text size="sm">GHS {Number(activeReceipt.previousBalance || 0).toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" fw={700}>
                  Remaining Outstanding:
                </Text>
                <Text
                  size="sm"
                  fw={800}
                  c={Number(activeReceipt.newBalance || 0) > 0 ? 'red.7' : 'teal.7'}
                >
                  GHS {Number(activeReceipt.newBalance || 0).toFixed(2)}
                </Text>
              </Group>
            </Stack>

            <Box ta="center" pt="md" style={{ borderTop: '1px dashed #cbd5e1' }}>
              <Text size="xs" c="dimmed">
                Issued by {activeReceipt.recordedByName || 'Finance Cashier'} • Fastrack Cloud ERP
              </Text>
            </Box>

            <Group justify="space-between" mt="sm">
              <Button variant="default" onClick={closeReceiptModal} radius="md">
                Close
              </Button>
              <Button
                leftSection={<Printer size={16} />}
                color="fastrackRed"
                radius="md"
                onClick={() => window.print()}
                id="btn-print-receipt"
              >
                Print Receipt
              </Button>
            </Group>
          </Stack>
        ) : null}
      </Modal>
    </>
  );
}
