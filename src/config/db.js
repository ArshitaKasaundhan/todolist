// import postgre and dotenv file for env
import pg from "pg";
import "dotenv/config";
// take Pool class from pg packets
import { CATAGORIES, payement_mode, directions } from "./constants";
const { Pool } = pg;
const sqlList = (list) => list.map((item) => `${item}`).join(", ");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// it is basic initDb function  which export
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users(
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL 
    )`);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS expenses(
     id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     category TEXT NOT NULL CHECK(category IN(${sqlList(CATAGORIES)}) ),
     amount NUMERIC(12,2) NOT NULL CHECK(amount>0),
     payement_mode TEXT NOT NULL CHECK(payement_mode IN(${sqlList(payement_mode)})),
     note TEXT,
     CREATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );
  await pool.query(`
CREATE TABLE IF NOT EXISTS loans(
id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
name TEXT NOT NULL,
friend_name TEXT NOT NULL,
directions TEXT NOT NULL CHECK(category IN(${sqlList(directions)})),
amount NUMERIC(12,2) NOT NULL CHECK(amount>0),
amount_paid NUMERIC(12,2) NOT NULL ,
loan_date DATE NOT NULL,
not text,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
)
`);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS upcoming_expenses(
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN(${sqlList(CATAGORIES)})),
  amount NUMERIC(12,2) NOT NULL  CHECK(amount>0),
  due_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}
export default pool;
