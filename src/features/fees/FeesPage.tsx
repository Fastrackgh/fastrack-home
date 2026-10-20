'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Tabs } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { CreditCard, FileText, PlusCircle, Receipt, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/features/workspace';
import { useAuth } from '@/lib/auth';
import {
  feesApi,
  type AcademicContext,
  type FeeStructure,
  type Invoice,
  type Page,
  type Payment,
  type SchoolClass,
  type StudentOption,
} from './api';
import { FeeMetrics } from './FeeMetrics';
import { GenerateInvoicesModal } from './GenerateInvoicesModal';
import { InvoiceDrawer } from './InvoiceDrawer';
import { InvoicesTab, type InvoiceFilters } from './InvoicesTab';
import { notifyLoadError } from './notify';
import { PaymentsTab, type PaymentFilters } from './PaymentsTab';
import { ReceiptModal } from './ReceiptModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { StructuresTab, type FeeStructureFilters } from './StructuresTab';

/** A tab's count, shown once its list has loaded so it never reads as zero. */
const countOf = (page: Page<unknown> | null) => (page ? ` (${page.total})` : '');

/** Invoices, payments and fee structures for the signed-in user's school. */
export function FeesPage() {
  const { can, school } = useAuth();
  const may = {
    readPayments: can('payments:read'),
    collectPayments: can('payments:collect'),
    generateInvoices: can('invoices:generate'),
    readStructures: can('fee_structures:read'),
  };
  const [activeTab, setActiveTab] = useState<string | null>('invoices');

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [term, setTerm] = useState<AcademicContext | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [filters, setFilters] = useState<InvoiceFilters>({
    search: '',
    classId: null,
    status: null,
    page: 1,
  });
  const [search] = useDebouncedValue(filters.search.trim(), 300);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  const [paymentFilters, setPaymentFilters] = useState<PaymentFilters>({
    studentId: null,
    paymentMethod: null,
    page: 1,
  });
  const [payments, setPayments] = useState<Page<Payment> | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // termId starts empty and becomes the current term once it has loaded.
  const [structureFilters, setStructureFilters] = useState<FeeStructureFilters>({
    termId: null,
    classId: null,
    page: 1,
  });
  const [structures, setStructures] = useState<Page<FeeStructure> | null>(null);
  const [structuresLoading, setStructuresLoading] = useState(false);

  const [breakdown, setBreakdown] = useState<Invoice | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  useEffect(() => {
    Promise.allSettled([
      feesApi.listClasses(),
      feesApi.currentTerm(),
      feesApi.listStudentOptions(),
    ]).then(([classesRes, termRes, studentsRes]) => {
      if (classesRes.status === 'fulfilled') setClasses(classesRes.value);
      else notifyLoadError('classes', classesRes.reason);
      // No current term is a valid setup state; generating invoices explains it.
      if (termRes.status === 'fulfilled') {
        const current = termRes.value;
        setTerm(current);
        if (current) setStructureFilters((f) => ({ ...f, termId: current.termId }));
      }
      if (studentsRes.status === 'fulfilled') setStudents(studentsRes.value);
      else notifyLoadError('students', studentsRes.reason);
    });
  }, []);

  const { page, classId, status } = filters;
  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const result = await feesApi.listInvoices({
        page,
        search,
        classId,
        status: status ?? undefined,
      });
      setInvoices(result.items);
      setInvoicesTotal(result.total);
    } catch (err) {
      notifyLoadError('invoices', err);
    } finally {
      setInvoicesLoading(false);
    }
  }, [page, search, classId, status]);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      setPayments(await feesApi.listPayments(paymentFilters));
    } catch (err) {
      notifyLoadError('payments', err);
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentFilters]);

  const loadStructures = useCallback(async () => {
    setStructuresLoading(true);
    try {
      setStructures(await feesApi.listFeeStructures(structureFilters));
    } catch (err) {
      notifyLoadError('fee structures', err);
    } finally {
      setStructuresLoading(false);
    }
  }, [structureFilters]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    if (activeTab === 'payments' && may.readPayments) loadPayments();
    if (activeTab === 'structures' && may.readStructures) loadStructures();
  }, [activeTab, may.readPayments, may.readStructures, loadPayments, loadStructures]);

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: `${c.className} (${c.classCode})` })),
    [classes],
  );
  const termOptions = term
    ? [{ value: term.termId, label: `${term.yearLabel} · ${term.termLabel}` }]
    : [];
  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        // The enrolment id: the payments filter accepts only this, the other endpoints either id.
        value: s.id,
        label: [`${s.fullName} (${s.studentCode || 'no code'})`, s.className]
          .filter(Boolean)
          .join(' • '),
      })),
    [students],
  );

  // The list response has no line items, so the breakdown loads the full invoice.
  const openBreakdown = async (invoice: Invoice) => {
    setBreakdown(invoice);
    setBreakdownLoading(true);
    try {
      setBreakdown(await feesApi.getInvoice(invoice.id));
    } catch (err) {
      notifyLoadError('the invoice breakdown', err);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const refresh = () => {
    loadInvoices();
    if (may.readPayments) loadPayments();
    if (may.readStructures) loadStructures();
  };

  const startPayment = may.collectPayments ? () => setPaying(true) : undefined;

  return (
    <>
      <PageHeader
        title="Fees & Billing"
        subtitle={
          term
            ? `Invoices, payments and fee structures · ${term.yearLabel} · ${term.termLabel}`
            : 'Invoices, payments and fee structures.'
        }
        actions={
          <>
            <Button
              leftSection={<RefreshCw size={16} />}
              variant="default"
              radius="md"
              onClick={refresh}
              loading={invoicesLoading || paymentsLoading}
            >
              Refresh
            </Button>
            {startPayment && (
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
                onClick={() => setGenerating(true)}
                id="btn-generate-invoices"
              >
                Generate Term Invoices
              </Button>
            )}
          </>
        }
      />

      <FeeMetrics invoices={invoices} />

      <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
        <Tabs value={activeTab} onChange={setActiveTab} color="fastrackRed">
          <Tabs.List mb="lg">
            <Tabs.Tab value="invoices" leftSection={<FileText size={16} />}>
              Invoices & Billing ({invoicesTotal})
            </Tabs.Tab>
            {may.readPayments && (
              <Tabs.Tab value="payments" leftSection={<Receipt size={16} />}>
                Payments & Receipts{countOf(payments)}
              </Tabs.Tab>
            )}
            {may.readStructures && (
              <Tabs.Tab value="structures" leftSection={<CreditCard size={16} />}>
                Fee Structures{countOf(structures)}
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="invoices">
            <InvoicesTab
              invoices={invoices}
              total={invoicesTotal}
              loading={invoicesLoading}
              filters={filters}
              onFiltersChange={setFilters}
              classOptions={classOptions}
              onBreakdown={openBreakdown}
            />
          </Tabs.Panel>
          {may.readPayments && (
            <Tabs.Panel value="payments">
              <PaymentsTab
                payments={payments?.items ?? []}
                total={payments?.total ?? 0}
                loading={paymentsLoading}
                filters={paymentFilters}
                onFiltersChange={setPaymentFilters}
                studentOptions={studentOptions}
                onRecordPayment={startPayment}
                onShowReceipt={setReceipt}
              />
            </Tabs.Panel>
          )}
          {may.readStructures && (
            <Tabs.Panel value="structures">
              <StructuresTab
                structures={structures?.items ?? []}
                total={structures?.total ?? 0}
                loading={structuresLoading}
                filters={structureFilters}
                onFiltersChange={setStructureFilters}
                termOptions={termOptions}
                classOptions={classOptions}
              />
            </Tabs.Panel>
          )}
        </Tabs>
      </Card>

      <InvoiceDrawer
        invoice={breakdown}
        loading={breakdownLoading}
        onClose={() => setBreakdown(null)}
      />
      <GenerateInvoicesModal
        opened={generating}
        onClose={() => setGenerating(false)}
        term={term}
        classOptions={classOptions}
        onGenerated={loadInvoices}
      />
      {paying && (
        <RecordPaymentModal
          studentOptions={studentOptions}
          onClose={() => setPaying(false)}
          onRecorded={(payment) => {
            setPaying(false);
            loadInvoices();
            if (may.readPayments) loadPayments();
            if (payment) setReceipt(payment);
          }}
        />
      )}
      <ReceiptModal payment={receipt} school={school} onClose={() => setReceipt(null)} />
    </>
  );
}
