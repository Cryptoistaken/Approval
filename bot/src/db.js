import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";

const DATA_DIR = process.env.DATA_DIR || "./data";

// Ensure data directory exists
await mkdir(DATA_DIR, { recursive: true });

await Bun.write(`${DATA_DIR}/.keep`, "");

export const db = new Database(`${DATA_DIR}/approvals.db`);

db.exec(`
  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    env_name TEXT NOT NULL,
    path TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    token TEXT,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS apps (
    app_id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    phase_token TEXT NOT NULL
  );
`);

export const insertRequest = db.prepare(
  "INSERT INTO approvals (id, app_id, env_name, path, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)"
);

export const getRequest = db.prepare("SELECT * FROM approvals WHERE id = ?");

export const updateStatus = db.prepare(
  "UPDATE approvals SET status = ?, token = ?, resolved_at = ? WHERE id = ?"
);

export const registerApp = db.prepare(
  "INSERT OR REPLACE INTO apps (app_id, chat_id, phase_token) VALUES (?, ?, ?)"
);

export const getApp = db.prepare("SELECT * FROM apps WHERE app_id = ?");
