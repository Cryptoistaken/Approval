import { Database } from "bun:sqlite";

const DATA_DIR = process.env.DATA_DIR || "./data";

// Ensure data directory exists
await Bun.write(`${DATA_DIR}/.keep`, "");

export const db = new Database(`${DATA_DIR}/approvals.db`);

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    resource TEXT NOT NULL,
    requester TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    token TEXT,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
  )
`);

// Auto-migration: Add environment column if missing
try {
    db.exec("ALTER TABLE approvals ADD COLUMN environment TEXT");
} catch (e) {
    // Column likely already exists
}

// Prepared Statements
export const insertRequest = db.prepare(
    "INSERT INTO approvals (id, resource, requester, environment, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)"
);

export const getRequest = db.prepare("SELECT * FROM approvals WHERE id = ?");

export const updateStatus = db.prepare(
    "UPDATE approvals SET status = ?, token = ?, resolved_at = ? WHERE id = ?"
);

export type ApprovalRequest = {
    id: string;
    resource: string;
    requester: string;
    environment?: string;
    status: string;
    token?: string;
    created_at: number;
    resolved_at?: number;
};
