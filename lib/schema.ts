export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_date TEXT NOT NULL,              -- YYYY-MM-DD
  status TEXT NOT NULL CHECK(status IN ('open','closed')),
  created_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('mann','frau')),
  general_1 TEXT NOT NULL DEFAULT '',
  general_2 TEXT NOT NULL DEFAULT '',
  partner_specific TEXT NOT NULL DEFAULT '',
  children_gratitude TEXT NOT NULL DEFAULT '',
  updated_at TEXT,
  UNIQUE(day_id, role),
  FOREIGN KEY(day_id) REFERENCES days(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS talk_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_by TEXT NOT NULL CHECK(created_by IN ('mann','frau')),
  created_at TEXT NOT NULL,
  origin_created_at TEXT NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  done_by TEXT CHECK(done_by IN ('mann','frau')),
  FOREIGN KEY(day_id) REFERENCES days(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_talk_day_done_origin
  ON talk_items(day_id, is_done, origin_created_at, created_at);
`;
