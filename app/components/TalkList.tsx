"use client";


import { INSTANCE } from "@/config/instance.get";
import React from "react";

export type TalkItem = {
  id: number;
  text: string;
  created_by: "mann" | "frau";
  origin_created_at?: string;
  created_at?: string;
};

type Props = {
  /** Backward compatible: some callers pass talk=..., others items=... */
  talk?: TalkItem[];
  items?: TalkItem[];
  /** When true, hide the list entirely if it is empty */
  hideIfEmpty?: boolean;
  /** Called when user clicks "Abhaken" */
  onDone?: (id: number) => Promise<void> | void;
  /** Optional per-role label mapping */
  labels?: { mann: string; frau: string };
};

function fmtDE(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString("de-DE");
}

export default function TalkList(props: Props) {
  const list = (props.items ?? props.talk ?? []) as TalkItem[];
  const labels = props.labels ?? { mann: "Mann", frau: "Frau" };

  if (props.hideIfEmpty && list.length === 0) return null;

  return (
    <div className="card">
      <h2>To talk about</h2>

      {list.length === 0 ? (
        <div className="small">Keine offenen Punkte.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((t) => {
            const who = t.created_by === "frau" ? labels.frau : labels.mann;
            const when = fmtDE(t.origin_created_at ?? t.created_at);

            return (
              <div
                key={t.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 10,
                  background: "var(--pill)",
                }}
              >
                <div style={{ whiteSpace: "pre-wrap", fontWeight: 700 }}>
                  {t.text}
                </div>

                <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
                  <div className="small">
                    von {who}
                    {when ? ` · erstellt ${when}` : ""}
                  </div>

                  {props.onDone && (
                    <button className="btn" onClick={() => props.onDone?.(t.id)}>
                      Abhaken
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
