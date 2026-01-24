/**
 * Database Module
 * 
 * Uses SQLite for persistent storage of:
 * - Approval requests (pending, approved, denied)
 * - Registered apps (for multi-tenant mode)
 * 
 * Data is stored in DATA_DIR (default: ./data)
 */

import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATA_DIR = process.env.DATA_DIR || "./data";

// ============================================================================
// INITIALIZATION
// ============================================================================

// Ensure data directory exists (important for Railway/Docker deployments)
await mkdir(DATA_DIR, { recursive: true });

// Create placeholder file to ensure directory is tracked
await Bun.write(`${DATA_DIR}/.keep`, "");

// Initialize SQLite database
export const db = new Database(`${DATA_DIR}/approvals.db`);

// ============================================================================
// SCHEMA
// ============================================================================

db.exec(`
  -- Approval requests table
  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,           -- Request ID (e.g., req_abc12345)
    app_id TEXT NOT NULL,          -- Phase App ID
    env_name TEXT NOT NULL,        -- Environment name (e.g., development, production)
    path TEXT,                     -- Optional path filter
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, denied
    token TEXT,                    -- Phase token (set on approval)
    created_at INTEGER NOT NULL,   -- Unix timestamp
    resolved_at INTEGER            -- Unix timestamp when approved/denied
  );

  -- Registered apps table (for multi-tenant mode)
  CREATE TABLE IF NOT EXISTS apps (
    app_id TEXT PRIMARY KEY,       -- Phase App ID
    chat_id TEXT NOT NULL,         -- Telegram chat ID
    phase_token TEXT NOT NULL      -- User's Phase service token
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
  CREATE INDEX IF NOT EXISTS idx_apps_chat_id ON apps(chat_id);
`);

// ============================================================================
// PREPARED STATEMENTS
// ============================================================================

// Approval requests
export const insertRequest = db.prepare(`
  INSERT INTO approvals (id, app_id, env_name, path, status, created_at)
  VALUES (?, ?, ?, ?, 'pending', ?)
`);

export const getRequest = db.prepare(`
  SELECT * FROM approvals WHERE id = ?
`);

export const updateStatus = db.prepare(`
  UPDATE approvals 
  SET status = ?, token = ?, resolved_at = ?
  WHERE id = ?
`);

// App registration
export const registerApp = db.prepare(`
  INSERT OR REPLACE INTO apps (app_id, chat_id, phase_token)
  VALUES (?, ?, ?)
`);

export const getApp = db.prepare(`
  SELECT * FROM apps WHERE app_id = ?
`);
