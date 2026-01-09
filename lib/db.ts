import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { SCHEMA_SQL } from "./schema";

export type Role = "mann" | "frau";

export type EntryPayload = {
  general_1: string;
  general_2: string;
  partner_specific: string;
  children1_gratitude: string;
  children2_gratitude: string;
};

export type EntryRow = EntryPayload & {
  id: number;
  day_id: number;
  role: Role;
  created_at: string;
  updated_at: string;
};

export type TalkItem = {
  id: number;
  text: string;
  created_by: Role;
  origin_created_at: string;
};

let _db: Database.Database | null = null;

function getDbPath() {
  // robust: immer im Projekt unter /data, unabhängig von cwd-Schwankungen
  const base = path.join("/opt/tagesreflexion", "data");
  const file = path.join(base, "tagesreflexion.sqlite");
  return { base, file };
}

function db(): Database.Database {
  if (_db) return _db;

  const { base, file } = getDbPath();
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });

  const d = new Database(file);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");

  // Basis-Schema (CREATE TABLE IF NOT EXISTS ...)
  d.exec(SCHEMA_SQL);

  // Minimale "Migrationen" für Felder, die in älteren DBs fehlen könnten.
  // Wir halten das bewusst defensiv, damit bestehende DBs nicht crashen.
  ensureColumns(d);

  _db = d;
  return d;
}

function tableInfo(d: Database.Database, table: string): { name: string }[] {
  return d.prepare(`PRAGMA table_info(${table});`).all() as any;
}

function hasColumn(d: Database.Database, table: string, col: string): boolean {
  return tableInfo(d, table).some((r) => String((r as any).name) === col);
}

