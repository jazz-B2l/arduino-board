import Database from 'better-sqlite3';
import path from 'path';

// Define the database path (in the root directory)
const dbPath = path.join(process.cwd(), 'chat_sessions.db');

// Initialize the database connection
const db = new Database(dbPath, { verbose: console.log });

// Enable Write-Ahead Logging for better concurrent performance
db.pragma('journal_mode = WAL');

// Create the messages table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
