"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Container,
  Paper,
  Stack,
  Stepper,
  Text,
  Title,
} from "@mantine/core";
import { Editor, Values } from "./Shared";
import { studentFields, validStudent } from "./Enrollment";
export function AdmissionPortal() {
  const [draft, setDraft] = useState<Values | null>(null);
  const [edit, setEdit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  return (
    <Container size="sm" py={60}>
      <Paper withBorder radius="lg" p="xl">
        <Stack>
          <Title order={1} size="h2">
            Apply to Fastrack International
          </Title>
          <Text>2026/27 · Term 1 · Self-service admissions</Text>
          <Alert color="blue">
            Preview only. Use sample details. Keep the staff dashboard open in
            another tab to receive the application locally; nothing is sent to a
            server.
          </Alert>
          <Stepper active={submitted ? 2 : draft ? 1 : 0}>
            <Stepper.Step label="Applicant" />
            <Stepper.Step label="Review" />
            <Stepper.Step label="Complete" />
          </Stepper>
          {!draft ? (
            <Button onClick={() => setEdit(true)}>Start application</Button>
          ) : submitted ? (
            <Alert color="teal" title="Preview application complete">
              The sample application has been shared with open Principal or
              Secretary preview tabs for Term 1. No real admission request was
              submitted.
            </Alert>
          ) : (
            <>
              {Object.entries(draft).map(([k, v]) => (
                <Text key={k}>
                  <strong>{k.replace(/([A-Z])/g, " $1")}: </strong>
                  {v || "—"}
                </Text>
              ))}
              <Button variant="default" onClick={() => setEdit(true)}>
                Edit details
              </Button>
              <Button
                onClick={() => {
                  const channel = new BroadcastChannel(
                    "fastrack-preview-admissions",
                  );
                  channel.postMessage({
                    type: "preview-application",
                    id: crypto.randomUUID(),
                    termId: "2026-1",
                    values: draft,
                  });
                  channel.close();
                  setSubmitted(true);
                }}
              >
                Confirm preview application
              </Button>
            </>
          )}
          <Button
            component={Link}
            href="/school-admin/dashboard"
            variant="subtle"
          >
            Back to staff preview
          </Button>
        </Stack>
      </Paper>
      {edit && (
        <Editor
          title="Applicant & guardian details"
          fields={studentFields}
          initial={draft ?? { nationality: "Ghanaian" }}
          onClose={() => setEdit(false)}
          onSave={(v) => {
            const error = validStudent(v);
            if (error) return error;
            setDraft(v);
          }}
        />
      )}
    </Container>
  );
}
