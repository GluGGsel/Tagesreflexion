"use client";

import { useEffect, useMemo, useState } from "react";
import TalkList from "./TalkList";
import { formatGermanDate } from "@/lib/date";
import type { Role, StateResponse } from "@/lib/types";
import { normalizeText, validateRequired4 } from "@/lib/validators";

type Props = { role: Role };

type Draft = {
  general_1: string;
  general_2: string;
  partner_specific: string;
  children_gratitude: string;
  talk_input: string;
};

const EMPTY: Draft = {
  general_1: "",
  general_2: "",
  partner_specific: "",
  children_gratitude: "",
  talk_input: ""
};

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return null;
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
  window.localStorage.setItem("theme", mode);
}

function setPageBackdrop(role: Role) {
  const bg =
    role === "mann"
      ? "linear-gradient(135deg, rgba(59,130,246,0.55), rgba(37,99,235,0.40), rgba(2,132,199,0.30))"
      : "linear-gradient(135deg, rgba(236,72,153,0.55), rgba(244,114,182,0.38), rgba(168,85,247,0.28))";

  document.body.style.background = bg;
  document.documentElement.style.setProperty("--page-bg", bg);
}

export default function ReflectionPage({ role }: Props) {
  const otherRole: Role = role === "mann" ? "frau" : "mann";

  const [state, setState] = useState<StateResponse | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [theme, setTheme] = useState<ThemeMode | null>(null);

  const partnerLabel = useMemo(() => (role === "mann" ? "Frau" : "Mann"), [role]);
  const meLabel = useMemo(() => (role === "mann" ? "Mann" : "Frau"), [role]);

  useEffect(() => {
    setPageBackdrop(role);
  }, [role]);

  useEffect(() => {
    const saved = getInitialTheme();
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
      return;
    }
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  async function loadState({ allowOverwriteMyDraft }: { allowOverwriteMyDraft: boolean }) {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("state fetch failed");
    const data = (await res.json()) as StateResponse;

    setState(data);

    if (allowOverwriteMyDraft) {
      const me = data.entries[role];
      setDraft({
        ...draft,
        general_1: me?.general_1 ?? "",
        general_2: me?.general_2 ?? "",
        partner_specific: me?.partner_specific ?? "",
        children_gratitude: me?.children_gratitude ?? ""
      });
      setDirty(false);
    }
  }

  useEffect(() => {
    loadState({ allowOverwriteMyDraft: true }).catch(() =>
      setStatusMsg({ kind: "err", text: "Konnte Daten nicht laden." })
    );
  }, [role]);

  useEffect(() => {
    const t = setInterval(() => {
      loadState({ allowOverwriteMyDraft: !dirty }).catch(() =>
        setStatusMsg({ kind: "err", text: "Auto-Update fehlgeschlagen." })
      );
    }, 300_000);
    return () => clearInterval(t);
  }, [dirty, role]);

  const dayDate = state?.day?.date ? formatGermanDate(state.day.date) : "";

  const otherEntry = state?.entries?.[otherRole] ?? null;

  const requiredOk = validateRequired4({
    general_1: draft.general_1,
    general_2: draft.general_2,
    partner_specific: draft.partner_specific,
    children_gratitude: draft.children_gratitude
  });

  async function saveMine() {
    await fetch(`/api/entries/${role}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        general_1: draft.general_1,
        general_2: draft.general_2,
        partner_specific: draft.partner_specific,
        children_gratitude: draft.children_gratitude
      })
    });
    setStatusMsg({ kind: "ok", text: "Gespeichert." });
    loadState({ allowOverwriteMyDraft: true });
  }

  return (
    <div className="page">
      <main className="container">
        <h1 className="title">Tagesreflexion</h1>
        <p className="date">{dayDate}</p>

        <div className="grid">
          {/* ME */}
          <section className="card">
            <h2>{meLabel}&apos;s Reflexion</h2>

            <label className="label">#1 dankbar</label>
            <textarea value={draft.general_1} onChange={(e) => setDraft({ ...draft, general_1: e.target.value })} />

            <label className="label">#2 dankbar</label>
            <textarea value={draft.general_2} onChange={(e) => setDraft({ ...draft, general_2: e.target.value })} />

            <label className="label">
              „Betreffend {partnerLabel} bin ich dankbar für...“
            </label>
            <textarea
              value={draft.partner_specific}
              onChange={(e) => setDraft({ ...draft, partner_specific: e.target.value })}
            />

            <label className="label">
              „Betreffend Kinder bin ich dankbar für...“
            </label>
            <textarea
              value={draft.children_gratitude}
              onChange={(e) => setDraft({ ...draft, children_gratitude: e.target.value })}
            />

            <button className="btn" disabled={!requiredOk} onClick={saveMine}>
              Speichern
            </button>

            {!requiredOk && <p className="small">#1–#4 dankbar müssen ausgefüllt werden.</p>}

            <hr className="sep" />

            <h3>Darüber möchte ich mich noch austauschen:</h3>
            <label className="label"># to talk about (optional)</label>
            <textarea
              value={draft.talk_input}
              onChange={(e) => setDraft({ ...draft, talk_input: e.target.value })}
            />
          </section>

          {/* PARTNER */}
          <section className="card">
            <h2>{partnerLabel}&apos;s Reflexion</h2>

            <div className="readonly">{otherEntry?.general_1 && <>#1 dankbar: {otherEntry.general_1}</>}</div>
            <div className="readonly">{otherEntry?.general_2 && <>#2 dankbar: {otherEntry.general_2}</>}</div>
            <div className="readonly">
              {otherEntry?.partner_specific && (
                <>„Betreffend {meLabel} bin ich dankbar für...“ {otherEntry.partner_specific}</>
              )}
            </div>
            <div className="readonly">
              {otherEntry?.children_gratitude && <>„Betreffend Kinder bin ich dankbar für...“ {otherEntry.children_gratitude}</>}
            </div>

            {/* to talk about nur anzeigen, wenn Partner etwas hat */}
            {state?.talk?.some((t) => t.created_by === otherRole) && (
              <p className="small">Offene Gesprächspunkte siehe unten.</p>
            )}
          </section>
        </div>

        {/* TALK LIST */}
        <section className="card" style={{ marginTop: 16 }}>
          <TalkList
            role={role}
            talk={state?.talk ?? []}
            onChanged={async () => loadState({ allowOverwriteMyDraft: false })}
          />
        </section>
      </main>
    </div>
  );
}
