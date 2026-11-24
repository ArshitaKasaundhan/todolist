import { CATAGORIES, payement_mode, directions } from "../config/constants";
import pool from "../config/db";
import { requireAuth } from "../../middleware/auth";
import { Router } from "express";

const router = Router();
router.use(["expenses", "loans", "upcoming_expenses"], requireAuth);
const idValidId = (id) => /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;
const rounnd2 = (value) => Math.round(value * 100) / 100;
const ok = (value) => ({ ok: true, value });
const fail = (value) => ({ ok: false, value });
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
