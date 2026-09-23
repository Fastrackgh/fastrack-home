"use client";
import { useState } from "react";
import { Alert, Button, Group, NativeSelect, Stack, Text } from "@mantine/core";
import { Role } from "../model";
import {
  Assessment,
  Slot,
  canAcademic,
  classes,
  hasConflict,
  resultFor,
  schoolDays,
  terms,
} from "./domain";
import { PhaseStore } from "./usePhaseState";
import { Editor, Preview, Report, Summary, f, id } from "./Shared";
export function Academics({
  store,
  role,
  term,
  area,
}: {
  store: PhaseStore;
  role: Role;
  term: string;
  area: "schedule" | "grading" | "reports" | "gradebook";
}) {
  const { state, update } = store;
  const [editor, setEditor] = useState<string | null>(null);
  const [studentId, setStudent] = useState(state.students[0]?.id ?? "");
  const [subject, setSubject] = useState("All");
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [preview, setPreview] = useState<"report" | "transcript" | null>(null);
  const [notice, setNotice] = useState("");
  const t = terms[term as keyof typeof terms];
  const marks = state.assessments.filter(
    (a) =>
      a.termId === term &&
      state.students.some((s) => s.id === a.studentId) &&
      (subject === "All" || a.subject === subject),
  );
  const student = state.students.find((s) => s.id === studentId);
  const days = schoolDays(t.start, t.end, state.events, term, student?.classId);
  const personMarks = state.assessments.filter(
    (a) =>
      a.studentId === studentId &&
      (preview === "transcript" || a.termId === term),
  );
  const slots = state.slots.filter(
    (s) =>
      s.termId === term && (role !== "TEACHER" || s.teacher === "Kofi Mensah"),
  );
  const canEdit = canAcademic(role);
  return (
    <Stack gap="lg">
      {area === "schedule" ? (
        <>
          <Group>
            <Button disabled={!canEdit} onClick={() => setEditor("slot")}>
              Add lesson / examination
            </Button>
            {canEdit && (
              <Button
                variant="default"
                onClick={() => {
                  const next: Slot = {
                    id: id(),
                    termId: term,
                    kind: "Lesson",
                    day: "Tuesday",
                    start: "09:00",
                    end: "10:00",
                    classId: "Primary 2",
                    subject: "Science",
                    teacher: "Kofi Mensah",
                    room: "Science lab",
                  };
                  if (hasConflict(next, state.slots)) {
                    setNotice(
                      "No slot generated: teacher, room, or class is already booked.",
                    );
                    return;
                  }
                  update((s) => ({ ...s, slots: [...s.slots, next] }));
                  setNotice(
                    "Generated a conflict-free sample Science slot. Review before publishing.",
                  );
                }}
              >
                Generate sample schedule
              </Button>
            )}
          </Group>
          {notice && <Alert color="blue">{notice}</Alert>}
          <Report
            title="Master timetable & examination calendar"
            columns={[
              "Type",
              "Day / date",
              "Time",
              "Class",
              "Subject",
              "Teacher",
              "Room",
            ]}
            rows={slots.map((s) => [
              s.kind,
              s.day,
              `${s.start}–${s.end}`,
              s.classId,
              s.subject,
              s.teacher,
              s.room,
            ])}
          />
          <Report
            title="Teacher availability"
            columns={["Teacher", "Booked sessions", "Allocated hours"]}
            rows={state.staff
              .filter((s) => s.category === "Teaching")
              .map((s) => {
                const assigned = slots.filter((x) => x.teacher === s.name);
                const minutes = (v: string) =>
                  Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
                return [
                  s.name,
                  assigned.length,
                  assigned.reduce(
                    (n, x) => n + (minutes(x.end) - minutes(x.start)) / 60,
                    0,
                  ),
                ];
              })}
          />
        </>
      ) : area === "grading" ? (
        <>
          <Summary
            items={[
              {
                label: "Continuous assessment weight",
                value: `${state.caWeight}%`,
              },
              { label: "Examination weight", value: `${state.examWeight}%` },
              {
                label: "GPA maximum",
                value: Math.max(...state.scales.map((s) => s.points)),
              },
            ]}
          />
          <Report
            title="Grading scale & GPA configuration"
            columns={["Minimum score", "Grade", "GPA points"]}
            rows={state.scales.map((s) => [s.min, s.grade, s.points])}
          />
          <Button disabled={!canEdit} onClick={() => setEditor("scale")}>
            Edit assessment weights & scale
          </Button>
        </>
      ) : (
        <>
          <Group justify="space-between">
            <NativeSelect
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data={["All", "English", "Mathematics", "Science"]}
            />
            <Group>
              <NativeSelect
                label="Student report"
                value={studentId}
                onChange={(e) => setStudent(e.target.value)}
                data={state.students.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
              />
              <Button
                disabled={
                  !student || !marks.some((m) => m.studentId === studentId)
                }
                onClick={() => setPreview("report")}
              >
                Generate terminal report
              </Button>
              <Button
                variant="default"
                disabled={!student}
                onClick={() => setPreview("transcript")}
              >
                Transcript
              </Button>
            </Group>
          </Group>
          <Report
            title="Continuous assessment & exam mark sheets"
            subtitle="Raw scores are out of 100; configured weights determine the final score."
            columns={[
              "Student",
              "Class",
              "Subject",
              "CA / 100",
              "Exam / 100",
              "Weighted score",
              "Grade",
              "GPA points",
            ]}
            rows={marks.map((a) => {
              const s = state.students.find((s) => s.id === a.studentId)!;
              const r = resultFor(a, state);
              return [
                s.name,
                s.classId,
                a.subject,
                a.ca,
                a.exam,
                r.total,
                r.grade,
                r.points,
              ];
            })}
            onOpen={
              role === "TEACHER" || canEdit
                ? (i) => {
                    setSelected(marks[i]);
                    setEditor("marks");
                  }
                : undefined
            }
          />
        </>
      )}
      {editor === "slot" && (
        <Editor
          title="Schedule a lesson or exam"
          onClose={() => setEditor(null)}
          fields={[
            f("kind", "Type", "text", ["Lesson", "Examination"]),
            f("day", "Weekday or exam date"),
            f("start", "Start time", "time"),
            f("end", "End time", "time"),
            f("classId", "Class", "text", classes),
            f("subject", "Subject", "text", [
              "Mathematics",
              "English",
              "Science",
              "ICT",
            ]),
            f(
              "teacher",
              "Teacher",
              "text",
              state.staff
                .filter((s) => s.category === "Teaching")
                .map((s) => s.name),
            ),
            f("room", "Room"),
          ]}
          onSave={(v) => {
            if (v.start >= v.end) return "End time must follow start time.";
            if (
              v.kind === "Lesson" &&
              ![
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
              ].includes(v.day)
            )
              return "For a lesson, enter Monday, Tuesday, Wednesday, Thursday or Friday.";
            if (
              v.kind === "Examination" &&
              (!/^\d{4}-\d{2}-\d{2}$/.test(v.day) ||
                v.day < t.start ||
                v.day > t.end)
            )
              return "Use an examination date within the term (YYYY-MM-DD).";
            const slot = { ...v, id: id(), termId: term } as unknown as Slot;
            if (hasConflict(slot, state.slots))
              return "Scheduling conflict: this class, teacher, or room is already booked.";
            update((s) => ({ ...s, slots: [...s.slots, slot] }));
          }}
        />
      )}
      {editor === "marks" && selected && (
        <Editor
          title="Enter marks & report comment"
          initial={{
            ca: String(selected.ca),
            exam: String(selected.exam),
            present: String(selected.present),
            comment: selected.comment,
          }}
          fields={[
            { ...f("ca", "CA raw mark / 100", "number"), min: 0, max: 100 },
            { ...f("exam", "Exam raw mark / 100", "number"), min: 0, max: 100 },
            {
              ...f("present", "Days present", "number"),
              min: 0,
              max: schoolDays(
                t.start,
                t.end,
                state.events,
                term,
                state.students.find((s) => s.id === selected.studentId)
                  ?.classId,
              ).total,
              step: "1",
            },
            f("comment", "Teacher comment", "textarea"),
          ]}
          onClose={() => setEditor(null)}
          onSave={(v) => {
            update((s) => ({
              ...s,
              assessments: s.assessments
                .map((a) =>
                  a.id === selected.id
                    ? {
                        ...a,
                        ca: Number(v.ca),
                        exam: Number(v.exam),
                        comment: v.comment,
                      }
                    : a.studentId === selected.studentId && a.termId === term
                      ? { ...a, present: Number(v.present) }
                      : a,
                )
                .map((a) =>
                  a.studentId === selected.studentId && a.termId === term
                    ? { ...a, present: Number(v.present) }
                    : a,
                ),
            }));
          }}
        />
      )}
      {editor === "scale" && (
        <Editor
          title="Assessment policy"
          onClose={() => setEditor(null)}
          initial={{
            ca: String(state.caWeight),
            exam: String(state.examWeight),
            ...Object.fromEntries(
              state.scales.flatMap((s, i) => [
                [`min${i}`, String(s.min)],
                [`grade${i}`, s.grade],
                [`points${i}`, String(s.points)],
              ]),
            ),
          }}
          fields={[
            { ...f("ca", "CA weight %", "number"), min: 0, max: 100 },
            { ...f("exam", "Exam weight %", "number"), min: 0, max: 100 },
            ...state.scales.flatMap((_, i) => [
              {
                ...f(`min${i}`, `Band ${i + 1} minimum`, "number"),
                min: 0,
                max: 100,
              },
              f(`grade${i}`, `Band ${i + 1} grade`),
              {
                ...f(`points${i}`, `Band ${i + 1} GPA points`, "number"),
                min: 0,
                max: 10,
              },
            ]),
          ]}
          onSave={(v) => {
            if (Number(v.ca) + Number(v.exam) !== 100)
              return "Assessment weights must total 100%.";
            const scales = state.scales
              .map((_, i) => ({
                min: Number(v[`min${i}`]),
                grade: v[`grade${i}`],
                points: Number(v[`points${i}`]),
              }))
              .sort((a, b) => b.min - a.min);
            if (
              scales.at(-1)?.min !== 0 ||
              new Set(scales.map((s) => s.min)).size !== scales.length
            )
              return "Use unique minimum scores, with the lowest band starting at zero.";
            update((s) => ({
              ...s,
              scales,
              caWeight: Number(v.ca),
              examWeight: Number(v.exam),
            }));
          }}
        />
      )}
      {preview && student && (
        <Preview
          title={
            preview === "report" ? "Terminal report card" : "Student transcript"
          }
          onClose={() => setPreview(null)}
        >
          <Text fw={700}>
            {student.name} · {student.classId}
          </Text>
          <Text>
            {t.year} · {t.label}
          </Text>
          {preview === "report" && (
            <Summary
              items={[
                { label: "School days in term", value: days.total },
                {
                  label: "Days present",
                  value: Math.min(days.total, personMarks[0]?.present ?? 0),
                },
                {
                  label: "Attendance",
                  value: days.total
                    ? `${Math.round((Math.min(days.total, personMarks[0]?.present ?? 0) / days.total) * 100)}%`
                    : "—",
                },
                {
                  label: "GPA",
                  value: personMarks.length
                    ? (
                        personMarks.reduce(
                          (s, a) => s + resultFor(a, state).points,
                          0,
                        ) / personMarks.length
                      ).toFixed(2)
                    : "—",
                },
              ]}
            />
          )}
          <Report
            title="Results"
            exportable={false}
            columns={[
              "Term",
              "Subject",
              "CA weighted",
              "Exam weighted",
              "Total",
              "Grade",
              "Comment",
            ]}
            rows={personMarks.map((a) => {
              const r = resultFor(a, state);
              return [
                a.termId,
                a.subject,
                ((a.ca * state.caWeight) / 100).toFixed(1),
                ((a.exam * state.examWeight) / 100).toFixed(1),
                r.total,
                r.grade,
                a.comment,
              ];
            })}
          />
          <Alert color="gray">
            Generated from local assessment records and the school calendar.
            Official publication and parent delivery require backend
            integration.
          </Alert>
        </Preview>
      )}
    </Stack>
  );
}
