"use client";
import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Role } from "../model";
import {
  ArchiveRecord,
  SchoolEvent,
  canAcademic,
  canManage,
  classes,
  schoolDays,
  terms,
} from "./domain";
import { PhaseStore } from "./usePhaseState";
import { Editor, Preview, Report, Summary, f, id } from "./Shared";

export function SchoolLife({
  store,
  role,
  term,
  area,
}: {
  store: PhaseStore;
  role: Role;
  term: string;
  area: "calendar" | "meals" | "gallery" | "archive" | "questions";
}) {
  const { state, update, attach } = store;
  const [editor, setEditor] = useState(false);
  const [record, setRecord] = useState<ArchiveRecord | null>(null);
  const [photo, setPhoto] = useState<{ title: string; src: string } | null>(
    null,
  );
  const [week, setWeek] = useState("4");
  const [classId, setClass] = useState(
    role === "PARENT"
      ? (state.students[0]?.classId ?? "Whole School")
      : "Whole School",
  );
  const [category, setCategory] = useState("All");
  const [subject, setSubject] = useState("All");
  const [archiveTerm, setArchiveTerm] = useState("All");
  const canEdit =
    canManage(role) ||
    (area === "calendar" && canAcademic(role)) ||
    (area === "questions" && (role === "TEACHER" || canAcademic(role)));
  const t = terms[term as keyof typeof terms];
  const days = schoolDays(t.start, t.end, state.events, term, classId);
  const events = state.events.filter(
    (e) =>
      e.termId === term &&
      (e.scope === "Whole School" ||
        e.scope === classId ||
        role !== "PARENT" ||
        e.scope === "PTA"),
  );
  const meals = state.meals.filter(
    (m) =>
      m.termId === term &&
      m.week === Number(week) &&
      (m.classId === "Whole School" ||
        classId === "Whole School" ||
        m.classId === classId),
  );
  const docs = (
    area === "questions" ? state.questions : state.documents
  ).filter(
    (d) =>
      (archiveTerm === "All" || d.termId === archiveTerm) &&
      (category === "All" || d.category === category) &&
      (subject === "All" || d.subject === subject) &&
      (classId === "Whole School" || d.classId === classId),
  );
  const images = [
    {
      title: "Learning together",
      src: "/students-in-classroom.jpeg",
      classId: "Primary 2",
    },
    {
      title: "Morning assembly",
      src: "/school_assembly.jpg",
      classId: "Whole School",
    },
    {
      title: "A new school day",
      src: "/students_running_to_school.jpg",
      classId: "Primary 4",
    },
  ].filter(
    (p) =>
      role !== "PARENT" ||
      p.classId === "Whole School" ||
      p.classId === state.students[0]?.classId,
  );
  return (
    <Stack gap="lg">
      {area === "calendar" ? (
        <>
          <Summary
            items={[
              { label: "Term begins", value: t.start },
              { label: "Weekdays", value: days.weekdays },
              { label: "Holiday / mid-term days", value: days.excluded },
              { label: "School days for attendance", value: days.total },
            ]}
          />
          <Alert color="teal">
            Weekends are excluded. Overlapping active holidays and mid-term
            breaks are deducted once; cancelled or postponed events do not
            reduce attendance days.
          </Alert>
          <Report
            title="School calendar"
            columns={[
              "Type",
              "Description",
              "Dates",
              "Time",
              "Location",
              "Audience",
              "Status",
            ]}
            rows={events.map((e) => [
              e.type,
              e.description,
              `${e.date} – ${e.endDate}`,
              `${e.startTime} – ${e.endTime}`,
              e.location,
              e.scope,
              e.status,
            ])}
            add={canEdit ? () => setEditor(true) : undefined}
          >
            <NativeSelect
              label="Attendance calendar scope"
              value={classId}
              onChange={(e) => setClass(e.target.value)}
              data={
                role === "PARENT"
                  ? [state.students[0]?.classId ?? "Whole School"]
                  : ["Whole School", ...classes]
              }
            />
            {canEdit &&
              events.map((e) => (
                <Group key={e.id}>
                  <Text size="xs" w={180}>
                    {e.description}
                  </Text>
                  <NativeSelect
                    aria-label={`Status for ${e.description}`}
                    value={e.status}
                    data={["Active", "Postponed", "Cancelled"]}
                    onChange={(event) =>
                      update((s) => ({
                        ...s,
                        events: s.events.map((x) =>
                          x.id === e.id
                            ? {
                                ...x,
                                status: event.target
                                  .value as SchoolEvent["status"],
                              }
                            : x,
                        ),
                      }))
                    }
                  />
                </Group>
              ))}
          </Report>
        </>
      ) : area === "meals" ? (
        <Report
          title="Weekly meal menu"
          subtitle={`${t.year} · ${t.label}`}
          columns={[
            "Week",
            "Day",
            "Time",
            "Meal type",
            "Menu item",
            "Grade / class",
          ]}
          rows={meals.map((m) => [
            m.week,
            m.day,
            m.time,
            m.type,
            m.item,
            m.classId,
          ])}
          add={canEdit ? () => setEditor(true) : undefined}
        >
          <Group>
            <NativeSelect
              label="Week"
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              data={Array.from({ length: 16 }, (_, i) => String(i + 1))}
            />
            <NativeSelect
              label="Grade / class"
              value={classId}
              onChange={(e) => setClass(e.target.value)}
              data={
                role === "PARENT"
                  ? [state.students[0]?.classId ?? "Whole School"]
                  : ["Whole School", ...classes]
              }
            />
          </Group>
        </Report>
      ) : area === "gallery" ? (
        <>
          <Group justify="space-between">
            <Title order={3}>School photo gallery</Title>
            <Badge variant="light">View only</Badge>
          </Group>
          <Text c="dimmed" size="sm">
            Sample school moments · no download or export actions.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {images.map((p) => (
              <button
                key={p.src}
                type="button"
                onClick={() => setPhoto(p)}
                style={{
                  padding: 0,
                  border: "1px solid #e8ebef",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "white",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <img
                  src={p.src}
                  alt={p.title}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ width: "100%", height: 220, objectFit: "cover" }}
                />
                <Text fw={600} p="md">
                  {p.title}
                </Text>
              </button>
            ))}
          </SimpleGrid>
        </>
      ) : (
        <Report
          title={area === "questions" ? "Question bank" : "Documents & archive"}
          columns={[
            "Title",
            "Year / term",
            "Category",
            "Class",
            "Subject",
            "Created by",
          ]}
          rows={docs.map((d) => [
            d.title,
            `${terms[d.termId as keyof typeof terms]?.year ?? d.termId} / ${terms[d.termId as keyof typeof terms]?.label ?? ""}`,
            d.category,
            d.classId,
            d.subject,
            d.author,
          ])}
          add={canEdit ? () => setEditor(true) : undefined}
          onOpen={(i) => setRecord(docs[i])}
        >
          <Group>
            <NativeSelect
              label="Archive term"
              value={archiveTerm}
              onChange={(e) => setArchiveTerm(e.target.value)}
              data={[
                { value: "All", label: "All years / terms" },
                ...Object.entries(terms).map(([value, t]) => ({
                  value,
                  label: `${t.year} · ${t.label}`,
                })),
              ]}
            />
            <NativeSelect
              label="Class"
              value={classId}
              onChange={(e) => setClass(e.target.value)}
              data={
                role === "PARENT"
                  ? [state.students[0]?.classId ?? "Whole School"]
                  : role === "TEACHER"
                    ? ["Whole School", "Primary 2"]
                    : ["Whole School", ...classes]
              }
            />
            {area === "questions" ? (
              <NativeSelect
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                data={["All", "Mathematics", "English", "Science", "ICT"]}
              />
            ) : (
              <NativeSelect
                label="Document category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                data={[
                  "All",
                  "Terminal report",
                  "Fees receipt",
                  "Other income receipt",
                  "Scanned document",
                  "Other",
                ]}
              />
            )}
          </Group>
        </Report>
      )}
      {editor && area === "calendar" && (
        <Editor
          title="Add school event"
          onClose={() => setEditor(false)}
          initial={{
            date: t.start,
            endDate: t.start,
            startTime: "08:00",
            endTime: "16:00",
            scope: "Whole School",
            status: "Active",
          }}
          fields={[
            f("type", "Event type", "text", [
              "Field Trip",
              "Mid-Term",
              "Holiday/Closure",
              "Sports Day",
              "PTA Meeting",
              "Examination",
            ]),
            f("description", "Description / instructions", "textarea"),
            f("date", "Start date", "date"),
            f("endDate", "End date", "date"),
            f("startTime", "Start time", "time"),
            f("endTime", "End time", "time"),
            f("location", "Location"),
            f("scope", "Target scope", "text", [
              "Whole School",
              ...classes,
              "Staff Only",
              "PTA",
            ]),
            f("status", "Status", "text", ["Active", "Postponed", "Cancelled"]),
          ]}
          onSave={(v) => {
            if (v.date > v.endDate || v.date < t.start || v.endDate > t.end)
              return "Event dates must fall within this term, with end on or after start.";
            if (v.startTime >= v.endTime)
              return "End time must follow start time.";
            update((s) => ({
              ...s,
              events: [
                ...s.events,
                { ...v, id: id(), termId: term } as unknown as SchoolEvent,
              ],
            }));
          }}
        />
      )}
      {editor && area === "meals" && (
        <Editor
          title="Add meal schedule"
          onClose={() => setEditor(false)}
          initial={{ week, time: "12:00", classId: "Whole School" }}
          fields={[
            {
              ...f("week", "Week number", "number"),
              min: 1,
              max: 16,
              step: "1",
            },
            f("day", "Day", "text", [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
            ]),
            f("time", "Serving time", "time"),
            f("type", "Meal type", "text", ["Breakfast", "Lunch", "Snack"]),
            f("item", "Menu item"),
            f("classId", "Grade / class", "text", ["Whole School", ...classes]),
          ]}
          onSave={(v) => {
            update((s) => ({
              ...s,
              meals: [
                ...s.meals,
                {
                  id: id(),
                  termId: term,
                  week: Number(v.week),
                  day: v.day,
                  time: v.time,
                  type: v.type,
                  item: v.item,
                  classId: v.classId,
                },
              ],
            }));
          }}
        />
      )}
      {editor && ["archive", "questions"].includes(area) && (
        <Editor
          title={
            area === "questions" ? "Add past questions" : "Archive a document"
          }
          onClose={() => setEditor(false)}
          initial={{
            author: role === "TEACHER" ? "Kofi Mensah" : "School office",
            category:
              area === "questions" ? "Past questions" : "Scanned document",
          }}
          fields={[
            f("title", "Title"),
            f(
              "classId",
              "Class",
              "text",
              role === "TEACHER" ? ["Primary 2"] : classes,
            ),
            f("subject", "Subject", "text", [
              "Mathematics",
              "English",
              "Science",
              "ICT",
              "All subjects",
            ]),
            f("author", "Created by"),
            f(
              "category",
              "Category",
              "text",
              area === "questions"
                ? ["Past questions"]
                : [
                    "Terminal report",
                    "Fees receipt",
                    "Other income receipt",
                    "Scanned document",
                    "Other",
                  ],
            ),
            f(
              "studentId",
              "Student (optional)",
              "text",
              state.students.map((s) => s.id),
              false,
            ),
            f("content", "Text / description", "textarea", undefined, false),
            f("file", "Upload file", "file", undefined, false),
          ]}
          onSave={(v, file) => {
            if (!file && !v.content?.trim())
              return "Add a file or document text.";
            if (
              file &&
              ![
                "application/pdf",
                "image/png",
                "image/jpeg",
                "text/plain",
              ].includes(file.type)
            )
              return "Use a PDF, PNG, JPEG, or text file.";
            const doc: ArchiveRecord = {
              id: id(),
              termId: term,
              title: v.title,
              classId: v.classId,
              subject: v.subject,
              author: v.author,
              category: v.category,
              studentId: v.studentId || undefined,
              filename: file?.name ?? "",
              url: file ? attach(file) : undefined,
              content: v.content || "",
            };
            update((s) => ({
              ...s,
              [area === "questions" ? "questions" : "documents"]: [
                ...s[area === "questions" ? "questions" : "documents"],
                doc,
              ],
            }));
          }}
        />
      )}
      {record && (
        <Preview title={record.title} onClose={() => setRecord(null)}>
          <Text>
            {record.author} · {record.subject} · {record.classId}
          </Text>
          {record.content && (
            <Text style={{ whiteSpace: "pre-wrap" }}>{record.content}</Text>
          )}
          {record.url && (
            <>
              <Text size="sm">{record.filename}</Text>
              <iframe
                title={`Preview ${record.title}`}
                src={record.url}
                sandbox=""
                style={{ width: "100%", height: 480, border: "1px solid #ddd" }}
              />
              <Button
                component="a"
                href={record.url}
                download={record.filename}
                variant="default"
              >
                Download document
              </Button>
            </>
          )}
        </Preview>
      )}
      {photo && (
        <Modal
          opened
          onClose={() => setPhoto(null)}
          title={photo.title}
          size="xl"
        >
          <img
            src={photo.src}
            alt={photo.title}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            style={{ width: "100%", display: "block", userSelect: "none" }}
          />
          <Text size="xs" c="dimmed" mt="sm">
            View-only school gallery
          </Text>
        </Modal>
      )}
    </Stack>
  );
}
