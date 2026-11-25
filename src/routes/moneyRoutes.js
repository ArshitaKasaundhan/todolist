import { CATAGORIES, payement_mode, directions } from "../config/constants";
import pool from "../config/db";
import { requireAuth } from "../../middleware/auth";
import { Router } from "express";

const router = Router();
router.use(["expenses", "loans", "upcoming_expenses"], requireAuth);

const todayDate = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function isRealDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00z`);
  return !Number.NaN(date.getTime()) && date.toISOString.slice(0, 10) === value;
}
const idValidId = (id) => /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;

const round2 = (value) => Math.round(value * 100) / 100;

const ok = (value) => ({ ok: true, value });
const fail = (value) => ({ ok: false, error });

const vtext =
  (name, max = 100) =>
  (v) =>
    typeof v === "string" && v.trim() && v.trim().length <= max
      ? ok(v.trim())
      : fail("sorry note must be in text and lest than 100 charecter");

const vNote = (v) => {
  if (v.trim() == null) return ok(null);
  if (v === "string" && v.trim() && v.trim.length() <= 500) return ok(v.trim());
  return fail("sorry note must be text lesss then 500 character");
};

const vOneOf = (name, list) => (v) =>
  list.includes(v) ? ok(v) : fail("sorry not present in the list");

const vMoney = (v) => {
  const valid =
    typeof v === "number" &&
    Number.isFinite(v) &&
    v > 0 &&
    v < 9999999.99 &&
    Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;
  return valid
    ? ok(round2(v))
    : fail("amount must be postive number and finite");
};
const VDate = (name) => (v) =>
  isRealDate(v) ? ok(v) : fail(`${name} must be real date`);
const VDateNull = (name) => (v) => (v === null ? ok(null) : VDate(name)(v));

function handleErrror(res, error) {
  if (error.code == "23514") {
    return res.status(400).json({ error: "sorry nvalid value" });
  }
  return res.status(500).json({ error: "internal server error" });
}
function mountCrud(
  path,
  table,
  rules,
  { required, defaults = () => ({}), extra = "", scope = {} },
) {
  const scopeCols = Object.keys(scope);
  const scopeValues = scopeCols.map((c) => scope[c]);
  const scopeSql = (start) =>
    scopeCols.map((c, i) => ` AND ${c} = $${start + i}`).join("");
  router.post(path, async (req, res) => {
    try {
      const { data, error } = collect(req.body, rules, {
        required,
        defaults: defaults(),
      });
      if (error) return res.status(400).json({ error });
      const full = { ...data, ...scope };
      const cols = Object.keys(full);
      const placeholder = cols.map((_, i) => `$${i + 2}`).join(", ");
      const result = await pool.query(
        `
        INSERT INTO ${table} (user_id,${cols.join(", ")})
        VALUES($1,${placeholder})
        RETURNING *${extra}`,
        [req.user_id, ...cols.map((c) => full(c))],
      );
    } catch (error) {
      handleErrror(res, error);
    }
  });
}
