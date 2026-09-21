"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Group,
  Modal,
  NativeSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { Area, Panel, RecordRow, Role, roleConfig, roles } from "./model";

export const workflowAllowed = (role: Role, area: Area) =>
  (
    ({
      finance: ["ADMIN"],
      debts: ["ADMIN"],
      budgets: ["ADMIN"],
      attendance: ["TEACHER"],
      gradebook: ["TEACHER"],
      communication: ["PARENT", "SCHOOL_HEAD"],
      resources: ["TEACHER"],
      schools: ["SUPER_ADMIN"],
      access: ["SUPER_ADMIN"],
    }) as Partial<Record<Area, string[]>>
  )[area]?.includes(role) ?? false;

export function Workflow({
  area,
  panel,
  role,
  onClose,
  onSave,
}: {
  area: Area;
  panel: Panel;
  role: Role;
  onClose: () => void;
  onSave: (rows: RecordRow[]) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState<string | number>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>(
    Object.fromEntries(panel.rows.map((r) => [r.id, r.status])),
  );
  const [marks, setMarks] = useState<
    Record<
      string,
      { ca: number | string; exam: number | string; comment: string }
    >
  >(
    Object.fromEntries(
      panel.rows.map((r) => {
        const [ca, exam] = r.group.split(" · ").map(Number);
        return [r.id, { ca, exam, comment: r.note }];
      }),
    ),
  );
  const [resource, setResource] = useState<File | null>(null);
  const money = area === "finance" || area === "budgets";
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!workflowAllowed(role, area)) {
      setError("This role cannot perform this action.");
      return;
    }
    if (area === "attendance") {
      onSave(
        panel.rows.map((r) => ({
          ...r,
          status: attendance[r.id],
          note: `${r.note} · Saved in preview register.`,
        })),
      );
      return;
    }
    if (area === "gradebook") {
      if (
        Object.values(marks).some(
          (m) =>
            m.ca === "" ||
            m.exam === "" ||
            !Number.isFinite(Number(m.ca)) ||
            !Number.isFinite(Number(m.exam)) ||
            Number(m.ca) < 0 ||
            Number(m.ca) > 40 ||
            Number(m.exam) < 0 ||
            Number(m.exam) > 60,
        )
      ) {
        setError(
          "Enter CA marks from 0–40 and examination marks from 0–60 for every student.",
        );
        return;
      }
      onSave(
        panel.rows.map((r) => ({
          ...r,
          group: `${marks[r.id].ca} · ${marks[r.id].exam}`,
          value: String(Number(marks[r.id].ca) + Number(marks[r.id].exam)),
          status: "Draft",
          note: marks[r.id].comment,
        })),
      );
      return;
    }
    if (
      !name.trim() ||
      !category ||
      (money && (!Number.isFinite(Number(amount)) || Number(amount) <= 0))
    ) {
      setError("Complete the required fields with valid values.");
      return;
    }
    if (area === "resources" && resource && resource.size > 10 * 1024 * 1024) {
      setError("Choose a file smaller than 10 MB.");
      return;
    }
    const newRow: RecordRow = {
      id: crypto.randomUUID(),
      name: name.trim(),
      group: category,
      value: money
        ? `GH₵ ${Number(amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`
        : area === "resources"
          ? (resource?.name ?? "Text resource")
          : "Local preview",
      status: "Draft",
      note: `${note.trim()}${resource ? ` · Attachment: ${resource.name} (metadata only; not uploaded)` : ""}`,
    };
    onSave([newRow, ...panel.rows]);
  };
  return (
    <Modal
      opened
      onClose={onClose}
      title={panel.action}
      size={area === "gradebook" ? "xl" : "lg"}
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <Alert color="yellow" title="Preview workspace">
            Changes stay in this browser session. No payment is processed,
            message sent, or backend record created.
          </Alert>
          {area === "attendance" ? (
            panel.rows.map((row) => (
              <Group key={row.id} justify="space-between">
                <Text size="sm" fw={600}>
                  {row.name}
                </Text>
                <NativeSelect
                  aria-label={`Attendance for ${row.name}`}
                  value={attendance[row.id]}
                  onChange={(e) =>
                    setAttendance({ ...attendance, [row.id]: e.target.value })
                  }
                  data={["Present", "Absent", "Late", "Half Day"]}
                />
              </Group>
            ))
          ) : area === "gradebook" ? (
            panel.rows.map((row) => (
              <div key={row.id}>
                <Text size="sm" fw={600} mb={6}>
                  {row.name}
                </Text>
                <Group grow>
                  <NumberInput
                    label="CA / 40"
                    aria-label={`CA for ${row.name}`}
                    min={0}
                    max={40}
                    value={marks[row.id].ca}
                    onChange={(v) =>
                      setMarks({
                        ...marks,
                        [row.id]: { ...marks[row.id], ca: v },
                      })
                    }
                  />
                  <NumberInput
                    label="Exam / 60"
                    aria-label={`Exam for ${row.name}`}
                    min={0}
                    max={60}
                    value={marks[row.id].exam}
                    onChange={(v) =>
                      setMarks({
                        ...marks,
                        [row.id]: { ...marks[row.id], exam: v },
                      })
                    }
                  />
                </Group>
                <Textarea
                  mt="xs"
                  label={`Term comment for ${row.name}`}
                  value={marks[row.id].comment}
                  onChange={(e) =>
                    setMarks({
                      ...marks,
                      [row.id]: { ...marks[row.id], comment: e.target.value },
                    })
                  }
                />
              </div>
            ))
          ) : (
            <>
              <TextInput
                required
                label={
                  area === "finance"
                    ? "Invoice / student reference"
                    : area === "access"
                      ? "User email"
                      : area === "schools"
                        ? "School name"
                        : area === "debts"
                          ? "Reminder subject"
                          : area === "budgets"
                            ? "Expense description"
                            : "Title / subject"
                }
                type={area === "access" ? "email" : "text"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  area === "access"
                    ? "name@school.edu.gh"
                    : "Enter a name or reference"
                }
              />
              <Select
                required
                label={
                  area === "finance"
                    ? "Payment method"
                    : area === "access"
                      ? "Role"
                      : area === "schools"
                        ? "Plan"
                        : area === "resources"
                          ? "Resource type"
                          : area === "communication"
                            ? "Recipient"
                            : "Category / audience"
                }
                placeholder="Select an option"
                value={category || null}
                onChange={(v) => setCategory(v ?? "")}
                data={
                  area === "finance"
                    ? ["Cash", "MoMo", "Bank Transfer", "Cheque"]
                    : area === "budgets"
                      ? [
                          "Supplies",
                          "Facilities",
                          "Utilities",
                          "Payroll",
                          "Transport",
                        ]
                      : area === "access"
                        ? roles.map((r) => ({
                            value: r,
                            label: roleConfig[r].label,
                          }))
                        : area === "schools"
                          ? ["Standard", "Professional", "Trial"]
                          : area === "resources"
                            ? [
                                "Lesson plan",
                                "Homework",
                                "Syllabus",
                                "Multimedia",
                              ]
                            : area === "communication"
                              ? role === "PARENT"
                                ? ["School office", "Class teacher"]
                                : [
                                    "All parents",
                                    "Primary parents",
                                    "JHS parents",
                                  ]
                              : ["Overdue accounts", "Payment plan accounts"]
                }
              />
              {money && (
                <NumberInput
                  required
                  label="Amount (GH₵)"
                  min={0.01}
                  decimalScale={2}
                  value={amount}
                  onChange={setAmount}
                />
              )}
              {area === "access" && (
                <Text size="xs" c="dimmed">
                  This invitation is a draft. School assignment and permission
                  approval must be completed by the backend before activation.
                </Text>
              )}
              {area === "resources" && (
                <div>
                  <Text
                    component="label"
                    htmlFor="resource-file"
                    size="sm"
                    fw={500}
                  >
                    Attach a resource (optional, up to 10 MB)
                  </Text>
                  <input
                    id="resource-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png,.mp4"
                    onChange={(e) => setResource(e.target.files?.[0] ?? null)}
                    style={{ display: "block", marginTop: 8, maxWidth: "100%" }}
                  />
                </div>
              )}
              <Textarea
                label={
                  area === "communication" || area === "debts"
                    ? "Message"
                    : "Notes"
                }
                required={area === "communication" || area === "debts"}
                minRows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </>
          )}
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="fastrackRed">
              Save preview {area === "attendance" ? "register" : "draft"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
