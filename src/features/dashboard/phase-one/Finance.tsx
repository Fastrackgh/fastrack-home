'use client';
import { useState } from 'react';
import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { can } from '@/lib/rbac';
import type { Viewer } from '../model';
import { billTotals, money, methods, planStatus, terms } from './domain';
import { PhaseStore } from './usePhaseState';
import { Editor, Report, Summary, f, id } from './Shared';

/**
 * Budgets and payment plans. Fees, invoices and payments live on the
 * API-backed Fees & Billing page; this preview covers what it doesn't yet.
 */
export function Finance({
  store,
  viewer,
  term,
  area,
}: {
  store: PhaseStore;
  viewer: Viewer;
  term: string;
  area: 'budgets' | 'plans';
}) {
  const { state, update } = store;
  const [editor, setEditor] = useState<string | null>(null);
  const name = (studentId: string) =>
    state.students.find((s) => s.id === studentId)?.name ?? studentId;
  const bills = state.bills.filter((b) => b.termId === term);
  const expenses = state.expenses.filter((e) => e.termId === term);
  const plans = state.plans.filter((p) => p.termId === term);
  const may = {
    enterExpense: can(viewer, 'expenses:create'),
    managePlans: can(viewer, 'payment_plans:manage'),
    setBudget: can(viewer, 'budgets:manage'),
  };
  const allocated = state.budgets.reduce((s, b) => s + b.amount, 0);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const activePlans = plans.filter(
    (p) => p.status === 'Active' && !planStatus(p, state).startsWith('Settled'),
  );
  return (
    <Stack gap="lg">
      <Alert color="blue">
        Local preview ledger · {terms[term as keyof typeof terms]?.year} /{' '}
        {terms[term as keyof typeof terms]?.label}. Budgets and payment plans recalculate together.
        No live transaction or notification is sent.
      </Alert>
      <Summary
        items={
          area === 'plans'
            ? [
                { label: 'Active arrangements', value: activePlans.length },
                {
                  label: 'Under arrangement',
                  value: money(
                    activePlans.reduce(
                      (s, p) => s + p.installments.reduce((n, i) => n + i.amount, 0),
                      0,
                    ),
                  ),
                },
              ]
            : [
                { label: 'Allocated', value: money(allocated) },
                { label: 'Spent this term', value: money(spent) },
                { label: 'Available', value: money(allocated - spent) },
              ]
        }
      />
      {area === 'plans' ? (
        <Report
          title="Payment plan arrangements"
          columns={['Student', 'Installments', 'Reminder schedule', 'Status', 'Penalty']}
          rows={plans.map((p) => [
            name(p.studentId),
            p.installments.map((i) => `${money(i.amount)} due ${i.due}`).join(' / '),
            planStatus(p, state).startsWith('Settled') || p.status === 'Cancelled'
              ? 'Cancelled'
              : p.installments.map((i) => i.reminder).join(' / '),
            planStatus(p, state),
            p.status === 'Active' ? 'Exempt while arrangement is active' : 'Standard policy',
          ])}
          add={may.managePlans ? () => setEditor('plan') : undefined}
        >
          <Text size="sm">
            Separate from general fee reminders. Full settlement automatically cancels scheduled
            reminders in this preview.
          </Text>
          {may.managePlans &&
            activePlans.map((p) => (
              <Button
                key={p.id}
                variant="subtle"
                color="red"
                size="xs"
                onClick={() =>
                  update((s) => ({
                    ...s,
                    plans: s.plans.map((x) => (x.id === p.id ? { ...x, status: 'Cancelled' } : x)),
                  }))
                }
              >
                Cancel arrangement for {name(p.studentId)}
              </Button>
            ))}
        </Report>
      ) : (
        <>
          <Group>
            {may.enterExpense && (
              <Button onClick={() => setEditor('expense')}>Enter expense</Button>
            )}
            {may.setBudget && (
              <Button variant="default" onClick={() => setEditor('budget')}>
                Set budget
              </Button>
            )}
          </Group>
          <Report
            title="Budget allocations vs actual expenditure"
            columns={['Category', 'Allocated', 'Actual', 'Available', 'Utilization']}
            rows={state.budgets.map((b) => {
              const spent = expenses
                .filter((e) => e.category === b.category)
                .reduce((s, e) => s + e.amount, 0);
              return [
                b.category,
                money(b.amount),
                money(spent),
                money(b.amount - spent),
                b.amount ? `${Math.round((spent / b.amount) * 100)}%` : 'Unallocated',
              ];
            })}
          />
          <Report
            title="Expenditure ledger"
            columns={['Date', 'Category', 'Description', 'Payee', 'Method', 'Amount']}
            rows={expenses.map((e) => [
              e.date,
              e.category,
              e.description,
              e.payee,
              e.method,
              money(e.amount),
            ])}
          />
        </>
      )}
      {editor === 'expense' && may.enterExpense && (
        <Editor
          title="Expenses entry"
          onClose={() => setEditor(null)}
          initial={{ date: '2026-09-23' }}
          fields={[
            f('date', 'Expense date', 'date'),
            f(
              'category',
              'Category',
              'text',
              state.budgets.map((b) => b.category),
            ),
            f('description', 'Description'),
            f('payee', 'Payee'),
            { ...f('amount', 'Amount (GH₵)', 'number'), min: 0.01 },
            f('method', 'Payment method', 'text', methods),
          ]}
          onSave={(v) => {
            update((s) => ({
              ...s,
              expenses: [
                ...s.expenses,
                {
                  id: id(),
                  termId: term,
                  date: v.date,
                  category: v.category,
                  description: v.description,
                  payee: v.payee,
                  amount: Math.round(Number(v.amount) * 100),
                  method: v.method,
                },
              ],
            }));
          }}
        />
      )}
      {editor === 'budget' && may.setBudget && (
        <Editor
          title="Budget allocation"
          onClose={() => setEditor(null)}
          fields={[
            f(
              'category',
              'Category',
              'text',
              state.budgets.map((b) => b.category),
            ),
            { ...f('amount', 'Allocation (GH₵)', 'number'), min: 0.01 },
          ]}
          onSave={(v) => {
            update((s) => ({
              ...s,
              budgets: s.budgets.map((b) =>
                b.category === v.category
                  ? { ...b, amount: Math.round(Number(v.amount) * 100) }
                  : b,
              ),
            }));
          }}
        />
      )}
      {editor === 'plan' && may.managePlans && (
        <Editor
          title="Payment plan · up to three installments"
          onClose={() => setEditor(null)}
          fields={[
            f(
              'studentId',
              'Student',
              'text',
              bills.map((b) => b.studentId),
            ),
            ...[1, 2, 3].flatMap((i) => [
              {
                ...f(`amount${i}`, `Installment ${i} (GH₵)`, 'number', undefined, i === 1),
                min: 0.01,
              },
              f(`due${i}`, `Due date ${i}`, 'date', undefined, i === 1),
              f(`reminder${i}`, `Reminder date ${i}`, 'date', undefined, i === 1),
            ]),
          ]}
          onSave={(v) => {
            const installments = [1, 2, 3]
              .filter((i) => v[`amount${i}`] || v[`due${i}`] || v[`reminder${i}`])
              .map((i) => ({
                amount: Math.round(Number(v[`amount${i}`]) * 100),
                due: v[`due${i}`],
                reminder: v[`reminder${i}`],
              }));
            if (installments.some((i) => !i.amount || !i.due || !i.reminder || i.reminder > i.due))
              return 'Complete each installment; its reminder must be on or before the due date.';
            if (installments.some((x, i) => i > 0 && x.due <= installments[i - 1].due))
              return 'Installment due dates must be in increasing order.';
            const bill = bills.find((b) => b.studentId === v.studentId)!;
            if (
              installments.reduce((s, i) => s + i.amount, 0) !==
              billTotals(bill, state.payments).balance
            )
              return 'Installments must add up to the outstanding balance.';
            if (
              state.plans.some(
                (p) => p.studentId === v.studentId && p.termId === term && p.status === 'Active',
              )
            )
              return 'Cancel the existing arrangement before replacing it.';
            update((s) => ({
              ...s,
              plans: [
                ...s.plans,
                {
                  id: id(),
                  studentId: v.studentId,
                  termId: term,
                  status: 'Active',
                  installments,
                },
              ],
            }));
          }}
        />
      )}
    </Stack>
  );
}
