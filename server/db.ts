import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'betweenus.db');
export const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#8b5cf6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS couples (
      id TEXT PRIMARY KEY,
      partner_a_id TEXT NOT NULL REFERENCES users(id),
      partner_b_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(partner_a_id, partner_b_id)
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      inviter_id TEXT NOT NULL REFERENCES users(id),
      code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired, revoked
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS connection_requests (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL REFERENCES users(id),
      receiver_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, cancelled
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL REFERENCES couples(id),
      sender_id TEXT NOT NULL REFERENCES users(id),
      text TEXT NOT NULL,
      client_msg_id TEXT,
      read_by_recipient INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS interactions (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL REFERENCES couples(id),
      title TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      interaction_id TEXT NOT NULL REFERENCES interactions(id),
      couple_id TEXT NOT NULL REFERENCES couples(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      communication INTEGER NOT NULL CHECK (communication >= 1 AND communication <= 5),
      trust INTEGER NOT NULL CHECK (trust >= 1 AND trust <= 5),
      support INTEGER NOT NULL CHECK (support >= 1 AND support <= 5),
      conflict INTEGER NOT NULL CHECK (conflict >= 1 AND conflict <= 5),
      private_notes TEXT DEFAULT '',
      consent_revealed INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(interaction_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS communication_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      message_id TEXT,
      input_text TEXT NOT NULL,
      perspective TEXT NOT NULL, -- sender_review or recipient_insight
      summary TEXT NOT NULL,
      suggestion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS analytics_snapshots (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL REFERENCES couples(id),
      interaction_id TEXT NOT NULL REFERENCES interactions(id),
      pgs_score REAL NOT NULL,
      gap_communication REAL NOT NULL,
      gap_trust REAL NOT NULL,
      gap_support REAL NOT NULL,
      gap_conflict REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS saved_message_analyses (
      id TEXT PRIMARY KEY,
      couple_id TEXT NOT NULL REFERENCES couples(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      message_id TEXT,
      message_text TEXT NOT NULL,
      top_emotion TEXT NOT NULL,
      confidence REAL NOT NULL,
      probabilities_json TEXT,
      observation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_couple ON messages(couple_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_interactions_couple ON interactions(couple_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_assessments_interaction ON assessments(interaction_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
    CREATE INDEX IF NOT EXISTS idx_conn_requests_receiver ON connection_requests(receiver_id, status);
    CREATE INDEX IF NOT EXISTS idx_conn_requests_sender ON connection_requests(sender_id, status);
    CREATE INDEX IF NOT EXISTS idx_saved_analyses_couple ON saved_message_analyses(couple_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_snapshots_interaction ON analytics_snapshots(interaction_id);
  `);
}

initDatabase();
