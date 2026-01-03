"use client";

import { useEffect, useMemo, useState } from "react";
import TalkList from "./TalkList";
import { formatGermanDate } from "@/lib/date";
import type { Role, StateResponse } from "@/lib/types";
import { normalizeText } from "@/lib/validators";

type Props = { role: Role };

type Draft = {
  general_1: string;
  general_2: string;
  partner_specific: string;
  children1_gratitude: string;
  children2_gratitude: string;
  talk_input: string;
};

const EMPTY: Draft = {
  general_1: "",
  general_2: "",
  partner_specific: "",
  children1_gratitude: "",
  children2_gratitude: "",
  talk_input: ""
};

type ThemeMode = "light" | "dark";
type ThemeSource = "system" | "manual";

function getSavedTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return null;
}

function applyThemeOverride(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
  window.localStorage.setItem("theme", mode);
}

function clearThemeOverride() {
  document.documentElement.removeAttribute("data-theme");
  window.localStorage.removeItem("theme");
}

function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setPageBackdropAndCards(role: Role) {
  const bg =
    role === "mann"
      ? "linear-gradient(135deg, rgba(59,130,246,0.55), rgba(37,99,235,0.40), rgba(2,132,199,0.30))"
      : "linear-gradient(135deg, rgba(236,72,153,0.55), rgba(244,114,182,0.38), rgba(168,85,247,0.28))";

  document.body.style.background = bg;
  document.documentElement.style.setProperty("--page-bg", bg);

  const blue = "rgba(59, 130, 246, 0.22)";
  const pink = "rgba(236, 72, 153, 0.20)";

  const me = role === "mann" ? blue : pink;
  const partner = role === "mann" ? pink : blue;

  document.documentElement.style.setProperty("--card-me-bg", me);
  document.documentElement.style.setProperty("--card-partner-bg", partner);
}

