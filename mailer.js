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

export async function sendOtpEmail(to, otp) {
  if (!process.env.SMTP_USER) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return;
  }

  const minutes = Math.round((Number(process.env.OTP_TTL_SECONDS) || 300) / 60);

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Your login OTP",
    text: `Your OTP is ${otp}. It is valid for ${minutes} minutes. Do not share it with anyone.`,
    html: `<p>Your OTP is <b style="font-size:20px">${otp}</b></p>
           <p>It is valid for ${minutes} minutes. Do not share it with anyone.</p>`,
  });
}
