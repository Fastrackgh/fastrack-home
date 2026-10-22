'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Menu, Tabs } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  BadgePercent,
  ChevronDown,
  CreditCard,
  FilePlus2,
  FileText,
  Inbox,
  PlusCircle,
  Receipt,
  RefreshCw,
  Send,
  Tags,
} from 'lucide-react';
import { PageHeader } from '@/features/workspace';
import { useAuth } from '@/lib/auth';
import { APP_ROUTES } from '@/lib/rbac';
import {
  feesApi,
  type AcademicContext,
  type FeeType,
  type Invoice,
  type InvoiceSummary,
  type Page,
  type Payment,
  type SchoolClass,
  type StudentOption,
} from './api';
import { DiscountsPanel } from './DiscountsPanel';
import { FeeMetrics } from './FeeMetrics';
import { FeeTypesPanel } from './FeeTypesPanel';
import { GenerateInvoicesModal } from './GenerateInvoicesModal';
import { optionalFeeRequestsApi } from '@/features/optional-fee-requests/api';
import { BroadcastLinksModal } from './BroadcastLinksModal';
import { InvoiceDrawer } from './InvoiceDrawer';
import { ModifyInvoiceModal } from './ModifyInvoiceModal';
import { SupplementaryInvoiceModal } from './SupplementaryInvoiceModal';
import { InvoicesTab, type InvoiceFilters } from './InvoicesTab';
import { errorMessage, notifyLoadError } from './notify';
import { PaymentsTab, type PaymentFilters } from './PaymentsTab';
import { ReceiptModal } from './ReceiptModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { StructuresPanel } from './StructuresPanel';

/** A tab's count, shown once its list has loaded so it never reads as zero. */
const countOf = (total: number | null | undefined) => (total == null ? '' : ` (${total})`);

