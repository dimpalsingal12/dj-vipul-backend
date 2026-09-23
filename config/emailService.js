const { google } = require("googleapis");

require("dotenv").config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client,
});

function makeRawEmail({ from, to, subject, html, text }) {
  const boundary = "DJ_VIPUL_BOUNDARY";

  const email = [
    `From: ${from || process.env.EMAIL_USER}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    text || "",
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html || "",
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const transporter = {
  sendMail: async ({ from, to, subject, html, text }) => {
    try {
      const raw = makeRawEmail({
        from,
        to,
        subject,
        html,
        text,
      });

      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw,
        },
      });

      console.log("EMAIL SENT:", result.data.id);

      return {
        messageId: result.data.id,
      };
    } catch (error) {
      console.error("EMAIL SERVICE ERROR:", error.message);
      throw error;
    }
  },
};

module.exports = transporter;