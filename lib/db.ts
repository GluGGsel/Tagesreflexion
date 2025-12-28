import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { SCHEMA_SQL } from "./schema";
import type { Role } from "./types";
import { validateRequired4, normalizeText } from "./validators";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = process.env.DB_PATH ?? path.join(DATA_DIR, "tagesreflexion.sqlite");

let db: Database.Database | null = null;

function nowIso() {
  return new Date().toISOString();
}

function todayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getDb(): Database.Database {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);

  db.exec(SCHEMA_SQL);
  ensureOpenDayExists();
  ensureEntriesForOpenDay();

  return db;
}

function ensureOpenDayExists() {
  const d = getDb();
  const open = d.prepare("SELECT id FROM days WHERE status='open' ORDER BY id DESC LIMIT 1").get() as
    | { id: number }
    | undefined;

  if (!open) {
    const date = todayYYYYMMDD();
    d.prepare("INSERT INTO days(day_date, status, created_at) VALUES (?, 'open', ?)").run(date, nowIso());
  }
}

function ensureEntriesForOpenDay() {
  const d = getDb();
  const day = d.prepare("SELECT id FROM days WHERE status='open' ORDER BY id DESC LIMIT 1").get() as { id: number };

  for (const role of ["mann", "frau"] as Role[]) {
    d.prepare(
      `INSERT OR IGNORE INTO entries(day_id, role, general_1, general_2, partner_specific, children_gratitude, updated_at)
       VALUES (?, ?, '', '', '', '', NULL)`
    ).run(day.id, role);
  }
}

export function getState() {
  const d = getDb();
  const day = d.prepare("SELECT id, day_date as date, status FROM days WHERE status='open' ORDER BY id DESC LIMIT 1").get() as
    | { id: number; date: string; status: "open" | "closed" }
    | undefined;

  if (!day) {
    ensureOpenDayExists();
    ensureEntriesForOpenDay();
    return getState();
  }

  const entries = d
    .prepare(
      `SELECT role, general_1, general_2, partner_specific, children_gratitude, updated_at
       FROM entries WHERE day_id = ?`
    )
    .all(day.id) as Array<{
    role: Role;
    general_1: string;
    general_2: string;
    partner_specific: string;
    children_gratitude: string;
    updated_at: string | null;
  }>;

  const map: any = { mann: null, frau: null };
  for (const e of entries) map[e.role] = e;

  const talk = d
    .prepare(
      `SELECT id, text, created_by, origin_created_at
       FROM talk_items
       WHERE day_id = ? AND is_done = 0
       ORDER BY origin_created_at ASC, created_at ASC, id ASC`
    )
    .all(day.id) as Array<{ id: number; text: string; created_by: Role; origin_created_at: string }>;

  const can_next_day = validateRequired4({
    general_1: map.mann?.general_1 ?? "",
    general_2: map.mann?.general_2 ?? "",
    partner_specific: map.mann?.partner_specific ?? "",
    children_gratitude: map.mann?.children_gratitude ?? ""
  }) && validateRequired4({
    general_1: map.frau?.general_1 ?? "",
    general_2: map.frau?.general_2 ?? "",
    partner_specific: map.frau?.partner_specific ?? "",
    children_gratitude: map.frau?.children_gratitude ?? ""
  });

  return {
    day,
    entries: {
      mann: map.mann,
      frau: map.frau
    },
    talk,
    can_next_day
  };
}

export function updateEntry(role: Role, payload: any) {
  const d = getDb();
  const day = d.prepare("SELECT id FROM days WHERE status='open' ORDER BY id DESC LIMIT 1").get() as { id: number };

  const general_1 = normalizeText(payload.general_1 ?? "");
  const general_2 = normalizeText(payload.general_2 ?? "");
  const partner_specific = normalizeText(payload.partner_specific ?? "");
  const children_gratitude = normalizeText(payload.children_gratitude ?? "");

  d.prepare(
    `UPDATE entries
     SET general_1=?, general_2=?, partner_specific=?, children_gratitude=?, updated_at=?
     WHERE day_id=? AND role=?`
  ).run(general_1, general_2, partner_specific, children_gratitude, nowIso(), day.id, role);
}

export function addTalkItem(text: string, created_by: Role) {
  const d = getDb();
  const day = d.prepare("SELECT id FROM days WHERE status='open' ORDER BY id DESC LIMIT 1").get() as { id: number };

  const t = normalizeText(text);
  if (!t) return;

  const ts = nowIso();
  d.prepare(
    `INSERT INTO talk_items(day_id, text, created_by, created_at, origin_created_at, is_done)
     VALUES (?, ?, ?, ?, ?, 0)`
  ).run(day.id, t, created_by, ts, ts);
}

export function markTalkDone(id: number, done_by: Role) {
  const d = getDb();
  d.prepare(
    `UPDATE talk_items
     SET is_done=1, done_at=?, done_by=?
     WHERE id=?`
  ).run(nowIso(), done_by, id);
}

export function nextDay() {
  const d = getDb();
  // Transaction ensures "only one next day" even if clicked simultaneously.
  const tx = d.transaction(() => {
    const state = getState();
    if (!state.can_next_day) {
      throw new Error("Nächster Tag ist erst möglich, wenn beide Pflichtfelder (1–4) ausgefüllt haben.");
    }

    const oldDayId = state.day.id;

    // close current day
    d.prepare("UPDATE days SET status='closed', closed_at=? WHERE id=?").run(nowIso(), oldDayId);

    // create new day with today's date (or increment - we keep it simple and consistent)
    const newDate = todayYYYYMMDD();
    const info = d.prepare("INSERT INTO days(day_date, status, created_at) VALUES (?, 'open', ?)").run(newDate, nowIso());
    const newDayId = Number(info.lastInsertRowid);

    // create empty entries for both roles
    for (const role of ["mann", "frau"] as Role[]) {
      d.prepare(
        `INSERT INTO entries(day_id, role, general_1, general_2, partner_specific, children_gratitude, updated_at)
         VALUES (?, ?, '', '', '', '', NULL)`
      ).run(newDayId, role);
    }

    // carry over open talk items (is_done=0) from old day
    const openTalk = d.prepare(
      `SELECT text, created_by, origin_created_at
       FROM talk_items
       WHERE day_id=? AND is_done=0
       ORDER BY origin_created_at ASC, created_at ASC, id ASC`
    ).all(oldDayId) as Array<{ text: string; created_by: Role; origin_created_at: string }>;

    const ts = nowIso();
    for (const item of openTalk) {
      d.prepare(
        `INSERT INTO talk_items(day_id, text, created_by, created_at, origin_created_at, is_done)
         VALUES (?, ?, ?, ?, ?, 0)`
      ).run(newDayId, item.text, item.created_by, ts, item.origin_created_at);
    }

    return true;
  });

  tx();
}
