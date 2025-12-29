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

  // Theme init (saved override > system preference)
  useEffect(() => {
    const saved = getInitialTheme();
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
      return;
    }
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
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
      setDraft((prev) => ({
        ...prev,
        general_1: me?.general_1 ?? "",
        general_2: me?.general_2 ?? "",
        partner_specific: me?.partner_specific ?? "",
        children_gratitude: me?.children_gratitude ?? ""
      }));
      setDirty(false);
    }
  }

  useEffect(() => {
    loadState({ allowOverwriteMyDraft: true }).catch(() => {
      setStatusMsg({ kind: "err", text: "Konnte Daten nicht laden." });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Polling: 5 Minuten
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

  const partnerHasAny =
    !!otherEntry?.general_1 ||
    !!otherEntry?.general_2 ||
    !!otherEntry?.partner_specific ||
    !!otherEntry?.children_gratitude;

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
    setDirty(true);
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

  function toggleTheme() {
    const next: ThemeMode = (theme ?? "light") === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="page">
      <main className="container">
        <div className="header">
          <div className="header-top">
            <div>
              <h1 className="title">Tagesreflexion</h1>
              <p className="date">{dayDate}</p>
            </div>

            <div className="row">
              <button className="btn secondary" onClick={toggleTheme} type="button">
                {theme === "dark" ? "Hellmodus" : "Nachtmodus"}
              </button>

              <button className="btn" onClick={nextDay} disabled={!canNextDay} type="button">
                Nächster Tag
              </button>
            </div>
          </div>

          <div className="footerbar">
            <span className={`badge ${statusMsg?.kind === "ok" ? "ok" : statusMsg?.kind === "err" ? "err" : ""}`}>
              {statusMsg?.text ?? ""}
            </span>

            {!canNextDay && <span className="badge err">#1–#4 dankbar müssen ausgefüllt werden.</span>}
          </div>
        </div>

        {/* Zwei Spalten: ich / partner */}
        <div className="grid">
          <section className="card">
            <h2>{meLabel}&apos;s Reflexion</h2>

            <div className="section-title">„Ich bin dankbar für...“</div>

            <label className="label">#1 dankbar</label>
            <textarea
              value={draft.general_1}
              onChange={(e) => {
                setDraft((d) => ({ ...d, general_1: e.target.value }));
                setDirty(true);
              }}
            />

            <label className="label">#2 dankbar</label>
            <textarea
              value={draft.general_2}
              onChange={(e) => {
                setDraft((d) => ({ ...d, general_2: e.target.value }));
                setDirty(true);
              }}
            />

            <div className="section-title">„Betreffend {partnerLabel} bin ich dankbar für...“</div>
            <label className="label">#3 dankbar</label>
            <textarea
              value={draft.partner_specific}
              onChange={(e) => {
                setDraft((d) => ({ ...d, partner_specific: e.target.value }));
                setDirty(true);
              }}
            />

            <div className="section-title">„Betreffend Kinder bin ich dankbar für...“</div>
            <label className="label">#4 dankbar</label>
            <textarea
              value={draft.children_gratitude}
              onChange={(e) => {
                setDraft((d) => ({ ...d, children_gratitude: e.target.value }));
                setDirty(true);
              }}
            />

            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={saveMine} disabled={!requiredOk} type="button">
                Speichern
              </button>
              {!requiredOk && <span className="badge err">#1–#4 dankbar müssen ausgefüllt werden.</span>}
              {dirty && <span className="badge">Ungespeichert</span>}
            </div>

            <hr className="sep" />

            <div className="section-title">Darüber möchte ich mich noch austauschen:</div>
            <label className="label"># to talk about (optional)</label>
            <textarea
              value={draft.talk_input}
              onChange={(e) => {
                setDraft((d) => ({ ...d, talk_input: e.target.value }));
                setDirty(true);
              }}
            />

            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={addTalkItem} disabled={!canAddTalk} type="button">
                Zu „To talk about“ hinzufügen
              </button>
              {!canAddTalk && <span className="badge">Text eingeben, dann hinzufügen.</span>}
            </div>
          </section>

          <section className="card">
            <h2>{partnerLabel}&apos;s Reflexion</h2>

            <div className="section-title">„Ich bin dankbar für...“</div>

            <label className="label">#1 dankbar</label>
            <div className="readonly">{otherEntry?.general_1 ?? ""}</div>

            <label className="label">#2 dankbar</label>
            <div className="readonly">{otherEntry?.general_2 ?? ""}</div>

            <div className="section-title">„Betreffend {meLabel} bin ich dankbar für...“</div>
            <label className="label">#3 dankbar</label>
            <div className="readonly">{otherEntry?.partner_specific ?? ""}</div>

            <div className="section-title">„Betreffend Kinder bin ich dankbar für...“</div>
            <label className="label">#4 dankbar</label>
            <div className="readonly">{otherEntry?.children_gratitude ?? ""}</div>

            {partnerHasAny && (
              <>
                <div className="section-title">Darüber möchte ich mich noch austauschen:</div>
                <p className="small">Siehe unten in der „To talk about“-Kachel.</p>
              </>
            )}

            <p className="small" style={{ marginTop: 10 }}>
              Zuletzt aktualisiert:{" "}
              {meEntry?.updated_at ? new Date(meEntry.updated_at).toLocaleString("de-DE") : "—"}
            </p>
          </section>
        </div>

        {/* Eigene Kachel: To talk about */}
        <section className="card" style={{ marginTop: 14 }}>
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
