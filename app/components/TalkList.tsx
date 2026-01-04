"use client";

import { useState } from "react";
import type { Role, TalkItem } from "@/lib/types";
import { INSTANCE } from "@/config/instance.get";

type Props = {
  role: Role;
  talk: TalkItem[];
  onChanged: () => Promise<void>;
};

export default function TalkList({ talk, onChanged }: Props) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const labels = INSTANCE.labels;

  async function markDone(id: number) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/talk/${id}`, { method: "PATCH" });
      if (!res.ok) return;
      await onChanged();
    } finally {
      setBusyId(null);
    }
  }

  const creatorLabel = (r: Role) => (r === "mann" ? labels.mann : labels.frau);

  return (
    <div>
      <h2>To talk about</h2>

      {talk.length === 0 ? (
        <p className="small">Keine offenen Punkte.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {talk.map((t) => (
            <div
              key={t.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 12,
                background: "var(--input-bg)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ whiteSpace: "pre-wrap", flex: 1 }}>{t.text}</div>

                <button className="btn secondary" onClick={() => markDone(t.id)} disabled={busyId === t.id} type="button">
                  {busyId === t.id ? "…" : "Erledigt"}
                </button>
              </div>

              <div className="small" style={{ marginTop: 8 }}>
                von {creatorLabel(t.created_by)} · erstellt {t.created_at ? new Date(t.created_at).toLocaleString("de-DE") : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