/** Invoices, payments, and the fee setup for the signed-in user's school. */
export function FeesPage() {
  const { can, school, user } = useAuth();
  const may = {
    readPayments: can('payments:read'),
    collectPayments: can('payments:collect'),
    generateInvoices: can('invoices:generate'),
    // The backend lets only the Principal correct an issued bill.
    correctInvoices: can('invoices:generate') && user?.role === 'PRINCIPAL',
    reviewServiceRequests: can('student_fee_preferences:manage'),
    readStructures: can('fee_structures:read'),
    manageStructures: can('fee_structures:manage'),
    readFeeTypes: can('fee_types:read'),
    manageFeeTypes: can('fee_types:manage'),
    readDiscounts: can('discounts:read'),
    manageDiscounts: can('discounts:manage'),
  };
  const [activeTab, setActiveTab] = useState<string | null>('invoices');

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [term, setTerm] = useState<AcademicContext | null>(null);
  const [terms, setTerms] = useState<AcademicContext[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [feeTypesLoading, setFeeTypesLoading] = useState(false);
  const [feeTypesError, setFeeTypesError] = useState<string | null>(null);

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
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);

  const [paymentFilters, setPaymentFilters] = useState<PaymentFilters>({
    studentId: null,
    paymentMethod: null,
    page: 1,
  });
  const [payments, setPayments] = useState<Page<Payment> | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  // Totals reported by the self-loading setup tabs, for their tab labels.
  const [structuresTotal, setStructuresTotal] = useState<number | null>(null);
  const [discountsTotal, setDiscountsTotal] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [breakdown, setBreakdown] = useState<Invoice | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [extraBill, setExtraBill] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [correcting, setCorrecting] = useState<Invoice | null>(null);
  /** Parents' optional-service requests awaiting a decision; null until known. */
  const [pendingRequests, setPendingRequests] = useState<number | null>(null);

  useEffect(() => {
    if (!may.reviewServiceRequests) return;
    // A hint on a button: when the count can't load, the button still works.
    optionalFeeRequestsApi
      .pendingCount()
      .then(setPendingRequests)
      .catch(() => setPendingRequests(null));
  }, [may.reviewServiceRequests]);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  useEffect(() => {
    Promise.allSettled([
      feesApi.listClasses(),
      feesApi.currentTerm(),
      feesApi.listTerms(),
      feesApi.listStudentOptions(),
    ]).then(([classesRes, termRes, termsRes, studentsRes]) => {
      if (classesRes.status === 'fulfilled') setClasses(classesRes.value);
      else notifyLoadError('classes', classesRes.reason);
      // No current term is a valid setup state; generating invoices explains it.
      if (termRes.status === 'fulfilled') setTerm(termRes.value);
      if (termsRes.status === 'fulfilled') setTerms(termsRes.value);
      else notifyLoadError('academic terms', termsRes.reason);
      if (studentsRes.status === 'fulfilled') setStudents(studentsRes.value);
      else notifyLoadError('students', studentsRes.reason);
    });
  }, []);

  const loadFeeTypes = useCallback(async () => {
    setFeeTypesLoading(true);
    setFeeTypesError(null);
    try {
      setFeeTypes(await feesApi.listFeeTypes());
    } catch (err) {
      setFeeTypesError(errorMessage(err, 'Could not load the fee types.'));
    } finally {
      setFeeTypesLoading(false);
    }
  }, []);

  // The fee structure and discount forms need the fee types as well.
  useEffect(() => {
    if (may.readFeeTypes) loadFeeTypes();
  }, [may.readFeeTypes, loadFeeTypes]);

  const { page, classId, status } = filters;
  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    setInvoicesError(null);
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
      setInvoicesError(errorMessage(err, 'Could not load the invoices.'));
    } finally {
      setInvoicesLoading(false);
    }
  }, [page, search, classId, status]);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      setPayments(await feesApi.listPayments(paymentFilters));
    } catch (err) {
      setPaymentsError(errorMessage(err, 'Could not load the payments.'));
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentFilters]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // The cards cover the same invoices as the table's filters, across every page.
  useEffect(() => {
    let current = true;
    feesApi
      .invoiceSummary({ search, classId, status: status ?? undefined })
      .then((result) => current && setSummary(result))
      .catch(() => current && setSummary(null));
    return () => {
      current = false;
    };
  }, [search, classId, status, invoicesTotal]);

  useEffect(() => {
    if (activeTab === 'payments' && may.readPayments) loadPayments();
  }, [activeTab, may.readPayments, loadPayments]);

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: `${c.className} (${c.classCode})` })),
    [classes],
  );
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
    if (may.readFeeTypes) loadFeeTypes();
    setReloadKey((key) => key + 1);
  };

  const startPayment = may.collectPayments ? () => setPaying(true) : undefined;

  return (
    <>
      <PageHeader
        title="Fees & Billing"
        subtitle={
          term
            ? `Invoices, payments and fee setup · ${term.yearLabel} · ${term.termLabel}`
            : 'Invoices, payments and fee setup.'
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
            {may.reviewServiceRequests && (
              <Button
                component={Link}
                href={APP_ROUTES.optionalFeeRequests.path}
                variant="default"
                radius="md"
                leftSection={<Inbox size={16} />}
                rightSection={
                  pendingRequests ? (
                    <Badge size="sm" color="fastrackRed" circle={pendingRequests < 10}>
                      {pendingRequests}
                    </Badge>
                  ) : undefined
                }
              >
                Service requests
              </Button>
            )}
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
            {may.generateInvoices && (
              <Menu position="bottom-end" radius="md" shadow="md">
                <Menu.Target>
                  <Button variant="default" radius="md" rightSection={<ChevronDown size={14} />}>
                    More billing
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<FilePlus2 size={14} />}
                    onClick={() => setExtraBill(true)}
                  >
                    Extra bill (exam, excursion…)
                  </Menu.Item>
                  <Menu.Item leftSection={<Send size={14} />} onClick={() => setBroadcasting(true)}>
                    Send bill links to parents
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </>
        }
      />

      <FeeMetrics invoices={invoices} summary={summary} />

      <Card withBorder radius="lg" p="lg" style={{ borderColor: '#e8edf3' }}>
        <Tabs value={activeTab} onChange={setActiveTab} color="fastrackRed">
          <Tabs.List mb="lg">
            <Tabs.Tab value="invoices" leftSection={<FileText size={16} />}>
              Invoices & Billing ({invoicesTotal})
            </Tabs.Tab>
            {may.readPayments && (
              <Tabs.Tab value="payments" leftSection={<Receipt size={16} />}>
                Payments & Receipts{countOf(payments?.total)}
              </Tabs.Tab>
            )}
            {may.readStructures && (
              <Tabs.Tab value="structures" leftSection={<CreditCard size={16} />}>
                Fee Structures{countOf(structuresTotal)}
              </Tabs.Tab>
            )}
            {may.readFeeTypes && (
              <Tabs.Tab value="fee-types" leftSection={<Tags size={16} />}>
                Fee Types{countOf(feeTypesLoading ? null : feeTypes.length)}
              </Tabs.Tab>
            )}
            {may.readDiscounts && (
              <Tabs.Tab value="discounts" leftSection={<BadgePercent size={16} />}>
                Discounts{countOf(discountsTotal)}
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Tabs.Panel value="invoices">
            <InvoicesTab
              invoices={invoices}
              total={invoicesTotal}
              loading={invoicesLoading}
              error={invoicesError}
              onRetry={loadInvoices}
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
                error={paymentsError}
                onRetry={loadPayments}
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
              <StructuresPanel
                active={activeTab === 'structures'}
                reloadKey={reloadKey}
                terms={terms}
                currentTermId={term?.termId ?? null}
                classOptions={classOptions}
                feeTypes={feeTypes}
                canManage={may.manageStructures}
                onTotal={setStructuresTotal}
              />
            </Tabs.Panel>
          )}
          {may.readFeeTypes && (
            <Tabs.Panel value="fee-types">
              <FeeTypesPanel
                feeTypes={feeTypes}
                loading={feeTypesLoading}
                error={feeTypesError}
                onRetry={loadFeeTypes}
                canManage={may.manageFeeTypes}
                onChanged={loadFeeTypes}
              />
            </Tabs.Panel>
          )}
          {may.readDiscounts && (
            <Tabs.Panel value="discounts">
              <DiscountsPanel
                active={activeTab === 'discounts'}
                reloadKey={reloadKey}
                terms={terms}
                currentTermId={term?.termId ?? null}
                studentOptions={studentOptions}
                feeTypes={feeTypes}
                canManage={may.manageDiscounts}
                onTotal={setDiscountsTotal}
              />
            </Tabs.Panel>
          )}
        </Tabs>
      </Card>

      <InvoiceDrawer
        invoice={breakdown}
        loading={breakdownLoading}
        onClose={() => setBreakdown(null)}
        canSendLink={may.generateInvoices}
        onModify={may.correctInvoices ? setCorrecting : undefined}
      />
      {correcting && (
        <ModifyInvoiceModal
          invoice={correcting}
          onClose={() => setCorrecting(null)}
          onSaved={(updated) => {
            setCorrecting(null);
            setBreakdown(updated);
            loadInvoices();
          }}
        />
      )}
      {extraBill && (
        <SupplementaryInvoiceModal
          terms={terms}
          currentTermId={term?.termId ?? null}
          feeTypes={feeTypes}
          classOptions={classOptions}
          studentOptions={studentOptions}
          onClose={() => setExtraBill(false)}
          onGenerated={() => {
            setExtraBill(false);
            loadInvoices();
          }}
        />
      )}
      {broadcasting && (
        <BroadcastLinksModal
          terms={terms}
          currentTermId={term?.termId ?? null}
          classOptions={classOptions}
          onClose={() => setBroadcasting(false)}
        />
      )}
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
