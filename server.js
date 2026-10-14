import express from "express";
import db from "./db.js";
const app = express();
const port = 3000;
app.use(express.json());
app.use(express.static("public"));
app.post("/tasks", (req, res) => {
  // basically we here request title value
  //  const title=req.body.title; it is good if the ouput is only one but if multipe possibilityy you need to write lot of code that why use destructor
  const { title } = req.body;
  // here we are checking is title empty aur user send a multiple space instead of sending the task
  if (!title || !title.trim()) {
    // if the title is empty respond 400 status and at frontend send the part
    return res.status(400).json({ error: "title not found" });
  }
  // if i directly pass the task then it will create the prblm mayebe the hacjker send he dat i that why the table get deleted that why i create the space for it
  const st = db.prepare("INSERT INTO tasks (title) VALUES (?) ");
  // the i run this
  const info = st.run(title.trim());
  // new task must be add to that title which has id ?
  const newTask = db
    .prepare("SELECT *FROM tasks where id=?")
    .get(info.lastInsertRowid);
  res.status(200).json(newTask);
});
app.get("/tasks", (req, res) => {
  //prepare the data that i want to slect from the the table
  const query = db.prepare("SELECT * FROM tasks");
  // now take out all the the data and respond
  const info = query.all();
  // send the status at the backendd and data at fontend
  res.status(200).json(info);
});
// we are using patch opertio for accessing the change that we made in the data here task with the id are taken
app.patch("/tasks/:id", (req, res) => {
  // which id you select basically task ka id no se uska url nikalna
  const { id } = req.params;
  // fo telling the frontend that the task is completed
  const { is_completed } = req.body;
  // select the data and acccess it by using get operation
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
  // maybe we are using multiple brower and forget to refresh so for safer side
  if (!task) {
    return res.status(400).json({ error: "task no found" });
  }
  // if any parameter come from frontend the change it otherwise okay
  const update = is_completed !== undefined ? is_completed : task.is_completed;
  // update the task you get by using it id
  db.prepare("UPDATE tasks SET is_completed = ? WHERE id=?").run(update, id);
  // means the task you update now prepare the database annd get by id and update the same task in the frontend
  const updatetask = db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
  res.status(200).json(updatetask);
});
app.delete("/tasks/:id", (req, res) => {
  const { id } = req.params;
  const task = db.prepare("SELECT * FROM tasks WHERE id=? ").get(id);
  if (!task) {
    return res.status(400).json({ error: "task not found" });
  }
  db.prepare("DELETE FROM tasks WHERE id=?").run(id);
  res.status(200).json({ message: "task deleted successfully" });
});
app.listen(port, () => {
  console.log(`server is running ${port}`);
});
