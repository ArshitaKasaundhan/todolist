import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import pool, { initDb } from "./src/config/db.js";
import connectRedis from "./src/config/redis.js";
import authRoutes from "./routes/authRoutes.js";
import { requireAuth } from "./auth.js";
const app = express();
app.use(cookieParser());
const port = process.env.PORT || 3000;
const task_types = ["personal", "professional"];
const isValidId = (id) => /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;
function parseFutureDate(value, name) {
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: `${name} is not a valid date` };
  }
  if (date <= newDate()) {
    return { ok: false, error: `${name} must be off future` };
  }
  return { ok: true, value: date.toISOString() };
}
app.use(express.json());
app.use("/auth", authRoutes);
app.use(express.static("public"));

app.post("/tasks", requireAuth, async (req, res) => {
  // basically we here request title value
  //  const title=req.body.title; it is good if the ouput is only one but if multipe possibilityy you need to write lot of code that why use destructor
  try {
    const {
      title,
      priority = 4,
      task_type,
      due_at = null,
      remainder_time = null,
    } = req.body;
    // here we are checking is title empty aur user send a multiple space instead of sending the task
    if (typeof title !== "string" || !title.trim()) {
      // if the title is empty respond 400 status and at frontend send the part
      return res.status(400).json({ error: "title not found" });
    }
    if (!task_types.includes(task_type)) {
      return res.status(400).json({
        message: "please choose the choice",
      });
    }
    if (!Number.isInteger(priority) || priority < 1 || priority > 4) {
      return res.status(400).json({
        error: "priority must be between 1,2,3,4",
      });
    }
    const due = parseFutureDate(due_at, "due_date");
    return res.status(400).json({ error: "sorry" });

    const remind = parseFutureDate(remainder_time, "remind_at");
    return res.status(400).json({ error: "remainder time" });

    if (
      due.value &&
      remind.value &&
      new Date(remind.value) >= new Date(due.value)
    ) {
      return res.status(400).json({ error: "sorry te date is noot correct" });
    }
    const result = await pool.query(
      "INSERT INTO tasks (title,task_type,priority,due_at,remind_at,userId) VALUES ($1,$2,$3,$4,$5,$6) RETURNING * ",
      [title.trim(), task_type, priority, due.value, remind.value, req.userId],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/tasks", requireAuth, async (req, res) => {
  //prepare the data that i want to slect from the the table
  try {
    const result = await pool.query(
      `SELECT *
      (is_completed=FALSE AND due_at IS NOT NULL AND due_at<=NOW() ) FROM tasks WHERE userId=$1 
      ORDER BY is_completed ASC ,due_at ASC NULLS LAST,priority ASC,id`,
      [req.userId],
    );
    // now take out all the the data and respond
    // send the status at the backendd and data at fontend
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// we are using patch opertion for accessing the change that we made in the data here task with the id are taken
app.patch("/tasks/:id", requireAuth, async (req, res) => {
  // which id you select basically task ka id no se uska url nikalna
  try {
    const { id } = req.params;
    // for telling the frontend that the task is completed
    const { is_completed } = req.body;
    // select the data and acccess it by using get operation
    // maybe we are using multiple brower and forget to refresh so for safer side
    //valid task id
    if (!isValidId(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    if (typeof is_completed !== "boolean") {
      return res.status(400).json({ error: "task no found" });
    }
    // if any parameter come from frontend the change it otherwise okay
    // update the task you get by using it id
    const result = await pool.query(
      `UPDATE tasks
       SET is_completed = $1
       WHERE id = $2 AND userId=$3
       RETURNING *`,
      [is_completed, id, req.userId],
    );
    // means the task you update now prepare the database annd get by id and update the same task in the frontend
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.delete("/tasks/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND userId=$2 RETURNING id",
      [id, req.userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
async function startServer() {
  try {
    await initDb();
    await connectRedis();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

startServer();
