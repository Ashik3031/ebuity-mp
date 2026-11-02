// // utils/sendEmail.js
// import transporter from "../config/nodemailer.js"; // <-- your file with nodemailer createTransport

// export default async function sendEmail({ to, subject, html, text }) {
//   if (!to) throw new Error("Missing 'to' email");
//   await transporter.sendMail({
//     from: process.env.MAIL_FROM || '"Thabioka Closet" <no-reply@thabiokacloset.com>',
//     to,
//     subject,
//     text: text || undefined,
//     html: html || undefined,
//   });
// }


// utils/sendEmail.js
import transporter from "../config/nodemailer.js";

export default async function sendEmail({ to, subject, html, text }) {
  if (!to) throw new Error("Missing 'to' email");

  const from =
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    `"Thabioka Closet" <${process.env.SMTP_USER}>`; // safest fallback

  return await transporter.sendMail({
    from,
    to,
    subject,
    text: text || undefined,
    html: html || undefined,
  });
}
