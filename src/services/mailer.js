import nodemailer from "nodemailer";
import "dotenv/config";
// createTransport->fixed library method which help in making the configration between the mail
const transporter = nodemailer.createTransport({
  // we make host so that we know that email is send with smtp server
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
async function deliver({ to, subject, text, html, devlog }) {
  if (!process.env.SMTP_USER) {
    console.log(devlog);
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const formatTime = (date) =>
  new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
const button = (link, label) =>
  `<p><a href="${link}" style="background:#4f46e5;
  color:#fff;
  border-radius:6px;">${label}</a></p>`;

const taskline = (t) =>
  `p${t.priority} | ${t.task_type} | ${t.title} | due ${t.due_at ? formatTime(t.due_at) : "no deadline"}`;

const taskItem = (t) =>
  `<li><b>${escapeHtml(t.title)}</b> (P${t.priority}, ${escapeHtml(t.task_type)}), due ${
    t.due_at ? escapeHtml(formatTime(t.due_at)) : "no deadline"
  }</li>`;
const plural = (n, one, many) => (n == 1 ? one : many);

export async function sendOtpEmail(to, otp) {
  const minutes = Math.round((Number(process.env.OTP_TTL_SECONDS) || 300) / 60);
  return deliver({
    to,
    subject: "Your login OTP",
    text: `Your OTP is ${otp}. It is valid for ${minutes} minutes. Do not share it with anyone.`,
    html: `<p>Your OTP is <b style="font-size:20px">${otp}</b></p>
           <p>It is valid for ${minutes} minutes. Do not share it with anyone.</p>`,
    devlog: `[DEV] verification email for ${to}: ${otp}`,
  });
}

export async function sendVerificationEmail(to, link) {
  return deliver({
    to,
    subject: "verify your email",
    text: ` Welcome! Verify your email by opening this link: ${link}\nThe link is valid for 24 hours.`,
    html: `<p>Welcome! Click the button below to verify your email.</p>
           ${button(link, "Verify email")}
           <p>The link is valid for 24 hours.</p>`,
    devlog: `[DEV] veriification link for ${to} :{link}`,
  });
}

export async function sendResetEmail(to, otp) {
  return deliver({
    to,
    subject: "Reset password",
    text: `Your OTP is ${otp}. It is valid for ${minutes} minutes. Do not share it with anyone.`,
    html: `<p>Your OTP is <b style="font-size:20px">${otp}</b></p>
           <p>It is valid for ${minutes} minutes. Do not share it with anyone.</p>`,
    devlog: `[DEV] verification email for ${to}: ${otp}`,
  });
}

export async function sentremaideremail(to, username, tasks) {
  const lines = tasks.map(taskline);
  return deliver({
    to,
    subject: `Remainder :{tasks.length} ${plural(tasks.length, "task", "tasks")} to finish`,
    text: `Hi ${username},A reminder for you pending ${plural(tasks.length, "task", "tasks")}:${lines.join("\n")}`,
    html: `<p> Hi ${escapeHtml(username)},</p>
        <p> A Remainder for pending task ${plural(tasks.length, "task", "tasks")}</p>,
        <ul>${tasks.map(taskItem).join("")}</ul>`,
    devlog: `[DEV] remainder mail for ${to}: ${lines.join("\n")}`,
  });
}

export async function sentOverDuemail(to, username, tasks) {
  const lines = tasks.map(taskline);
  return deliver({
    to,
    subject: `Remainder :{tasks.length} ${plural(tasks.length, "task", "tasks")} to finish`,
    text: `Hi ${username},A reminder for you pending ${plural(tasks.length, "task", "tasks")}:${lines.join("\n")}`,
    html: `<p> Hi ${escapeHtml(username)},</p>
        <p> A Remainder for pending task ${plural(tasks.length, "task", "tasks")}</p>,
        <ul>${tasks.map(taskItem).join("")}</ul>`,
    devlog: `[DEV] remainder mail for ${to}: ${lines.join("\n")}`,
  });
}
