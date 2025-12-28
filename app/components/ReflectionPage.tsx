"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export default function ReflectionPage({ role }: Props) {
  const otherRole: Role = role === "mann" ? "frau" : "mann";

  const [state, setState] = useState<StateResponse | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  const lastSyncRef = useRef<number>(0);

  const partnerLabel = useMemo(() => (role === "mann" ? "Frau" : "Mann"), [role]);
  const meLabel = useMemo(() => (role === "mann" ? "Mann" : "Frau"), [role]);

  async function loadState({ allowOverwriteMyDraft }: { allowOverwriteMyDraft: boolean }) {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) throw new Error("state fetch failed");
    const data = (await res.json()) as StateResponse;

    setState(data);

    // Overwrite only if user is not editing (or explicit allow)
    if (allowOverwriteMyDraft) {
      const me = data.entries[role];
      setDraft((prev) => ({
        ...prev,
        general_1: me?.general_1 ?? "",
        general_2: me?.general_2 ?? "",
        partner_specific: me?.partner_specific ?? "",
        children_gratitude: me?.children_gratitude ?? ""
      }));
      setDirty(false);
      lastSyncRef.current = Date.now();
    }
  }

  // initial load
  useEffect(() => {
    loadState({ allowOverwriteMyDraft: true }).catch(() => {
      setStatusMsg({ kind: "err", text: "Konnte Daten nicht laden." });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // 300s polling: update partner + talk; do not overwrite my typing if dirty
  useEffect(() => {
    const t = setInterval(() => {
      loadState({ allowOverwriteMyDraft: !dirty }).catch(() => {
        setStatusMsg({ kind: "err", text: "Auto-Update fehlgeschlagen." });
      });
    }, 300_000);
    return () => clearInterval(t);
  }, [dirty, role]);

  const dayDate = state?.day?.date ? formatGermanDate(state.day.date) : "";

  const meEntry = state?.entries?.[role] ?? null;
  const otherEntry = state?.entries?.[otherRole] ?? null;

  const canAddTalk = normalizeText(draft.talk_input).length > 0;

  const requiredOk = validateRequired4({
    general_1: draft.general_1,
    general_2: draft.general_2,
    partner_specific: draft.partner_specific,
    children_gratitude: draft.children_gratitude
  });

  async function saveMine() {
    setStatusMsg({ kind: "info", text: "Speichern…" });
    const payload = {
      general_1: draft.general_1,
      general_2: draft.general_2,
      partner_specific: draft.partner_specific,
      children_gratitude: draft.children_gratitude
    };

    const res = await fetch(`/api/entries/${role}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      setStatusMsg({ kind: "err", text: "Speichern fehlgeschlagen." });
      return;
    }
    setStatusMsg({ kind: "ok", text: "Gespeichert." });
    await loadState({ allowOverwriteMyDraft: true });
  }

  async function addTalkItem() {
    const text = normalizeText(draft.talk_input);
    if (!text) return;

    setStatusMsg({ kind: "info", text: "Punkt hinzufügen…" });
    const res = await fetch("/api/talk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, created_by: role })
    });

    if (!res.ok) {
      setStatusMsg({ kind: "err", text: "Konnte Punkt nicht hinzufügen." });
      return;
    }

    setDraft((d) => ({ ...d, talk_input: "" }));
    setStatusMsg({ kind: "ok", text: "Punkt hinzugefügt." });
    await loadState({ allowOverwriteMyDraft: false });
  }

  async function nextDay() {
    setStatusMsg({ kind: "info", text: "Wechsle Tag…" });
    const res = await fetch("/api/day/next", { method: "POST" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      setStatusMsg({ kind: "err", text: t || "Nächster Tag nicht möglich." });
      return;
    }

    setStatusMsg({ kind: "ok", text: "Neuer Tag erstellt." });
    setDraft(EMPTY);
    setDirty(false);
    await loadState({ allowOverwriteMyDraft: true });
  }

  const canNextDay = !!state?.can_next_day;

  return (
    <main className="container">
      <div className="header">
        <h1 className="title">Tagesreflexion</h1>
        <p className="date">{dayDate}</p>

        <div className="footerbar">
          <div className="row">
            <a className="btn" href={role === "mann" ? "/frau" : "/mann"} style={{ textDecoration: "none" }}>
              Zur Seite {partnerLabel}
            </a>
            <span className={`badge ${statusMsg?.kind === "ok" ? "ok" : statusMsg?.kind === "err" ? "err" : ""}`}>
              {statusMsg?.text ?? ""}
            </span>
          </div>

          <button className="btn" onClick={nextDay} disabled={!canNextDay}>
            Nächster Tag
          </button>
        </div>

        {!canNextDay && (
          <p className="small">
            „Nächster Tag“ wird aktiv, sobald beide die Pflichtfelder (1–4) ausgefüllt haben. Ja, Regeln. Brutal.
          </p>
        )}
      </div>

      <div className="grid">
        <section className="card">
          <h2>Meine Einträge ({meLabel})</h2>

          <div className="section-title">Ich bin dankbar für</div>
          <label className="label">Feld 1 (Pflicht)</label>
          <textarea
            value={draft.general_1}
            onChange={(e) => {
              setDraft((d) => ({ ...d, general_1: e.target.value }));
              setDirty(true);
            }}
          />

          <label className="label">Feld 2 (Pflicht)</label>
          <textarea
            value={draft.general_2}
            onChange={(e) => {
              setDraft((d) => ({ ...d, general_2: e.target.value }));
              setDirty(true);
            }}
          />

          <div className="section-title">Betreffend {partnerLabel} bin ich dankbar für</div>
          <label className="label">Feld 3 (Pflicht)</label>
          <textarea
            value={draft.partner_specific}
            onChange={(e) => {
              setDraft((d) => ({ ...d, partner_specific: e.target.value }));
              setDirty(true);
            }}
          />

          <div className="section-title">Betreffend Kinder bin ich dankbar</div>
          <label className="label">Feld 4 (Pflicht)</label>
          <textarea
            value={draft.children_gratitude}
            onChange={(e) => {
              setDraft((d) => ({ ...d, children_gratitude: e.target.value }));
              setDirty(true);
            }}
          />

          <div className="section-title">Darüber will ich noch reden</div>
          <label className="label">Feld 5 (optional → „To talk about“)</label>
          <textarea
            value={draft.talk_input}
            onChange={(e) => {
              setDraft((d) => ({ ...d, talk_input: e.target.value }));
              setDirty(true);
            }}
          />

          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={saveMine} disabled={!requiredOk}>
              Speichern
            </button>
            <button className="btn" onClick={addTalkItem} disabled={!canAddTalk}>
              Zu „To talk about“ hinzufügen
            </button>
            {!requiredOk && <span className="badge err">Pflichtfelder 1–4 müssen ausgefüllt sein.</span>}
            {dirty && <span className="badge">Ungespeichert</span>}
          </div>

          <hr className="sep" />

          <TalkList
            role={role}
            talk={state?.talk ?? []}
            onChanged={async () => loadState({ allowOverwriteMyDraft: false })}
          />
        </section>

        <section className="card">
          <h2>Einträge von {partnerLabel}</h2>

          <div className="section-title">Ich bin dankbar für</div>
          <label className="label">Feld 1</label>
          <div className="readonly">{otherEntry?.general_1 ?? ""}</div>

          <label className="label">Feld 2</label>
          <div className="readonly">{otherEntry?.general_2 ?? ""}</div>

          <div className="section-title">Betreffend {meLabel} bin ich dankbar für</div>
          <label className="label">Feld 3</label>
          <div className="readonly">{otherEntry?.partner_specific ?? ""}</div>

          <div className="section-title">Betreffend Kinder bin ich dankbar</div>
          <label className="label">Feld 4</label>
          <div className="readonly">{otherEntry?.children_gratitude ?? ""}</div>

          <div className="section-title">Darüber will ich noch reden</div>
          <p className="small">
            Diese Punkte stehen unten unter „To talk about“ – gemeinsam, abhakbar, ohne Interpretationsspielraum.
          </p>

          <p className="small" style={{ marginTop: 10 }}>
            Zuletzt aktualisiert:{" "}
            {meEntry?.updated_at ? new Date(meEntry.updated_at).toLocaleString("de-DE") : "—"}
          </p>
        </section>
      </div>
    </main>
  );
}
