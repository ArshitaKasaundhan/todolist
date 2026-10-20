import pool from "./db.js";
export async function requireAuth(req, res, next) {
  try {
    const sid = req.cookies.sid;
    if (!sid) {
      return res.status(401).json({ error: "Login required" });
    }
    const result = await pool.query(
      "SELECT user_id FROM sessions WHERE id = $1 AND expires_at > NOW()",
      [sid],
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Session expired. Login again." });
    }

    req.userId = result.rows[0].user_id;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}
