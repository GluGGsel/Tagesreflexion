import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "tagesreflexion.sqlite");

let db: Database.Database | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initSchema(d: Database.Database) {
  d.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('mann','frau')),
      general_1 TEXT NOT NULL,
      general_2 TEXT NOT NULL,
      partner_specific TEXT NOT NULL,
      children_gratitude TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(day_id, role),
      FOREIGN KEY(day_id) REFERENCES days(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS talk_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_by TEXT NOT NULL CHECK(created_by IN ('mann','frau')),
      created_at TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export function getDb() {
  if (db) return db;
  ensureDir();
  db = new Database(DB_PATH);
  initSchema(db);
  return db;
}

/**
 * Return today's date (YYYY-MM-DD) based on SERVER time.
 * Uses Europe/Zurich to be deterministic (host should already be set, but iOS users love surprises).
 */
export function todayISO(): string {
  const tz = "Europe/Zurich";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return fmt.format(new Date()); // en-CA => YYYY-MM-DD
}

/** Ensure a days-row exists for today's date and return its id. */
export function ensureTodayDayId(): number {
  const d = getDb();
  const date = todayISO();

  const row = d.prepare(`SELECT id FROM days WHERE date = ?`).get(date) as { id: number } | undefined;
  if (row?.id) return row.id;

  const info = d.prepare(`INSERT INTO days(date) VALUES(?)`).run(date);
  return Number(info.lastInsertRowid);
}

/** Get entries for today keyed by role. */
export function getTodayEntries(): {
  day: { id: number; date: string };
  entries: { mann: any | null; frau: any | null };
} {
  const d = getDb();
  const dayId = ensureTodayDayId();
  const date = todayISO();

  const rows = d
    .prepare(
      `SELECT role, general_1, general_2, partner_specific, children_gratitude, updated_at
       FROM entries
       WHERE day_id = ?`
    )
    .all(dayId) as Array<{
    role: "mann" | "frau";
    general_1: string;
    general_2: string;
    partner_specific: string;
    children_gratitude: string;
    updated_at: string;
  }>;

  const out: { mann: any | null; frau: any | null } = { mann: null, frau: null };
  for (const r of rows) out[r.role] = r;

  return { day: { id: dayId, date }, entries: out };
}

export function upsertEntryForToday(role: "mann" | "frau", payload: {
  general_1: string;
  general_2: string;
  partner_specific: string;
  children_gratitude: string;
}) {
  const d = getDb();
  const dayId = ensureTodayDayId();
  const now = new Date().toISOString();

  d.prepare(
    `INSERT INTO entries(day_id, role, general_1, general_2, partner_specific, children_gratitude, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(day_id, role) DO UPDATE SET
       general_1 = excluded.general_1,
       general_2 = excluded.general_2,
       partner_specific = excluded.partner_specific,
       children_gratitude = excluded.children_gratitude,
       updated_at = excluded.updated_at`
  ).run(
    dayId,
    role,
    payload.general_1,
    payload.general_2,
    payload.partner_specific,
    payload.children_gratitude,
    now
  );
}

export function listOpenTalk() {
  const d = getDb();
  return d.prepare(
    `SELECT id, text, created_by, created_at
     FROM talk_items
     WHERE done = 0
     ORDER BY datetime(created_at) ASC`
  ).all() as Array<{ id: number; text: string; created_by: "mann" | "frau"; created_at: string }>;
}

export function addTalk(created_by: "mann" | "frau", text: string) {
  const d = getDb();
  d.prepare(
    `INSERT INTO talk_items(text, created_by, created_at, done)
     VALUES (?, ?, ?, 0)`
  ).run(text, created_by, new Date().toISOString());
}

export function markTalkDone(id: number) {
  const d = getDb();
  d.prepare(`UPDATE talk_items SET done = 1 WHERE id = ?`).run(id);
}
