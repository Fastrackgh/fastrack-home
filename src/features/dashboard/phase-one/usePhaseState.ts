"use client";
import { useEffect, useState } from "react";
import { Role } from "../model";
import { initialPhaseState, PhaseState } from "./domain";
export function usePhaseState(role: Role, term: string, child: string) {
  const scope = `${role}:${term}:${child}`;
  const urls = useState(() => ({ current: [] as string[] }))[0];
  const [store, setStore] = useState(() => ({
    scope,
    state: initialPhaseState(role, child),
  }));
  // Scope change resets synchronously, preventing a frame of another role/child's records.
  if (store.scope !== scope)
    setStore({ scope, state: initialPhaseState(role, child) });
  useEffect(
    () => () => {
      Object.values(urls.current).forEach(URL.revokeObjectURL);
      urls.current = [];
    },
    [scope],
  );
  useEffect(() => {
    if (!["SCHOOL_HEAD", "SECRETARY"].includes(role)) return;
    const channel = new BroadcastChannel("fastrack-preview-admissions");
    channel.onmessage = (event) => {
      const a = event.data;
      if (
        a?.type !== "preview-application" ||
        a.termId !== term ||
        !a.values ||
        typeof a.id !== "string"
      )
        return;
      const required = [
        "name",
        "birthDate",
        "gender",
        "classId",
        "nationality",
        "parent",
        "phone",
        "email",
        "address",
      ];
      if (
        !required.every(
          (k) => typeof a.values[k] === "string" && a.values[k].trim(),
        )
      )
        return;
      setStore((old) =>
        old.state.enquiries.some((e) => e.id === a.id)
          ? old
          : {
              ...old,
              state: {
                ...old.state,
                enquiries: [
                  ...old.state.enquiries,
                  {
                    ...a.values,
                    id: a.id,
                    termId: term,
                    date: new Date().toISOString().slice(0, 10),
                    source: "Online portal",
                    status: "Application Submitted",
                    assignedTo: "Efua Mensah",
                    followUp: "",
                    notes: "Submitted from the self-service preview.",
                  },
                ],
              },
            },
      );
    };
    return () => channel.close();
  }, [role, term]);
  const attach = (file: File) => {
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    return url;
  };
  const update = (change: (state: PhaseState) => PhaseState) =>
    setStore((old) => ({ ...old, state: change(old.state) }));
  return { state: store.state, update, attach };
}
export type PhaseStore = ReturnType<typeof usePhaseState>;
