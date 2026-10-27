import bcrypt from "bcrypt";
import crypto from "node:crypto";
import pool from "./db.js";
import connectRedis from "./redis.js";
import { redis } from "./redis.js";
import { Router } from "express";
import { sendOtpEmail } from "./mailer.js";
import { setAuthCookie, requireAuth } from "./auth.js";
import { error } from "node:console";

const router = Router();
const saltRounds = 10;
// import from .env otp exipiray time
const OTP_TTL = Number(process.env.OTP_TTL_SECONDS) || 300; // seconds
const MAX_ATTEMPTS = 5;
// for storing otp on redis on basis of email id
const otpKey = (email) => `otp:${email}`;
// count the otp verification
const attemptsKey = (email) => `otp_attempts:${email}`;

// we use crpto because math.random is very predictable
const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");
// this is used to register the account
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (
      typeof username !== "string" ||
      !username() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res
        .status(400)
        .json({ error: "Username,email,password are required" });
    }
    const normalEmail = email.trim().toLowerCase();
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [
      [normalEmail],
    ]);
    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: "Email is registered",
      });
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
// it is used to login and if the loginn right give jwt cookie
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const result = await pool.query(
      "SELECT id, username, email, password_hash FROM users WHERE email = $1",
      [cleanEmail],
    );
    const user = result.rows[0];
    const isMatch =
      user && (await bcrypt.compare(password, user.password_hash));
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const otp = generateOtp();
    await redis.set(otpKey(cleanEmail), otp, { EX: OTP_TTL });
    // delete the no of attempt reset it
    await redis.del(attemptsKey(cleanEmail));

    try {
      await sendOtpEmail(cleanEmail, otp);
    } catch (mailError) {
      console.error("Email send failed:", mailError);
      await redis.del(otpKey(cleanEmail));
      return res
        .status(500)
        .json({ error: "Could not send OTP email. Try again." });
    }

    res.json({ message: "OTP sent to your email", email: cleanEmail });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// VERIFY OTP: sahi ho to JWT cookie do
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (typeof email !== "string" || typeof otp !== "string") {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const savedOtp = await redis.get(otpKey(cleanEmail));
    if (!savedOtp) {
      return res
        .status(400)
        .json({ error: "OTP expired or not found. Login again." });
    }
    const attempts = await redis.incr(attemptsKey(cleanEmail));
    if (attempts === 1) {
      await redis.expire(attemptsKey(cleanEmail), OTP_TTL);
    }
    if (attempts > MAX_ATTEMPTS) {
      await redis.del(otpKey(cleanEmail));
      await redis.del(attemptsKey(cleanEmail));
      return res
        .status(429)
        .json({ error: "Too many wrong attempts. Login again." });
    }

    if (savedOtp !== otp.trim()) {
      return res.status(401).json({ error: "Wrong OTP" });
    }
    await redis.del(otpKey(cleanEmail));
    await redis.del(attemptsKey(cleanEmail));

    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE email = $1",
      [cleanEmail],
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    setAuthCookie(res, user.id);
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// understanding which user send the requet by token
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [req.userId],
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

export default router;
