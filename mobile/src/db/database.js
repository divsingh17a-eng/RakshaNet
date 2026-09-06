import * as SQLite from 'expo-sqlite';

// Local offline queue (FR-06). Every report/survey/SOS trigger created
// while offline (or that simply hasn't been confirmed by the server yet)
// gets a row here immediately, before any network attempt, so it survives
// an app restart and can be retried with backoff on reconnect.
const DB_NAME = 'rakshanet.db';

let dbPromise = null;

async function migrate(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS queue_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_uuid TEXT UNIQUE NOT NULL,
      kind TEXT NOT NULL DEFAULT 'hazard',
      type TEXT NOT NULL,
      severity INTEGER NOT NULL,
      description TEXT,
      lng REAL NOT NULL,
      lat REAL NOT NULL,
      habitation_id TEXT,
      reported_at TEXT,
      photos_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      server_id TEXT,
      last_error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queue_surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_uuid TEXT UNIQUE NOT NULL,
      habitation_id TEXT NOT NULL,
      habitation_name TEXT,
      answers_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      lng REAL,
      lat REAL,
      surveyed_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      server_id TEXT,
      last_error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL,
      report_type TEXT,
      decision TEXT NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queue_sos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_uuid TEXT UNIQUE NOT NULL,
      lng REAL NOT NULL,
      lat REAL NOT NULL,
      accuracy_meters REAL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      server_id TEXT,
      last_error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}
