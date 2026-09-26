import { Resend } from "resend";

let resend = null;

function getResend() {
  if (resend) return resend;

  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  resend = new Resend(process.env.RESEND_API_KEY);

  return resend;
}

export async function sendRegistrationEmail({ to, name, event }) {
  const client = getResend();

  if (!client) {
    return {
      sent: false,
      reason: "Resend is not configured"
    };
  }

  const from =
    process.env.EMAIL_FROM || "NexusCampus <onboarding@resend.dev>";

  const { data, error } = await client.emails.send({
    from,
    to,
    subject: `Registration confirmed — ${event.title}`,

    text: `Hello ${name || "Participant"},

Your registration for ${event.title} is confirmed.

Date: ${event.date}
Time: ${event.time}
Venue: ${event.venue}

Thank you,
NexusCampus`,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 620px;
        margin: auto;
        padding: 24px;
        color: #111827;
      ">

        <h1 style="margin-bottom: 8px;">
          Registration Confirmed 🎉
        </h1>

        <p>
          Hello ${escapeHtml(name || "Participant")},
        </p>

        <p>
          Your registration for
          <strong>${escapeHtml(event.title)}</strong>
          has been successfully confirmed.
        </p>

        <div style="
          background: #f3f4f6;
          padding: 18px;
          border-radius: 10px;
          margin: 20px 0;
        ">

          <p>
            <strong>Date:</strong>
            ${escapeHtml(event.date)}
          </p>

          <p>
            <strong>Time:</strong>
            ${escapeHtml(event.time)}
          </p>

          <p>
            <strong>Venue:</strong>
            ${escapeHtml(event.venue)}
          </p>

        </div>

        <p>
          We look forward to seeing you at the event.
        </p>

        <p>
          Thank you,<br/>
          <strong>NexusCampus</strong>
        </p>

      </div>
    `
  });

  if (error) {
    console.error("Resend email error:", error);

    return {
      sent: false,
      reason: error.message || "Failed to send email"
    };
  }

  console.log("Registration email sent:", data?.id);

  return {
    sent: true,
    messageId: data?.id
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);
}