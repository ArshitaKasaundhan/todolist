// import postgre and dotenv file for env
import pg from "pg";
import "dotenv/config";
// take Pool class from pg packets
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// it is basic initDb function  which export
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      title TEXT NOT NULL,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
}
export default pool;