function ensureColumns(d: Database.Database) {
  // talk_items: einige Installationen hatten "done" vs "is_done" Mischformen
  if (d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='talk_items';").get()) {
    if (!hasColumn(d, "talk_items", "is_done")) {
      d.exec("ALTER TABLE talk_items ADD COLUMN is_done INTEGER NOT NULL DEFAULT 0;");
    }
    if (!hasColumn(d, "talk_items", "done")) {
      d.exec("ALTER TABLE talk_items ADD COLUMN done INTEGER NOT NULL DEFAULT 0;");
    }
    if (!hasColumn(d, "talk_items", "origin_created_at")) {
      d.exec("ALTER TABLE talk_items ADD COLUMN origin_created_at TEXT;");
      // Best effort backfill
      d.exec("UPDATE talk_items SET origin_created_at = COALESCE(origin_created_at, created_at);");
      // Falls NOT NULL Constraint existiert, ist DB sowieso schon im neuen Schema.
    }
  }

  // entries: wenn Spalten fehlen, adden (sofern Tabelle existiert)
  if (d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='entries';").get()) {
    const cols = [
      ["general_1", "TEXT"],
      ["general_2", "TEXT"],
      ["partner_specific", "TEXT"],
      ["children1_gratitude", "TEXT"],
      ["children2_gratitude", "TEXT"],
      ["created_at", "TEXT"],
      ["updated_at", "TEXT"],
    ] as const;

    for (const [c, t] of cols) {
      if (!hasColumn(d, "entries", c)) {
        d.exec(`ALTER TABLE entries ADD COLUMN ${c} ${t};`);
      }
    }
  }
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function ensureDayId(dateISO: string): number {
  const d = db();
  d.prepare("INSERT OR IGNORE INTO days (date) VALUES (?);").run(dateISO);
  const row = d.prepare("SELECT id FROM days WHERE date = ?;").get(dateISO) as any;
  if (!row?.id) throw new Error(`Could not resolve day_id for date=${dateISO}`);
  return Number(row.id);
}

/* -----------------------------
   Entries
----------------------------- */

export function upsertEntryForToday(role: Role, payload: EntryPayload) {
  const dateISO = getTodayISO();
  return upsertEntryForDate(dateISO, role, payload);
}

export function upsertEntryForDate(dateISO: string, role: Role, payload: EntryPayload) {
  if (!isISODate(dateISO)) throw new Error("Invalid date");
  const d = db();
  const dayId = ensureDayId(dateISO);

  // Wir nehmen an: entries hat UNIQUE(day_id, role) (Schema). Falls nicht:
  // INSERT OR REPLACE funktioniert trotzdem, solange ein passender UNIQUE Index existiert.
  const sql = `
    INSERT INTO entries (
      day_id, role,
      general_1, general_2, partner_specific,
      children1_gratitude, children2_gratitude,
      created_at, updated_at
    )
    VALUES (
      ?, ?,
      ?, ?, ?,
      ?, ?,
      datetime('now'), datetime('now')
    )
    ON CONFLICT(day_id, role) DO UPDATE SET
      general_1=excluded.general_1,
      general_2=excluded.general_2,
      partner_specific=excluded.partner_specific,
      children1_gratitude=excluded.children1_gratitude,
      children2_gratitude=excluded.children2_gratitude,
      updated_at=datetime('now');
  `;
  d.prepare(sql).run(
    dayId,
    role,
    payload.general_1,
    payload.general_2,
    payload.partner_specific,
    payload.children1_gratitude,
    payload.children2_gratitude
  );
}

export function getEntriesByDate(dateISO: string): {
  day: string;
  entries: { mann: EntryPayload | null; frau: EntryPayload | null };
} {
  if (!isISODate(dateISO)) throw new Error("Invalid date");
  const d = db();

  const dayRow = d.prepare("SELECT id, date FROM days WHERE date = ?;").get(dateISO) as any;
  if (!dayRow?.id) {
    return { day: dateISO, entries: { mann: null, frau: null } };
  }

  const rows = d
    .prepare(
      `
      SELECT role, general_1, general_2, partner_specific, children1_gratitude, children2_gratitude
      FROM entries
      WHERE day_id = ?
      `
    )
    .all(Number(dayRow.id)) as any[];

  const result: { mann: EntryPayload | null; frau: EntryPayload | null } = { mann: null, frau: null };

  for (const r of rows) {
    const role = String(r.role) === "frau" ? "frau" : "mann";
    result[role] = {
      general_1: String(r.general_1 ?? ""),
      general_2: String(r.general_2 ?? ""),
      partner_specific: String(r.partner_specific ?? ""),
      children1_gratitude: String(r.children1_gratitude ?? ""),
      children2_gratitude: String(r.children2_gratitude ?? ""),
    };
  }

  return { day: dateISO, entries: result };
}

export function getTodayEntries(): {
  day: string;
  entries: { mann: EntryPayload | null; frau: EntryPayload | null };
} {
  return getEntriesByDate(getTodayISO());
}

/* -----------------------------
   Talk / To talk about
----------------------------- */

export function addTalk(createdBy: Role, text: string) {
  const role = String(createdBy ?? "").trim();
  const msg = String(text ?? "").trim();

  if (role !== "mann" && role !== "frau") throw new Error("addTalk: created_by missing or invalid");
  if (!msg) throw new Error("addTalk: text empty");

  const d = db();
  const dayId = ensureDayId(getTodayISO());

  const sql = `
    INSERT INTO talk_items (
      day_id, text, created_by, created_at, origin_created_at,
      is_done, done
    )
    VALUES (
      ?, ?, ?, datetime('now'), datetime('now'),
      0, 0
    );
  `;
  d.prepare(sql).run(dayId, msg, role);
}

export function listTalk(): TalkItem[] {
  const d = db();
  const rows = d
    .prepare(
      `
      SELECT id, text, created_by,
             COALESCE(origin_created_at, created_at) AS origin_created_at
      FROM talk_items
      WHERE COALESCE(is_done, done, 0) = 0
      ORDER BY datetime(COALESCE(origin_created_at, created_at)) ASC, id ASC;
      `
    )
    .all() as any[];

  return rows.map((r) => ({
    id: Number(r.id),
    text: String(r.text),
    created_by: String(r.created_by) === "frau" ? "frau" : "mann",
    origin_created_at: String(r.origin_created_at),
  }));
}

export function markTalkDone(id: number) {
  const d = db();
  d.prepare(
    `
    UPDATE talk_items
    SET is_done = 1,
        done = 1,
        done_at = datetime('now')
    WHERE id = ?;
    `
  ).run(id);
}

/**
 * Backwards-compatible aliases (older code expects these names)
 * Ja, Naming-Inkonsistenz ist nervig – aber weniger nervig als ein downes System.
 */
export const todayISO = getTodayISO;
export const listOpenTalk = listTalk;
