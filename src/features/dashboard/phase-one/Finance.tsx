"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Group,
  NativeSelect,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { Role } from "../model";
import {
  Bill,
  Payment,
  billTotals,
  canFinance,
  classes,
  money,
  methods,
  nextReceipt,
  planStatus,
  terms,
} from "./domain";
import { PhaseStore } from "./usePhaseState";
import { Editor, Preview, Report, Summary, Values, f, id } from "./Shared";

const reports = [
  "Payments",
  "Discount / scholarship",
  "Term fees summary",
  "Individual balances",
  "Payment methods",
  "School fees & other income",
  "School fees only",
  "Income & expenses",
  "Student bills",
  "Official fees receipts",
  "Other income receipts",
];
export function Finance({
  store,
  role,
  term,
  area,
}: {
  store: PhaseStore;
  role: Role;
  term: string;
  area: "finance" | "budgets" | "plans" | "debts";
}) {
  const { state, update } = store;
  const [view, setView] = useState(reports[0]);
  const [classId, setClass] = useState("All");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [editor, setEditor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Bill | Payment | null>(null);
  const name = (studentId: string) =>
    state.students.find((s) => s.id === studentId)?.name ?? studentId;
  const classroom = (studentId: string) =>
    state.students.find((s) => s.id === studentId)?.classId ?? "";
  const bills = state.bills.filter(
    (b) =>
      b.termId === term &&
      (classId === "All" || classroom(b.studentId) === classId),
  );
  const payments = state.payments.filter(
    (p) =>
      p.termId === term &&
      (classId === "All" || classroom(p.studentId) === classId) &&
      (!start || p.date >= start) &&
      (!end || p.date <= end),
  );
  const expenses = state.expenses.filter((e) => e.termId === term);
  const permitted = canFinance(role);
  const totals = bills.map((b) => billTotals(b, state.payments));
  const sum = (key: keyof ReturnType<typeof billTotals>) =>
    totals.reduce((s, b) => s + b[key], 0);
  const filters = (
    <Group align="end">
      <NativeSelect
        label="Class"
        value={classId}
        onChange={(e) => setClass(e.target.value)}
        data={["All", ...classes]}
      />
      {[
        "Payments",
        "Payment methods",
        "School fees & other income",
        "School fees only",
        "Official fees receipts",
        "Other income receipts",
      ].includes(view) && (
        <>
          <TextInput
            type="date"
            label="Start date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <TextInput
            type="date"
            label="End date"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
          />
        </>
      )}
    </Group>
  );
  const billColumns = [
    "Student",
    "Class",
    "Arrears B/F",
    "Total fees",
    "Accumulated",
    "Discount",
    "Payable",
    "Total payment",
    "Balance",
  ];
  const billRows = bills.map((b) => {
    const t = billTotals(b, state.payments);
    return [
      name(b.studentId),
      classroom(b.studentId),
      money(b.arrears),
      money(t.totalFees),
      money(t.accumulated),
      money(t.discount),
      money(t.payable),
      money(t.paid),
      money(t.balance),
    ];
  });
  let cols: string[] = [];
  let rows: (string | number)[][] = [];
  let open: ((i: number) => void) | undefined;
  if (
    ["Individual balances", "Student bills"].includes(view) ||
    area === "debts"
  ) {
    cols = billColumns;
    rows = billRows;
    open = (i) => setSelected(bills[i]);
  } else if (view === "Discount / scholarship") {
    cols = [
      "Student",
      "Class",
      "Tuition",
      "Total fees",
      "Tuition discount %",
      "Scholarship % (all fees)",
      "Concession",
    ];
    rows = bills.map((b) => [
      name(b.studentId),
      classroom(b.studentId),
      money(b.tuition),
      money(billTotals(b, []).totalFees),
      b.discountPercent,
      b.scholarshipPercent,
      money(billTotals(b, []).discount),
    ]);
  } else if (view === "Term fees summary") {
    cols = ["Class", ...billColumns.slice(2)];
    rows = classes
      .filter((c) => bills.some((b) => classroom(b.studentId) === c))
      .map((c) => {
        const group = bills.filter((b) => classroom(b.studentId) === c);
        const agg = group.map((b) => billTotals(b, state.payments));
        return [
          c,
          money(group.reduce((s, b) => s + b.arrears, 0)),
          ...(
            [
              "totalFees",
              "accumulated",
              "discount",
              "payable",
              "paid",
              "balance",
            ] as const
          ).map((k) => money(agg.reduce((s, b) => s + b[k], 0))),
        ];
      });
  } else if (view === "Payment methods") {
    cols = ["Method", "Transactions", "Collected"];
    rows = methods.map((m) => [
      m,
      payments.filter((p) => p.method === m).length,
      money(
        payments
          .filter((p) => p.method === m)
          .reduce((s, p) => s + p.amount, 0),
      ),
    ]);
  } else if (view === "Income & expenses") {
    cols = ["Account heading", "Total income", "Total expenses"];
    const accounts = [
      ...new Set(
        state.payments.filter((p) => p.termId === term).map((p) => p.account),
      ),
    ];
    rows = [
      ...accounts.map((a) => [
        a,
        money(
          state.payments
            .filter((p) => p.termId === term && p.account === a)
            .reduce((s, p) => s + p.amount, 0),
        ),
        money(0),
      ]),
      ...state.budgets.map((b) => [
        b.category,
        money(0),
        money(
          expenses
            .filter((e) => e.category === b.category)
            .reduce((s, e) => s + e.amount, 0),
        ),
      ]),
    ];
  } else {
    const filtered = payments
      .filter((p) =>
        ["School fees only", "Official fees receipts"].includes(view)
          ? p.kind === "School fees"
          : view === "Other income receipts"
            ? p.kind === "Other income"
            : true,
      )
      .sort((a, b) =>
        view === "School fees only"
          ? classroom(a.studentId).localeCompare(classroom(b.studentId))
          : a.account.localeCompare(b.account),
      );
    cols = [
      "Receipt",
      "Student",
      "Class",
      "Date",
      "Account",
      "Method",
      "Bank",
      "Amount",
    ];
    rows = filtered.map((p) => [
      p.id,
      name(p.studentId),
      classroom(p.studentId),
      p.date,
      p.account,
      p.method,
      p.bank || "—",
      money(p.amount),
    ]);
    open = (i) => setSelected(filtered[i]);
  }
  const savePayment = (v: Values) => {
    const amount = Math.round(Number(v.amount) * 100);
    const kind = v.kind as Payment["kind"];
    if (amount <= 0) return "Enter an amount greater than zero.";
    if (["Bank Transfer", "Cheque"].includes(v.method) && !v.bank?.trim())
      return "Enter the bank for this payment method.";
    const bill = state.bills.find(
      (b) => b.studentId === v.studentId && b.termId === term,
    );
    if (
      kind === "School fees" &&
      (!bill || amount > billTotals(bill, state.payments).balance)
    )
      return "Payment cannot exceed the selected student’s outstanding balance.";
    const payment: Payment = {
      id: nextReceipt(state.payments, kind),
      studentId: v.studentId,
      termId: term,
      date: v.date,
      amount,
      method: v.method,
      bank: v.bank || "",
      kind,
      account: kind === "School fees" ? "Tuition fee" : v.account,
      reference: v.reference || "",
    };
    if (kind === "Other income" && !v.account.trim())
      return "Enter an other-income account heading.";
    update((s) => ({
      ...s,
      payments: [...s.payments, payment],
      documents: [
        ...s.documents,
        {
          id: `archive-${payment.id}`,
          termId: term,
          title: `${payment.id} · ${name(payment.studentId)}`,
          category:
            payment.kind === "School fees"
              ? "Fees receipt"
              : "Other income receipt",
          classId: classroom(payment.studentId),
          studentId: payment.studentId,
          author: "Accounts office",
          subject: "Finance",
          filename: "",
          content: `Preview receipt ${payment.id}\n${name(payment.studentId)}\n${payment.date} · ${payment.method}\n${payment.account}: ${money(payment.amount)}\nReference: ${payment.reference || "—"}`,
        },
      ],
    }));
    setSelected(payment);
  };
  return (
    <Stack gap="lg">
      <Alert color="blue">
        Local preview ledger · {terms[term as keyof typeof terms]?.year} /{" "}
        {terms[term as keyof typeof terms]?.label}. Payments, bills, budgets,
        and payment plans recalculate together. No live transaction or
        notification is sent.
      </Alert>
      <Summary
        items={[
          { label: "Fees payable", value: money(sum("payable")) },
          { label: "Fees collected", value: money(sum("paid")) },
          { label: "Outstanding", value: money(sum("balance")) },
          {
            label: "Expenses",
            value: money(expenses.reduce((s, e) => s + e.amount, 0)),
          },
        ]}
      />
      {area === "plans" ? (
        <Report
          title="Payment plan arrangements"
          columns={[
            "Student",
            "Installments",
            "Reminder schedule",
            "Status",
            "Penalty",
          ]}
          rows={state.plans
            .filter((p) => p.termId === term)
            .map((p) => [
              name(p.studentId),
              p.installments
                .map((i) => `${money(i.amount)} due ${i.due}`)
                .join(" / "),
              planStatus(p, state).startsWith("Settled") ||
              p.status === "Cancelled"
                ? "Cancelled"
                : p.installments.map((i) => i.reminder).join(" / "),
              planStatus(p, state),
              p.status === "Active"
                ? "Exempt while arrangement is active"
                : "Standard policy",
            ])}
          add={permitted ? () => setEditor("plan") : undefined}
        >
          <Text size="sm">
            Separate from general fee reminders. Full settlement automatically
            cancels scheduled reminders in this preview.
          </Text>
          {state.plans
            .filter(
              (p) =>
                p.termId === term &&
                p.status === "Active" &&
                !planStatus(p, state).startsWith("Settled"),
            )
            .map((p) => (
              <Button
                key={p.id}
                variant="subtle"
                color="red"
                size="xs"
                onClick={() =>
                  update((s) => ({
                    ...s,
                    plans: s.plans.map((x) =>
                      x.id === p.id ? { ...x, status: "Cancelled" } : x,
                    ),
                  }))
                }
              >
                Cancel arrangement for {name(p.studentId)}
              </Button>
            ))}
        </Report>
      ) : area === "budgets" ? (
        <>
          <Group>
            <Button onClick={() => setEditor("expense")} disabled={!permitted}>
              Enter expense
            </Button>
            {role === "SCHOOL_HEAD" && (
              <Button variant="default" onClick={() => setEditor("budget")}>
                Set budget
              </Button>
            )}
          </Group>
          <Report
            title="Budget allocations vs actual expenditure"
            columns={[
              "Category",
              "Allocated",
              "Actual",
              "Available",
              "Utilization",
            ]}
            rows={state.budgets.map((b) => {
              const spent = expenses
                .filter((e) => e.category === b.category)
                .reduce((s, e) => s + e.amount, 0);
              return [
                b.category,
                money(b.amount),
                money(spent),
                money(b.amount - spent),
                b.amount
                  ? `${Math.round((spent / b.amount) * 100)}%`
                  : "Unallocated",
              ];
            })}
          />
          <Report
            title="Expenditure ledger"
            columns={[
              "Date",
              "Category",
              "Description",
              "Payee",
              "Method",
              "Amount",
            ]}
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
      ) : (
        <>
          <Group justify="space-between">
            {area === "finance" && (
              <NativeSelect
                label="Fees & revenue sub-menu"
                data={reports}
                value={view}
                onChange={(e) => setView(e.target.value)}
              />
            )}
            <Group>
              {permitted && (
                <Button onClick={() => setEditor("payment")}>
                  Record payment
                </Button>
              )}
              {permitted && (
                <Button
                  variant="default"
                  onClick={() => setEditor("concession")}
                >
                  Set discount / scholarship
                </Button>
              )}
            </Group>
          </Group>
          {start && end && start > end ? (
            <Alert color="red">End date must be on or after start date.</Alert>
          ) : (
            <Report
              title={
                area === "debts" ? "Individual outstanding balances" : view
              }
              subtitle="Amounts in Ghana cedi · academic year and term selected above"
              columns={cols}
              rows={rows}
              onOpen={open}
            >
              {view !== "Income & expenses" && filters}
            </Report>
          )}
        </>
      )}
      {editor === "payment" && (
        <Editor
          title="Payment entry"
          onClose={() => setEditor(null)}
          initial={{
            kind: "School fees",
            date: "2026-09-23",
            account: "Tuition fee",
          }}
          fields={[
            f(
              "studentId",
              "Student",
              "text",
              state.students.map((s) => s.id),
            ),
            f("kind", "Payment type", "text", ["School fees", "Other income"]),
            f("date", "Payment date", "date"),
            { ...f("amount", "Amount (GH₵)", "number"), min: 0.01 },
            f("method", "Payment method", "text", methods),
            f("bank", "Bank name", "text", undefined, false),
            f("account", "Account heading"),
            f("reference", "Transaction reference", "text", undefined, false),
          ]}
          onSave={savePayment}
        />
      )}
      {editor === "expense" && (
        <Editor
          title="Expenses entry"
          onClose={() => setEditor(null)}
          initial={{ date: "2026-09-23" }}
          fields={[
            f("date", "Expense date", "date"),
            f(
              "category",
              "Category",
              "text",
              state.budgets.map((b) => b.category),
            ),
            f("description", "Description"),
            f("payee", "Payee"),
            { ...f("amount", "Amount (GH₵)", "number"), min: 0.01 },
            f("method", "Payment method", "text", methods),
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
      {editor === "budget" && (
        <Editor
          title="Budget allocation"
          onClose={() => setEditor(null)}
          fields={[
            f(
              "category",
              "Category",
              "text",
              state.budgets.map((b) => b.category),
            ),
            { ...f("amount", "Allocation (GH₵)", "number"), min: 0.01 },
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
      {editor === "concession" && (
        <Editor
          title="Discount / scholarship"
          onClose={() => setEditor(null)}
          fields={[
            f(
              "studentId",
              "Student",
              "text",
              bills.map((b) => b.studentId),
            ),
            f("type", "Concession type", "text", [
              "Tuition discount",
              "Scholarship",
            ]),
            { ...f("percent", "Percentage", "number"), min: 0, max: 100 },
          ]}
          onSave={(v) => {
            const bill = bills.find((b) => b.studentId === v.studentId)!;
            const next = {
              ...bill,
              discountPercent:
                v.type === "Tuition discount" ? Number(v.percent) : 0,
              scholarshipPercent:
                v.type === "Scholarship" ? Number(v.percent) : 0,
            };
            if (billTotals(next, state.payments).balance < 0)
              return "This concession would exceed the remaining balance. Review prior payments first.";
            update((s) => ({
              ...s,
              bills: s.bills.map((b) => (b.id === bill.id ? next : b)),
            }));
          }}
        />
      )}
      {editor === "plan" && (
        <Editor
          title="Payment plan · up to three installments"
          onClose={() => setEditor(null)}
          fields={[
            f(
              "studentId",
              "Student",
              "text",
              bills.map((b) => b.studentId),
            ),
            ...[1, 2, 3].flatMap((i) => [
              {
                ...f(
                  `amount${i}`,
                  `Installment ${i} (GH₵)`,
                  "number",
                  undefined,
                  i === 1,
                ),
                min: 0.01,
              },
              f(`due${i}`, `Due date ${i}`, "date", undefined, i === 1),
              f(
                `reminder${i}`,
                `Reminder date ${i}`,
                "date",
                undefined,
                i === 1,
              ),
            ]),
          ]}
          onSave={(v) => {
            const installments = [1, 2, 3]
              .filter(
                (i) => v[`amount${i}`] || v[`due${i}`] || v[`reminder${i}`],
              )
              .map((i) => ({
                amount: Math.round(Number(v[`amount${i}`]) * 100),
                due: v[`due${i}`],
                reminder: v[`reminder${i}`],
              }));
            if (
              installments.some(
                (i) => !i.amount || !i.due || !i.reminder || i.reminder > i.due,
              )
            )
              return "Complete each installment; its reminder must be on or before the due date.";
            if (
              installments.some(
                (x, i) => i > 0 && x.due <= installments[i - 1].due,
              )
            )
              return "Installment due dates must be in increasing order.";
            const bill = bills.find((b) => b.studentId === v.studentId)!;
            if (
              installments.reduce((s, i) => s + i.amount, 0) !==
              billTotals(bill, state.payments).balance
            )
              return "Installments must add up to the outstanding balance.";
            if (
              state.plans.some(
                (p) =>
                  p.studentId === v.studentId &&
                  p.termId === term &&
                  p.status === "Active",
              )
            )
              return "Cancel the existing arrangement before replacing it.";
            update((s) => ({
              ...s,
              plans: [
                ...s.plans,
                {
                  id: id(),
                  studentId: v.studentId,
                  termId: term,
                  status: "Active",
                  installments,
                },
              ],
            }));
          }}
        />
      )}
      {selected && (
        <Preview
          title={
            "kind" in selected
              ? `${selected.kind === "School fees" ? "Official fees receipt" : "Other income receipt"} · ${selected.id}`
              : `Student bill · ${selected.id}`
          }
          onClose={() => setSelected(null)}
        >
          <Text fw={700}>
            {name(selected.studentId)} · {classroom(selected.studentId)}
          </Text>
          <Text>
            {terms[term as keyof typeof terms]?.year} ·{" "}
            {terms[term as keyof typeof terms]?.label}
          </Text>
          {"kind" in selected ? (
            <>
              <Text>
                Payment date: {selected.date} · {selected.method} ·{" "}
                {selected.bank || "No bank"}
              </Text>
              <Summary
                items={[
                  { label: "This payment", value: money(selected.amount) },
                  ...(selected.kind === "School fees"
                    ? (() => {
                        const b = state.bills.find(
                          (b) =>
                            b.studentId === selected.studentId &&
                            b.termId === selected.termId,
                        )!;
                        const t = billTotals(
                          b,
                          state.payments.slice(
                            0,
                            state.payments.findIndex(
                              (p) => p.id === selected.id,
                            ) + 1,
                          ),
                        );
                        return [
                          {
                            label: "Total fees (fixed)",
                            value: money(t.totalFees),
                          },
                          {
                            label: "Total payment to this receipt",
                            value: money(t.paid),
                          },
                          { label: "Balance", value: money(t.balance) },
                        ];
                      })()
                    : [{ label: "Account heading", value: selected.account }]),
                ]}
              />
              <Text size="sm">Reference: {selected.reference || "—"}</Text>
            </>
          ) : (
            <>
              <Report
                exportable={false}
                title="Bill components"
                columns={["Component", "Amount"]}
                rows={[
                  ["Arrears B/F", money(selected.arrears)],
                  ["Tuition", money(selected.tuition)],
                  ["Maintenance", money(selected.maintenance)],
                  ["Books", money(selected.books)],
                  ["Abacus", money(selected.abacus)],
                  [
                    "Discount / scholarship",
                    money(billTotals(selected, state.payments).discount),
                  ],
                  [
                    "Total bill",
                    money(billTotals(selected, state.payments).payable),
                  ],
                  [
                    "Balance due",
                    money(billTotals(selected, state.payments).balance),
                  ],
                ]}
              />
              <Text size="sm">
                Parent copy · preview only. Sharing will be connected to the
                backend later.
              </Text>
            </>
          )}
        </Preview>
      )}
    </Stack>
  );
}
