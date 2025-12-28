"use client";

import type { Role, TalkItem } from "@/lib/types";

export default function TalkList({
  role,
  talk,
  onChanged
}: {
  role: Role;
  talk: TalkItem[];
  onChanged: () => Promise<void>;
}) {
  async function markDone(id: number) {
    const res = await fetch(`/api/talk/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_done: true, done_by: role })
    });
    if (res.ok) {
      await onChanged();
    }
  }

  return (
    <div className="talk">
      <h3>To talk about</h3>

      {talk.length === 0 ? (
        <div className="small">Keine offenen Punkte. Selten, aber erfreulich.</div>
      ) : (
        talk.map((t) => (
          <div key={t.id} className="talk-item">
            <input
              type="checkbox"
              aria-label="Erledigt"
              onChange={() => markDone(t.id)}
            />
            <div style={{ flex: 1 }}>
              <div style={{ whiteSpace: "pre-wrap" }}>{t.text}</div>
              <div className="meta">
                von {t.created_by === "mann" ? "Mann" : "Frau"} · erstellt{" "}
                {new Date(t.origin_created_at).toLocaleString("de-DE")}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
