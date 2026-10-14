import Database from "better-sqlite3";
const db = new Database("tasks.db");
db.exec(`
    CREATE TABLE IF NOT EXISTS tasks(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    is_completed INT DEFAULT 0
    )
    `);
export default db;
