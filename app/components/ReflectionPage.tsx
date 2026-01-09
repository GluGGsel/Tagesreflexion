"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import TalkList, { TalkItem } from "@/app/components/TalkList";
import { INSTANCE } from "@/config/instance.get";

type Role = "mann" | "frau";

type Entries = {
  mann: null | {
    general_1: string;
    general_2: string;
    partner_specific: string;
    children1_gratitude: string;
    children2_gratitude: string;
  };
  frau: null | {
    general_1: string;
    general_2: string;
    partner_specific: string;
    children1_gratitude: string;
    children2_gratitude: string;
  };
};

type StateResponse = {
  day: string;
  today_date: string;
  entries: Entries;
  talk: TalkItem[];
  can_next_day: boolean;
};

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeDateInput(s: string): string {
  const v = (s ?? "").trim();
  if (!v) return "";
  if (isISODate(v)) return v;

  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(v);
  if (m) {
    const dd = m[1];
    const mm = m[2];
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  return v;
}

function formatDEDateLabel(iso: string) {
  if (!isISODate(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function roleLabel(role: Role) {
  return role === "frau" ? INSTANCE.labels.frau : INSTANCE.labels.mann;
}

function partnerRole(role: Role): Role {
  return role === "frau" ? "mann" : "frau";
}

function colorsFor(role: Role) {
  if (role === "mann") {
    return {
      pageBgA: "rgba(59, 130, 246, 0.16)",
      pageBgB: "rgba(59, 130, 246, 0.10)",
      meCard: "rgba(59, 130, 246, 0.20)",
      partnerCard: "rgba(236, 72, 153, 0.18)",
    };
  }
  return {
    pageBgA: "rgba(236, 72, 153, 0.16)",
    pageBgB: "rgba(236, 72, 153, 0.10)",
    meCard: "rgba(236, 72, 153, 0.20)",
    partnerCard: "rgba(59, 130, 246, 0.18)",
  };
}

export default function ReflectionPage({ role }: { role: Role }) {
  const partner = partnerRole(role);

  const [state, setState] = useState<StateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string>("");

  const [f1, setF1] = useState("");
  const [f2, setF2] = useState("");
  const [f3, setF3] = useState("");
  const [k1, setK1] = useState("");
  const [k2, setK2] = useState("");

  const [talkText, setTalkText] = useState("");
  const [msg, setMsg] = useState<string>("");

  const dirtyRef = useRef(false);
  const markDirty = () => (dirtyRef.current = true);

  const colors = useMemo(() => colorsFor(role), [role]);

  const effectiveDate = useMemo(() => {
    const n = normalizeDateInput(selectedDate);
    return isISODate(n) ? n : "";
  }, [selectedDate]);

  const todayISO = state?.today_date ?? "";

  const isToday = useMemo(() => {
    if (!todayISO) return true;
    if (!effectiveDate) return true;
    return effectiveDate === todayISO;
  }, [effectiveDate, todayISO]);

  const isPastReadOnly = useMemo(() => {
    if (!todayISO) return false;
    if (!effectiveDate) return false;
    return effectiveDate < todayISO;
  }, [effectiveDate, todayISO]);

  const headerDateLabel = useMemo(() => {
    const show = effectiveDate || todayISO || "";
    return show ? formatDEDateLabel(show) : "";
  }, [effectiveDate, todayISO]);

  async function load(targetDate?: string) {
    setLoading(true);
    setMsg("");
    try {
      const date = targetDate ? normalizeDateInput(targetDate) : "";
      const qs = date && isISODate(date) ? `?date=${encodeURIComponent(date)}` : "";
      const res = await fetch(`/api/state${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`state failed: ${res.status}`);
      const data = (await res.json()) as StateResponse;

      setState(data);

      if (data.day && isISODate(data.day)) setSelectedDate(data.day);

      if (!dirtyRef.current) {
        const mine = data.entries[role];
        setF1(mine?.general_1 ?? "");
        setF2(mine?.general_2 ?? "");
        setF3(mine?.partner_specific ?? "");
        setK1(mine?.children1_gratitude ?? "");
        setK2(mine?.children2_gratitude ?? "");
      }
    } catch {
      setMsg("Konnte Daten nicht laden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
    const t = setInterval(() => {
      if (!dirtyRef.current) load(effectiveDate || undefined).catch(() => {});
    }, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state) return;
    const d = effectiveDate || state.today_date;
    load(d).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDate]);

  async function saveEntries() {
    setMsg("");
    if (!isToday || isPastReadOnly) return;

    if (!f1.trim() || !f2.trim() || !f3.trim() || !k1.trim() || !k2.trim()) {
      setMsg("#1–#5 dankbar müssen ausgefüllt werden.");
      return;
    }

    try {
      const res = await fetch(`/api/entries/${role}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          general_1: f1.trim(),
          general_2: f2.trim(),
          partner_specific: f3.trim(),
          children1_gratitude: k1.trim(),
          children2_gratitude: k2.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => ""));
      dirtyRef.current = false;
      setMsg("Gespeichert.");
      await load(effectiveDate || undefined);
    } catch {
      setMsg("Konnte nicht speichern.");
    }
  }

  async function addTalk() {
    setMsg("");
    if (!isToday || isPastReadOnly) return;
    const t = talkText.trim();
    if (!t) return;

    try {
      const res = await fetch(`/api/talk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, created_by: role }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => ""));
      setTalkText("");
      dirtyRef.current = false;
      await load(effectiveDate || undefined);
    } catch {
      setMsg("Konnte Punkt nicht hinzufügen.");
    }
  }

  async function doneTalk(id: number) {
    setMsg("");
    try {
      const res = await fetch(`/api/talk/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error("done failed");
      await load(effectiveDate || undefined);
    } catch {
      setMsg("Konnte Punkt nicht abhaken.");
    }
  }

  const mineTitle = `${roleLabel(role)}'s Reflexion`;
  const partnerTitle = `${roleLabel(partner)}'s Reflexion`;

  return (
    <div
      className="page"
      style={{
        background:
          `radial-gradient(1000px 700px at 10% 0%, ${colors.pageBgA}, transparent 60%),` +
          `radial-gradient(900px 600px at 90% 10%, ${colors.pageBgB}, transparent 60%),` +
          `linear-gradient(180deg, rgba(255,255,255,0.05), transparent 35%)`,
      }}
    >
      <div
        className="container"
        style={{
          // @ts-ignore
          ["--card-me-bg"]: colors.meCard,
          // @ts-ignore
          ["--card-partner-bg"]: colors.partnerCard,
        }}
      >
        <header className="header">
          <div className="header-top">
            <div>
              <h1 className="title">Tagesreflexion</h1>
              <p className="date">
                {headerDateLabel ? `Datum: ${headerDateLabel}` : ""}
                {isPastReadOnly ? " · Vergangenheit: nur Ansicht (read-only)" : ""}
              </p>
            </div>

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <label className="row" style={{ gap: 8 }}>
                <span className="small">Datum</span>
                <input
                  type="date"
                  value={effectiveDate || todayISO || ""}
                  onChange={(e) => {
                    const v = normalizeDateInput(e.target.value);
                    setSelectedDate(v);
                    dirtyRef.current = false;
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--input-bg)",
                    color: "var(--fg)",
                  }}
                />
              </label>

              <button
                className="btn"
                onClick={() => {
                  if (todayISO) setSelectedDate(todayISO);
                  dirtyRef.current = false;
                }}
                disabled={!todayISO}
              >
                Heute
              </button>
            </div>
          </div>

          <div className="footerbar">
            <div className="row">
              {loading ? <span className="badge">Lade…</span> : <span className="badge ok">Bereit</span>}
              {state?.day && <span className="badge">Tag: {formatDEDateLabel(state.day)}</span>}
            </div>
            {msg ? (
              <span className={`badge ${msg.includes("nicht") || msg.includes("Konnte") ? "err" : "ok"}`}>{msg}</span>
            ) : (
              <span />
            )}
          </div>
        </header>

        {/* TOP ROW: 2 Kacheln */}
        <div className="grid">
          {/* links: eigene Einträge */}
          <section className="card me">
            <h2>{mineTitle}</h2>

            <label className="label">Ich bin dankbar für...</label>
            {isPastReadOnly ? <div className="readonly">{f1}</div> : <textarea value={f1} onChange={(e) => { setF1(e.target.value); markDirty(); }} />}

            <label className="label">Ich bin dankbar für...</label>
            {isPastReadOnly ? <div className="readonly">{f2}</div> : <textarea value={f2} onChange={(e) => { setF2(e.target.value); markDirty(); }} />}

            <label className="label">Betreffend {role === "mann" ? INSTANCE.labels.frau : INSTANCE.labels.mann} bin ich dankbar für...</label>
            {isPastReadOnly ? <div className="readonly">{f3}</div> : <textarea value={f3} onChange={(e) => { setF3(e.target.value); markDirty(); }} />}

            <label className="label">Betreffend {INSTANCE.labels.kind1} bin ich dankbar für...</label>
            {isPastReadOnly ? (
              <div className="readonly">{k1}</div>
            ) : (
              <textarea
                value={k1}
                onChange={(e) => {
                  setK1(e.target.value);
                  markDirty();
                }}
               
              />
            )}

            <label className="label">Betreffend {INSTANCE.labels.kind2} bin ich dankbar für...</label>
            {isPastReadOnly ? (
              <div className="readonly">{k2}</div>
            ) : (
              <textarea
                value={k2}
                onChange={(e) => {
                  setK2(e.target.value);
                  markDirty();
                }}
               
              />
            )}

            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={saveEntries} disabled={isPastReadOnly || !isToday}>
                Speichern
              </button>
              {!isToday && <span className="small">Speichern nur für “heute”.</span>}
            </div>
          </section>

          {/* rechts: Partner-Einträge */}
          <section className="card partner">
            <h2>{partnerTitle}</h2>

            {state?.entries?.[partner] ? (
              <>
                <label className="label">Ich bin dankbar für...</label>
                <div className="readonly">{state.entries[partner]!.general_1}</div>

                <label className="label">Ich bin dankbar für...</label>
                <div className="readonly">{state.entries[partner]!.general_2}</div>

                <label className="label">Betreffend {role === "mann" ? INSTANCE.labels.frau : INSTANCE.labels.mann} bin ich dankbar für...</label>
                <div className="readonly">{state.entries[partner]!.partner_specific}</div>

                <label className="label">{INSTANCE.labels.kind1}: dankbar</label>
                <div className="readonly">{state.entries[partner]!.children1_gratitude}</div>

                <label className="label">{INSTANCE.labels.kind2}: dankbar</label>
                <div className="readonly">{state.entries[partner]!.children2_gratitude}</div>
              </>
            ) : (
              <div className="small">Noch keine Einträge vorhanden.</div>
            )}
          </section>
        </div>

        {/* BOTTOM ROW: volle Breite */}
        <section className="card" style={{ marginTop: 14 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>To talk about</h2>
            <span className="badge">{(state?.talk?.length ?? 0)} offen</span>
          </div>

          <div style={{ marginTop: 10 }}>
            <div className="section-title">Darüber möchte ich noch austauschen:</div>
            <div className="label"># to talk about (optional)</div>

            {isPastReadOnly ? (
              <div className="readonly small">In der Vergangenheit können keine neuen Punkte hinzugefügt werden.</div>
            ) : (
              <>
                <textarea
                  value={talkText}
                  onChange={(e) => {
                    setTalkText(e.target.value);
                    markDirty();
                  }}
                 
                />
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn" onClick={addTalk} disabled={!isToday}>
                    Zu talk about hinzufügen
                  </button>
                </div>
              </>
            )}
          </div>

          <hr className="sep" />

          <TalkList
            items={state?.talk ?? []}
            onDone={isPastReadOnly ? undefined : doneTalk}
            hideIfEmpty={false}
            labels={{ mann: INSTANCE.labels.mann, frau: INSTANCE.labels.frau }}
          />
        </section>
      </div>
    </div>
  );
}
