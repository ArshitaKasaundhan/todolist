import bcrypt from "bcrypt";
import crypto from "node:crypto";
import pool from "./db.js";
import connectRedis from "./redis.js";
import { redis } from "./redis.js";
import { Router } from "express";
import { sendOtpEmail, sendVerificationEmail } from "./mailer.js";
import { setAuthCookie, requireAuth } from "./auth.js";
const VERIFY_TTL = 86400;
const router = Router();
const saltRounds = 10;
// import from .env otp exipiry time
const OTP_TTL = Number(process.env.OTP_TTL_SECONDS) || 300; // seconds
const MAX_ATTEMPTS = 5;
// for storing otp on redis on basis of email id
const otpKey = (email) => `otp:${email}`;
// count the otp verification
const attemptsKey = (email) => `otp_attempts:${email}`;
// verification token key
const verifyKey = (token) => `email:${token}`;
// we use crpto because math.random is very predictable
const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");
async function sendVerification(userId, email) {
  const token = crypto.randomBytes(32).toString("hex");
  console.log("token generate");
  await redis.set(verifyKey(token), String(userId), { EX: VERIFY_TTL });
  console.log("token saved");
  const base = process.env.APP_URL || "http://localhost:3000";
  console.log("verifiaction link");
  const link = `${base}/auth/verify-email?token=${token}`;
  console.log("Verification link:", link);
  await sendVerificationEmail(email, link);
}
// this is used to register the account
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 9
    ) {
      return res.status(400).json({
        error: "Username,email,password(minimum 8 character) are required",
      });
    }
    const normalEmail = email.trim().toLowerCase();
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [
      normalEmail,
    ]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Email is registered" });
    }
    const hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash )
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username.trim(), email.trim().toLowerCase(), hash],
    );
    const user = result.rows[0];
    try {
      console.log("successful");
      await sendVerification(user.id, user.email);
    } catch (mailError) {
      console.error("regstration email failed:", mailError);
    }
    res.status(201).json({
      message: "please check your email.",
      user,
    });
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
      "SELECT id, username, email, password_hash,email_verified FROM users WHERE email = $1",
      [cleanEmail],
    );
    const user = result.rows[0];
    const isMatch =
      user && (await bcrypt.compare(password, user.password_hash));
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.email_verified) {
      return res.status(403).json({ error: "please verify your email first." });
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
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (typeof token !== "string" || !token) {
      return res.status(400).json({ error: "Invalid link " });
    }
    const userId = await redis.getDel(verifyKey(token));
    if (!userId) {
      return res
        .status(400)
        .json({ error: "Link expired or already used. Request a new one." });
    }
    const result = await pool.query(
      "UPDATE users SET email-verified=TRUE WHERE id=$1 RETURNING id",
      [userId],
    );
    if (result.rowCount === 0) {
      return res.status(400).json({ error: "User not found" });
    }
    setAuthCookie(res, Number(userId));
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.post("/resend", async (req, res) => {
  try {
    const { email } = req.body;
    if (typeof email !== "string") {
      return res.status(400).json({ erroor: "Email is required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const result = await pool.query(
      "SELECT id, email_verified FROM users WHERE email = $1",
      [cleanEmail],
    );
    const user = result.rows[0];
    if (user && !user.email_verified) {
      const allowed = await redis.set(`verify_cooldown:${cleanEmail}`, "1", {
        NX: true,
        EX: 60,
      });
      if (!allowed) {
        return res
          .status(429)
          .json({ error: "Wait 60 seconds and try again." });
      }
      await sendVerification(user.id, cleanEmail);
    }
    res.json({
      message: "If the email needs verification, a link has been sent.",
    });
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
