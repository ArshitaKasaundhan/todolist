import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import pool, { initDb } from "./db.js";
import connectRedis from "./redis.js";
import authRoutes from "./authRoutes.js";
const app = express();
app.use(cookieParser());
const port = process.env.PORT || 3000;

const isValidId = (id) => /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;

app.use(express.json());
app.use("/auth", authRoutes);
app.use(express.static("public"));

app.post("/tasks", async (req, res) => {
  // basically we here request title value
  //  const title=req.body.title; it is good if the ouput is only one but if multipe possibilityy you need to write lot of code that why use destructor
  try {
    const { title } = req.body;
    // here we are checking is title empty aur user send a multiple space instead of sending the task
    if (typeof title !== "string" || !title.trim()) {
      // if the title is empty respond 400 status and at frontend send the part
      return res.status(400).json({ error: "title not found" });
    }
    // if i directly pass the task then it will create the prblm mayebe the hacjker send he dat i that why the table get deleted that why i create the space for it
    const result = await pool.query(
      "INSERT INTO tasks (title) VALUES ($1) RETURNING * ",
      [title.trim()],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/tasks", async (req, res) => {
  //prepare the data that i want to slect from the the table
  try {
    const result = await pool.query("SELECT * FROM tasks ORDER BY id");
    // now take out all the the data and respond
    // send the status at the backendd and data at fontend
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// we are using patch opertion for accessing the change that we made in the data here task with the id are taken
app.patch("/tasks/:id", async (req, res) => {
  // which id you select basically task ka id no se uska url nikalna
  try {
    const { id } = req.params;
    // for telling the frontend that the task is completed
    const { is_completed } = req.body;
    // select the data and acccess it by using get operation
    // maybe we are using multiple brower and forget to refresh so for safer side
    //valid task id
    if (!/^[1-9]\d*$/.test(id)) {
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
       WHERE id = $2
       RETURNING *`,
      [is_completed, id],
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
app.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING id",
      [id],
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
