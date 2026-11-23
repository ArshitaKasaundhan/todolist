import { sentremaideremail } from "./mailer";

const Interval_ms = (Number(process.env.TASK_CHECK_SECONDS) || 60) * 1000;
let running = false;
const REMAINDER_QUERY = `
WITH claimed AS (
  UPDATE tasks
  SET overdue_notified_at = NOW()
  WHERE id IN (
    SELECT id FROM tasks
    WHERE is_completed = FALSE
      AND due_at IS NOT NULL
      AND due_at < NOW()
      AND overdue_notified_at IS NULL
      AND user_id IS NOT NULL
    ORDER BY due_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id, user_id, title, priority, task_type, due_at
)
SELECT c.*, u.email, u.username
FROM claimed c
JOIN users u ON u.id = c.user_id
`;
async function runBatch({ name, query, send, resetColumn }) {
  const claimed = await pool.query(query);

  const byUser = new Map();
  for (const task of claimed.rows) {
    if (!byUser.has(task.user_id)) {
      byUser.set(task.user_id, {
        email: task.email,
        username: task.username,
        tasks: [],
      });
    }
    byUser.get(task.user_id).tasks.push(task);
  }
  for (const { email, username, tasks } of byUser.values()) {
    try {
      await send(email, username, tasks);
      console.log(`[${name}] mailed ${email} about ${tasks.length} tasks(s)`);
    } catch (error) {
      console.error(`[${name}] mail failed for ${email}:`, error.message);
      await pool.query(
        `UPDATE tasks SET ${resetColumn}=NULL WHERE id = ANY($1::int[])`,
        [tasks.map((t) => t.id)],
      );
    }
  }
}
async function checkTasks() {
  if (running) return;
  running = true;
  try {
    await runBatch({
      name: "REMINDER",
      query: REMAINDER_QUERY,
      send: sentremaideremail,
      resetColumn: "remainder_sent_at",
    });
  } catch (error) {
    console;
  }
}
