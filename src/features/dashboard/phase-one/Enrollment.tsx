"use client";
import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Group, NativeSelect, Stack, Text } from "@mantine/core";
import { Role } from "../model";
import { Enquiry, Student, Staff, canManage, classes, terms } from "./domain";
import { PhaseStore } from "./usePhaseState";
import {
  Editor,
  Field,
  Preview,
  Report,
  Summary,
  Values,
  f,
  id,
} from "./Shared";

export const studentFields: Field[] = [
  f("name", "Student full name"),
  f("birthDate", "Date of birth", "date"),
  f("gender", "Gender", "text", ["Male", "Female"]),
  f("classId", "Class applying for", "text", classes),
  f("nationality", "Nationality"),
  f("parent", "Parent / guardian full name"),
  f("phone", "Contact number"),
  f("email", "Email address", "email"),
  f("address", "Residential address"),
  f("previousSchool", "Previous school", "text", undefined, false),
];
export function validStudent(v: Values) {
  if (v.birthDate > new Date().toISOString().slice(0, 10))
    return "Date of birth cannot be in the future.";
  if (!/^[+\d ()-]{7,20}$/.test(v.phone))
    return "Enter a valid contact number.";
}
export function Enrollment({
  store,
  role,
  term,
  area,
}: {
  store: PhaseStore;
  role: Role;
  term: string;
  area: "enrollment" | "enquiries" | "admissions" | "staffing";
}) {
  const { state, update } = store;
  const [view, setView] = useState("Active students");
  const [classId, setClass] = useState("All");
  const [gender, setGender] = useState("All");
  const [editor, setEditor] = useState<string | null>(null);
  const [staffEdit, setStaffEdit] = useState<Staff | null>(null);
  const [enquiryEdit, setEnquiryEdit] = useState<Enquiry | null>(null);
  const [selected, setSelected] = useState<Student | Enquiry | null>(null);
  const manage = canManage(role);
  const students = state.students.filter(
    (s) =>
      (classId === "All" || s.classId === classId) &&
      (gender === "All" || s.gender === gender),
  );
  const termData = terms[term as keyof typeof terms];
  const current = students.filter(
    (s) =>
      s.admissionDate <= termData.end &&
      (!s.exitDate || s.exitDate > termData.end),
  );
  const newStudents = students.filter((s) => s.termId === term);
  const stopped = students.filter(
    (s) =>
      s.exitDate && s.exitDate >= termData.start && s.exitDate <= termData.end,
  );
  const list =
    view === "New admissions"
      ? newStudents
      : view === "Withdrawals / stopped"
        ? stopped
        : current;
  const enquiries = state.enquiries.filter(
    (e) =>
      e.termId === term &&
      (area !== "admissions" || e.source === "Online portal"),
  );
  const filters = (
    <Group>
      <NativeSelect
        label="Class"
        value={classId}
        onChange={(e) => setClass(e.target.value)}
        data={["All", ...classes]}
      />
      <NativeSelect
        label="Gender"
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        data={["All", "Male", "Female"]}
      />
    </Group>
  );
  const saveStudent = (v: Values) => {
    const error = validStudent(v);
    if (error) return error;
    if (v.admissionDate < v.birthDate)
      return "Admission date must follow date of birth.";
    const s: Student = {
      id: id(),
      name: v.name,
      birthDate: v.birthDate,
      gender: v.gender,
      classId: v.classId,
      nationality: v.nationality,
      parent: v.parent,
      phone: v.phone,
      email: v.email,
      address: v.address,
      previousSchool: v.previousSchool || "",
      admissionDate: v.admissionDate,
      termId: term,
      status: "Active",
    };
    update((old) => ({ ...old, students: [...old.students, s] }));
  };
  return (
    <Stack>
      <Summary
        items={[
          { label: "Active students", value: current.length },
          { label: "New this term", value: newStudents.length },
          { label: "Withdrawals", value: stopped.length },
          {
            label: "Open enquiries",
            value: enquiries.filter(
              (e) => !["Enrolled", "Cancelled"].includes(e.status),
            ).length,
          },
        ]}
      />
      {area === "staffing" ? (
        <Report
          title="Staffing directory"
          columns={["Name", "Category", "Position", "Email", "Phone", "Status"]}
          rows={state.staff.map((s) => [
            s.name,
            s.category,
            s.position,
            s.email,
            s.phone,
            s.status,
          ])}
          add={
            manage
              ? () => {
                  setStaffEdit(null);
                  setEditor("staff");
                }
              : undefined
          }
          onOpen={
            manage
              ? (i) => {
                  setStaffEdit(state.staff[i]);
                  setEditor("staff");
                }
              : undefined
          }
        >
          <Text size="sm">
            Open a staff record to review contact details, position, and active
            status.
          </Text>
        </Report>
      ) : area === "enquiries" || area === "admissions" ? (
        <>
          <Group justify="space-between">
            {area === "admissions" && (
              <Button
                component={Link}
                href="/school-admin/admissions"
                target="_blank"
              >
                Open self-service admission portal
              </Button>
            )}
          </Group>
          <Report
            title={
              area === "admissions"
                ? "Online admission applications"
                : "Admission enquiries"
            }
            columns={[
              "Student",
              "Class",
              "Parent",
              "Source",
              "Status",
              "Assigned to",
              "Follow-up",
            ]}
            rows={enquiries.map((e) => [
              e.name,
              e.classId,
              e.parent,
              e.source,
              e.status,
              e.assignedTo,
              e.followUp,
            ])}
            onOpen={(i) => setSelected(enquiries[i])}
            add={manage ? () => setEditor("enquiry") : undefined}
          />
        </>
      ) : (
        <>
          <Group justify="space-between">
            <NativeSelect
              label="Enrollment sub-menu"
              value={view}
              onChange={(e) => setView(e.target.value)}
              data={[
                "Active students",
                "Active totals by class",
                "New admissions",
                "Withdrawals / stopped",
                "Enrollment analysis",
              ]}
            />
            {manage && (
              <Button onClick={() => setEditor("student")}>
                Enroll student
              </Button>
            )}
          </Group>
          {view === "Enrollment analysis" ? (
            <Report
              title="Enrollment trends"
              columns={[
                "Academic year / term",
                "Admissions",
                "Withdrawals",
                "Net movement",
              ]}
              rows={Object.entries(terms).map(([key, t]) => {
                const admitted = students.filter(
                  (s) => s.termId === key,
                ).length;
                const withdrawn = students.filter(
                  (s) =>
                    s.exitDate && s.exitDate >= t.start && s.exitDate <= t.end,
                ).length;
                return [
                  `${t.year} · ${t.label}`,
                  admitted,
                  withdrawn,
                  admitted - withdrawn,
                ];
              })}
            >
              {filters}
            </Report>
          ) : view === "Active totals by class" ? (
            <Report
              title="Active students by class"
              columns={["Class", "Male", "Female", "Total"]}
              rows={classes
                .filter((c) => classId === "All" || c === classId)
                .map((c) => [
                  c,
                  current.filter((s) => s.classId === c && s.gender === "Male")
                    .length,
                  current.filter(
                    (s) => s.classId === c && s.gender === "Female",
                  ).length,
                  current.filter((s) => s.classId === c).length,
                ])}
            >
              {filters}
            </Report>
          ) : (
            <Report
              title={view}
              columns={[
                "Student ID",
                "Name",
                "Class",
                "Gender",
                "Admission date",
                "Status",
                "Exit date",
              ]}
              rows={list.map((s) => [
                s.id,
                s.name,
                s.classId,
                s.gender,
                s.admissionDate,
                s.status,
                s.exitDate || "—",
              ])}
              onOpen={(i) => setSelected(list[i])}
            >
              {filters}
            </Report>
          )}
        </>
      )}
      {editor === "student" && (
        <Editor
          title="Student enrollment"
          fields={[
            ...studentFields,
            f("admissionDate", "Admission date", "date"),
          ]}
          initial={{ nationality: "Ghanaian", admissionDate: termData.start }}
          onClose={() => setEditor(null)}
          onSave={saveStudent}
        />
      )}
      {editor === "enquiry" && (
        <Editor
          title={
            enquiryEdit ? "Update enquiry & follow-up" : "New admission enquiry"
          }
          fields={[
            ...studentFields,
            f("date", "Enquiry date", "date"),
            f("source", "Enquiry source", "text", [
              "School website",
              "Referral",
              "Walk-In",
              "Social Media",
              "Online portal",
            ]),
            f("assignedTo", "Assigned to"),
            f("followUp", "Follow-up date", "date"),
            f("notes", "Remarks", "textarea", undefined, false),
          ]}
          initial={
            enquiryEdit
              ? { ...enquiryEdit }
              : {
                  nationality: "Ghanaian",
                  date: "2026-09-23",
                  assignedTo: "Efua Mensah",
                }
          }
          onClose={() => {
            setEditor(null);
            setEnquiryEdit(null);
          }}
          onSave={(v) => {
            const error = validStudent(v);
            if (error) return error;
            if (v.followUp < v.date)
              return "Follow-up must be on or after the enquiry date.";
            update((s) => ({
              ...s,
              enquiries: [
                ...s.enquiries.filter((e) => e.id !== enquiryEdit?.id),
                {
                  ...v,
                  id: enquiryEdit?.id ?? id(),
                  termId: term,
                  status: enquiryEdit?.status ?? "New",
                  previousSchool: v.previousSchool || "",
                  notes: v.notes || "",
                } as unknown as Enquiry,
              ],
            }));
          }}
        />
      )}
      {editor === "staff" && (
        <Editor
          title={staffEdit ? "Edit staff member" : "Add staff member"}
          initial={staffEdit ? { ...staffEdit } : { status: "Active" }}
          fields={[
            f("name", "Full name"),
            f("email", "Email", "email"),
            f("phone", "Phone"),
            f("category", "Staff category", "text", [
              "Teaching",
              "Non-Teaching",
            ]),
            f("position", "Position"),
            f("status", "Status", "text", ["Active", "Inactive"]),
          ]}
          onClose={() => setEditor(null)}
          onSave={(v) => {
            update((s) => ({
              ...s,
              staff: [
                ...s.staff.filter((x) => x.id !== staffEdit?.id),
                {
                  id: staffEdit?.id ?? id(),
                  name: v.name,
                  email: v.email,
                  phone: v.phone,
                  category: v.category,
                  position: v.position,
                  status: v.status,
                },
              ],
            }));
          }}
        />
      )}
      {selected && (
        <Preview
          title={"source" in selected ? "Enquiry details" : "Student record"}
          onClose={() => setSelected(null)}
        >
          {Object.entries(selected).map(([k, v]) => (
            <Text key={k} size="sm">
              <strong>{k.replace(/([A-Z])/g, " $1")}: </strong>
              {v || "—"}
            </Text>
          ))}
          {manage &&
            ("source" in selected ? (
              <Group>
                <Button
                  variant="default"
                  onClick={() => {
                    setEnquiryEdit(selected);
                    setEditor("enquiry");
                    setSelected(null);
                  }}
                >
                  Edit enquiry / follow-up
                </Button>
                {selected.status !== "Enrolled" &&
                  selected.status !== "Cancelled" && (
                    <Button
                      onClick={() => {
                        const applicant = selected;
                        update((s) => ({
                          ...s,
                          students: [
                            ...s.students,
                            {
                              id: applicant.id,
                              name: applicant.name,
                              birthDate: applicant.birthDate,
                              gender: applicant.gender,
                              classId: applicant.classId,
                              nationality: applicant.nationality,
                              parent: applicant.parent,
                              phone: applicant.phone,
                              email: applicant.email,
                              address: applicant.address,
                              previousSchool: applicant.previousSchool || "",
                              admissionDate: termData.start,
                              termId: term,
                              status: "Active",
                            },
                          ],
                          enquiries: s.enquiries.map((e) =>
                            e.id === applicant.id
                              ? { ...e, status: "Enrolled" }
                              : e,
                          ),
                        }));
                        setSelected({ ...applicant, status: "Enrolled" });
                      }}
                    >
                      Enroll applicant
                    </Button>
                  )}
                {(selected.status === "Enrolled"
                  ? []
                  : ["Application Submitted", "Cancelled"]
                ).map((status) => (
                  <Button
                    key={status}
                    variant="default"
                    onClick={() => {
                      update((s) => ({
                        ...s,
                        enquiries: s.enquiries.map((e) =>
                          e.id === selected.id ? { ...e, status } : e,
                        ),
                      }));
                      setSelected({ ...selected, status });
                    }}
                  >
                    {status}
                  </Button>
                ))}
              </Group>
            ) : selected.status === "Active" ? (
              <Button
                color="red"
                variant="light"
                onClick={() => setEditor("withdraw")}
              >
                Record withdrawal
              </Button>
            ) : null)}
        </Preview>
      )}
      {editor === "withdraw" && selected && "admissionDate" in selected && (
        <Editor
          title="Record withdrawal"
          fields={[
            f("date", "Exit date", "date"),
            f("reason", "Reason", "textarea"),
          ]}
          onClose={() => setEditor(null)}
          onSave={(v) => {
            if (v.date < selected.admissionDate)
              return "Exit date cannot precede admission.";
            update((s) => ({
              ...s,
              students: s.students.map((x) =>
                x.id === selected.id
                  ? {
                      ...x,
                      status: "Stopped",
                      exitDate: v.date,
                      exitReason: v.reason,
                    }
                  : x,
              ),
            }));
            setSelected(null);
          }}
        />
      )}
    </Stack>
  );
}
