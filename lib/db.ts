import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "tagesreflexion.sqlite");

let db: Database.Database | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function tableExists(d: Database.Database, name: string): boolean {
  const row = d
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name) as { name?: string } | undefined;
  return !!row?.name;
}

function tableColumns(d: Database.Database, table: string): Array<{ name: string; type: string }> {
  const rows = d.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
    type: string;
  }>;
  return rows.map((r) => ({ name: r.name, type: r.type || "" }));
}

/**
 * Migrates legacy schema variants so current code can rely on:
 * days(id INTEGER PK, date TEXT NOT NULL UNIQUE)
 */
function migrateDaysTable(d: Database.Database) {
  if (!tableExists(d, "days")) {
    d.exec(`
      CREATE TABLE IF NOT EXISTS days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE
      );
    `);
    return;
  }

  const cols = tableColumns(d, "days");
  const hasDate = cols.some((c) => c.name === "date");
  if (hasDate) return;

  // Find best candidate source column to become "date"
  const candidate =
    cols.find((c) => c.name !== "id" && c.type.toUpperCase().includes("TEXT"))?.name ||
    cols.find((c) => c.name !== "id")?.name ||
    null;

  d.exec("BEGIN IMMEDIATE;");

  // Create new table with correct schema
  d.exec(`
    CREATE TABLE IF NOT EXISTS days_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE
    );
  `);

  if (candidate) {
    // Copy with best-effort normalization: trim, and if empty, create legacy unique token
    d.exec(`
      INSERT INTO days_new(date)
      SELECT
        CASE
          WHEN TRIM(CAST(${candidate} AS TEXT)) <> '' THEN TRIM(CAST(${candidate} AS TEXT))
          ELSE 'legacy-' || id
        END
      FROM days;
    `);
  } else {
    // No usable columns; generate unique placeholders
    d.exec(`
      INSERT INTO days_new(date)
      SELECT 'legacy-' || id FROM days;
    `);
  }

  // Replace old table
  d.exec(`DROP TABLE days;`);
  d.exec(`ALTER TABLE days_new RENAME TO days;`);

  d.exec("COMMIT;");
}

function initSchema(d: Database.Database) {
  // WAL is fine, and harmless if already set
  d.exec(`PRAGMA journal_mode = WAL;`);

  // Migrate/ensure days table has the right column
  migrateDaysTable(d);

  // Ensure the rest exists (no destructive migrations here)
  d.exec(`
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
 * Today's date (YYYY-MM-DD) based on SERVER LOCAL TIME.
 * This matches the requirement: "serverzeit vom host".
 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isISODate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const dt = new Date(d + "T00:00:00Z");
  if (Number.isNaN(dt.getTime())) return false;
  const [y, m, day] = d.split("-").map(Number);
  const check = new Date(Date.UTC(y, m - 1, day));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === day;
}

export function ensureTodayDayId(): number {
  const d = getDb();
  const date = todayISO();

  const row = d.prepare(`SELECT id FROM days WHERE date = ?`).get(date) as { id: number } | undefined;
  if (row?.id) return row.id;

  const info = d.prepare(`INSERT INTO days(date) VALUES(?)`).run(date);
  return Number(info.lastInsertRowid);
}

export function getEntriesByDate(date: string): {
  day: { id: number | null; date: string };
  entries: { mann: any | null; frau: any | null };
} {
  const d = getDb();

  const dayRow = d.prepare(`SELECT id FROM days WHERE date = ?`).get(date) as { id: number } | undefined;
  if (!dayRow?.id) {
    return { day: { id: null, date }, entries: { mann: null, frau: null } };
  }

  const rows = d
    .prepare(
      `SELECT role, general_1, general_2, partner_specific, children_gratitude, updated_at
       FROM entries
       WHERE day_id = ?`
    )
    .all(dayRow.id) as Array<{
    role: "mann" | "frau";
    general_1: string;
    general_2: string;
    partner_specific: string;
    children_gratitude: string;
    updated_at: string;
  }>;

  const out: { mann: any | null; frau: any | null } = { mann: null, frau: null };
  for (const r of rows) out[r.role] = r;

  return { day: { id: dayRow.id, date }, entries: out };
}

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

export function upsertEntryForToday(
  role: "mann" | "frau",
  payload: { general_1: string; general_2: string; partner_specific: string; children_gratitude: string }
) {
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
  ).run(dayId, role, payload.general_1, payload.general_2, payload.partner_specific, payload.children_gratitude, now);
}

export function listOpenTalk() {
  const d = getDb();
  return d
    .prepare(
      `SELECT id, text, created_by, created_at
       FROM talk_items
       WHERE done = 0
       ORDER BY datetime(created_at) ASC`
    )
    .all() as Array<{ id: number; text: string; created_by: "mann" | "frau"; created_at: string }>;
}

export function addTalk(created_by: "mann" | "frau", text: string) {
  const d = getDb();
  d.prepare(`INSERT INTO talk_items(text, created_by, created_at, done) VALUES (?, ?, ?, 0)`).run(
    text,
    created_by,
    new Date().toISOString()
  );
}

export function markTalkDone(id: number) {
  const d = getDb();
  d.prepare(`UPDATE talk_items SET done = 1 WHERE id = ?`).run(id);
}
