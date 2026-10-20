import bcrypt from "bcrypt";
import pool from "./db.js";
import { Router } from "express";
import crypto from "node:crypto";
import { requireAuth } from "./auth.js";

const router = Router();
const saltRounds = 10;
const SESSION_DAYs = 7;
router.post("/register", async (requestAnimationFrame, res) => {
  try {
    const { username, email, password } = requestAnimationFrame.body;
    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res
        .status(400)
        .json({ error: "Username,email,password are required" });
    }
    const hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username.trim(), email.trim().toLowerCase(), hash],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    // unique validation code
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await pool.query(
      "SELECT id, username, email, password_hash FROM users WHERE email = $1",
      [email.trim().toLowerCase()],
    );
    const user = result.rows[0];
    const isMatch = user && (await bcrypt.compare(password, password_hash));
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    res.json({ id: user.id, username: user.username, email: user.email });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
export default router;