export default function ReflectionPage({ role }: Props) {
  const otherRole: Role = role === "mann" ? "frau" : "mann";

  const [state, setState] = useState<StateResponse | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [theme, setTheme] = useState<ThemeMode>("light");
  const [themeSource, setThemeSource] = useState<ThemeSource>("system");

  const partnerLabel = useMemo(() => (role === "mann" ? "Frau" : "Mann"), [role]);
  const meLabel = useMemo(() => (role === "mann" ? "Mann" : "Frau"), [role]);

  useEffect(() => setPageBackdropAndCards(role), [role]);

  useEffect(() => {
    const saved = getSavedTheme();
    if (saved) {
      setTheme(saved);
      setThemeSource("manual");
      applyThemeOverride(saved);
      return;
    }

    const sys = getSystemTheme();
    setTheme(sys);
    setThemeSource("system");

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const handler = () => setTheme(mq.matches ? "dark" : "light");
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  async function loadState(opts: { allowOverwriteMyDraft: boolean; date?: string | null }) {
    const q = opts.date ? `?date=${encodeURIComponent(opts.date)}` : "";
    const res = await fetch(`/api/state${q}`, { cache: "no-store" });
    if (!res.ok) throw new Error("state fetch failed");
    const data = (await res.json()) as StateResponse;

    setState(data);
    if (!selectedDate) setSelectedDate(data.day.date);

    if (opts.allowOverwriteMyDraft) {
      const me = data.entries[role];
      setDraft((prev) => ({
        ...prev,
        general_1: me?.general_1 ?? "",
        general_2: me?.general_2 ?? "",
        partner_specific: me?.partner_specific ?? "",
        children1_gratitude: me?.children1_gratitude ?? "",
        children2_gratitude: me?.children2_gratitude ?? ""
      }));
      setDirty(false);
    }
  }

  useEffect(() => {
    loadState({ allowOverwriteMyDraft: true, date: null }).catch(() =>
      setStatusMsg({ kind: "err", text: "Konnte Daten nicht laden." })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const todayDate = state?.today_date ?? null;
  const effectiveSelectedDate = selectedDate ?? state?.day?.date ?? null;
  const isToday = !!todayDate && !!effectiveSelectedDate && todayDate === effectiveSelectedDate;

  useEffect(() => {
    if (!isToday) return;
    const t = setInterval(() => {
      loadState({ allowOverwriteMyDraft: !dirty, date: effectiveSelectedDate }).catch(() =>
        setStatusMsg({ kind: "err", text: "Auto-Update fehlgeschlagen." })
      );
    }, 300_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, isToday, effectiveSelectedDate, role]);

  const dayDateLabel = state?.day?.date ? formatGermanDate(state.day.date) : "";

  const meEntry = state?.entries?.[role] ?? null;
  const otherEntry = state?.entries?.[otherRole] ?? null;

  const partnerHasAny =
    !!otherEntry?.general_1 ||
    !!otherEntry?.general_2 ||
    !!otherEntry?.partner_specific ||
    !!otherEntry?.children1_gratitude ||
    !!otherEntry?.children2_gratitude;

  const canAddTalk = normalizeText(draft.talk_input).length > 0;

  const requiredOk =
    normalizeText(draft.general_1).length > 0 &&
    normalizeText(draft.general_2).length > 0 &&
    normalizeText(draft.partner_specific).length > 0 &&
    normalizeText(draft.children1_gratitude).length > 0 &&
    normalizeText(draft.children2_gratitude).length > 0;

  async function saveMine() {
    setStatusMsg({ kind: "info", text: "Speichern…" });
    try {
      const payload = {
        general_1: draft.general_1,
        general_2: draft.general_2,
        partner_specific: draft.partner_specific,
        children1_gratitude: draft.children1_gratitude,
        children2_gratitude: draft.children2_gratitude
      };

      const res = await fetch(`/api/entries/${role}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setStatusMsg({ kind: "err", text: t || "Speichern fehlgeschlagen." });
        return;
      }

      setStatusMsg({ kind: "ok", text: "Gespeichert." });
      await loadState({ allowOverwriteMyDraft: true, date: effectiveSelectedDate });
    } catch {
      setStatusMsg({ kind: "err", text: "Speichern fehlgeschlagen (Netzwerk/Server)." });
    }
  }

  async function addTalkItem() {
    const text = normalizeText(draft.talk_input);
    if (!text) return;

    setStatusMsg({ kind: "info", text: "Punkt hinzufügen…" });
    try {
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
      await loadState({ allowOverwriteMyDraft: false, date: effectiveSelectedDate });
    } catch {
      setStatusMsg({ kind: "err", text: "Konnte Punkt nicht hinzufügen (Netzwerk/Server)." });
    }
  }

  function toggleThemeSwitch() {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeSource("manual");
    applyThemeOverride(next);
  }

  function resetToSystem() {
    clearThemeOverride();
    const sys = getSystemTheme();
    setTheme(sys);
    setThemeSource("system");
  }

  const switchChecked = theme === "dark";

  async function onPickDate(d: string) {
    setSelectedDate(d);
    await loadState({ allowOverwriteMyDraft: true, date: d });
  }

  async function goToday() {
    if (!todayDate) return;
    setSelectedDate(todayDate);
    await loadState({ allowOverwriteMyDraft: true, date: todayDate });
  }

  return (
    <div className="page">
      <main className="container">
        <div className="header">
          <div className="header-top">
            <div>
              <h1 className="title">Tagesreflexion</h1>
              <p className="date">{dayDateLabel}</p>
            </div>

            <div className="row">
              <div className="row" style={{ gap: 8 }}>
                <input
                  type="date"
                  value={effectiveSelectedDate ?? ""}
                  onChange={(e) => onPickDate(e.target.value)}
                  style={{
                    height: 34,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--input-bg)",
                    color: "var(--fg)",
                    padding: "0 10px"
                  }}
                  aria-label="Datum auswählen"
                />
                <button className="btn secondary" onClick={goToday} disabled={isToday} type="button">
                  Heute
                </button>
              </div>

              <div className="theme-switch" data-checked={switchChecked ? "true" : "false"}>
                <label className="track" title="Nachtmodus umschalten">
                  <input type="checkbox" checked={switchChecked} onChange={toggleThemeSwitch} aria-label="Nachtmodus" />
                  <span className="thumb" />
                </label>
                <span className="hint" title="Doppelklick: wieder System">
                  <span onDoubleClick={resetToSystem} style={{ cursor: "default" }}>
                    {themeSource === "system" ? "System" : "Manuell"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="footerbar">
            <span className={`badge ${statusMsg?.kind === "ok" ? "ok" : statusMsg?.kind === "err" ? "err" : ""}`}>
              {statusMsg?.text ?? ""}
            </span>

            {isToday && <span className="badge err">#1–#5 dankbar müssen ausgefüllt werden.</span>}
            {!isToday && <span className="badge">Vergangenheit: nur Ansicht (read-only).</span>}
          </div>
        </div>

        <div className="grid">
          <section className="card me">
            <h2>{meLabel}&apos;s Reflexion</h2>

            <div className="section-title">„Ich bin dankbar für...“</div>

            <label className="label">#1 dankbar</label>
            {isToday ? (
              <textarea
                value={draft.general_1}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, general_1: e.target.value }));
                  setDirty(true);
                }}
              />
            ) : (
              <div className="readonly">{meEntry?.general_1 ?? ""}</div>
            )}

            <label className="label">#2 dankbar</label>
            {isToday ? (
              <textarea
                value={draft.general_2}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, general_2: e.target.value }));
                  setDirty(true);
                }}
              />
            ) : (
              <div className="readonly">{meEntry?.general_2 ?? ""}</div>
            )}

            <div className="section-title">„Betreffend {partnerLabel} bin ich dankbar für...“</div>
            <label className="label">#3 dankbar</label>
            {isToday ? (
              <textarea
                value={draft.partner_specific}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, partner_specific: e.target.value }));
                  setDirty(true);
                }}
              />
            ) : (
              <div className="readonly">{meEntry?.partner_specific ?? ""}</div>
            )}

            <div className="section-title">„Betreffend Kind1 bin ich dankbar für...“</div>
            <label className="label">#4 dankbar</label>
            {isToday ? (
              <textarea
                value={draft.children1_gratitude}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, children1_gratitude: e.target.value }));
                  setDirty(true);
                }}
              />
            ) : (
              <div className="readonly">{meEntry?.children1_gratitude ?? ""}</div>
            )}

            <div className="section-title">„Betreffend Kind2 bin ich dankbar für...“</div>
            <label className="label">#5 dankbar</label>
            {isToday ? (
              <textarea
                value={draft.children2_gratitude}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, children2_gratitude: e.target.value }));
                  setDirty(true);
                }}
              />
            ) : (
              <div className="readonly">{meEntry?.children2_gratitude ?? ""}</div>
            )}

            {isToday && (
              <>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn" onClick={saveMine} disabled={!requiredOk} type="button">
                    Speichern
                  </button>
                  {!requiredOk && <span className="badge err">#1–#5 dankbar müssen ausgefüllt werden.</span>}
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
              </>
            )}
          </section>

          <section className="card partner">
            <h2>{partnerLabel}&apos;s Reflexion</h2>

            <div className="section-title">„Ich bin dankbar für...“</div>

            <label className="label">#1 dankbar</label>
            <div className="readonly">{otherEntry?.general_1 ?? ""}</div>

            <label className="label">#2 dankbar</label>
            <div className="readonly">{otherEntry?.general_2 ?? ""}</div>

            <div className="section-title">„Betreffend {meLabel} bin ich dankbar für...“</div>
            <label className="label">#3 dankbar</label>
            <div className="readonly">{otherEntry?.partner_specific ?? ""}</div>

            <div className="section-title">„Betreffend Kind1 bin ich dankbar für...“</div>
            <label className="label">#4 dankbar</label>
            <div className="readonly">{otherEntry?.children1_gratitude ?? ""}</div>

            <div className="section-title">„Betreffend Kind2 bin ich dankbar für...“</div>
            <label className="label">#5 dankbar</label>
            <div className="readonly">{otherEntry?.children2_gratitude ?? ""}</div>

            {partnerHasAny && isToday && (
              <>
                <div className="section-title">Darüber möchte ich mich noch austauschen:</div>
                <p className="small">Siehe unten in der „To talk about“-Kachel.</p>
              </>
            )}
          </section>
        </div>

        {isToday && (
          <section className="card" style={{ marginTop: 14 }}>
            <TalkList
              role={role}
              talk={state?.talk ?? []}
              onChanged={async () => loadState({ allowOverwriteMyDraft: false, date: effectiveSelectedDate })}
            />
          </section>
        )}
      </main>
    </div>
  );
}
