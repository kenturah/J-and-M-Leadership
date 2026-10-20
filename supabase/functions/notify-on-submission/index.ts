// supabase/functions/notify-on-submission/index.ts
//
// Triggered by a Supabase Database Webhook on INSERT into:
//   enrollments, consultations, contact_messages
//
// Sends two emails per submission via Resend:
//   1. A confirmation email to whoever filled the form
//   2. A details email to the business owner

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const BUSINESS_OWNER_EMAIL = Deno.env.get("BUSINESS_OWNER_EMAIL")!;
const FROM_EMAIL =
  Deno.env.get("FROM_EMAIL") ?? "J&M Leadership <hello@jandmcompanylimited.com>";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")!;

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Resend error sending to ${to}:`, errorText);
  }

  return res.ok;
}

function buildEnrollmentEmails(record: any) {
  const { course, level, session, full_name, email, phone, payment_option, amount_due, member_type } = record;
  const isChurch = member_type === "Church";
  const isInst = payment_option === "Installment";
  const scheduleHtml = isInst
    ? (isChurch
        ? `<li><strong>Installment plan:</strong> &#8358;10,000 now + &#8358;10,000 by 26 November 2026</li>`
        : `<li><strong>Installment plan:</strong> initial payment now; full fee completed by 26 November 2026</li>`)
    : "";
  const bank = `${Deno.env.get("BANK_NAME") ?? "[BANK NAME]"} &middot; ${Deno.env.get("BANK_ACCOUNT_NAME") ?? "[ACCOUNT NAME]"} &middot; ${Deno.env.get("BANK_ACCOUNT_NUMBER") ?? "[ACCOUNT NUMBER]"}`;
  const amount = Number(amount_due ?? 0).toLocaleString("en-NG");

  const userHtml = `
    <h2>Thanks for registering, ${full_name}!</h2>
    <p>We've received your request for:</p>
    <ul>
      <li><strong>Course:</strong> ${course} &ndash; ${level} (${isChurch ? "church member rate, certificate &amp; student package included" : "50% off, certification included"})</li>
      <li><strong>Session:</strong> ${session} &middot; Classes start 26 October 2026</li>
      <li><strong>Payment option:</strong> ${payment_option}</li>
      <li><strong>Total fee:</strong> &#8358;${amount}</li>
      ${scheduleHtml}
    </ul>
    <h3>Next step: make your payment</h3>
    <p>Bank transfer to: <strong>${bank}</strong></p>
    <p>Please reply to this email with your proof of payment before <strong>23 October 2026</strong>.</p>
    <p><strong>Important:</strong> your registration is only confirmed once payment has been verified.
    You will then receive your confirmation, WhatsApp Channel link and onboarding details.</p>
    <p>&mdash; J&amp;M Academy</p>
  `;

  const adminHtml = `
    <h2>New Enrollment Received</h2>
    <ul>
      <li><strong>Name:</strong> ${full_name}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Phone:</strong> ${phone}</li>
      <li><strong>Course:</strong> ${course} &ndash; ${level}</li>
      <li><strong>Session:</strong> ${session}</li>
      <li><strong>Member type:</strong> ${member_type ?? "Public"}${record.promo_code ? " (code: " + record.promo_code + ")" : ""}</li>
      <li><strong>Payment option:</strong> ${payment_option}</li>
      <li><strong>Total fee:</strong> &#8358;${amount}</li>
      ${isInst ? `<li><strong>Balance due:</strong> 26 November 2026</li>` : ""}
      <li><strong>Status:</strong> Pending payment verification</li>
    </ul>
  `;

  return {
    userSubject: "Your J&M Academy Registration — Complete Your Payment",
    userHtml,
    adminSubject: `New Enrollment: ${full_name} — ${course} (${level}) — ${payment_option}`,
    adminHtml,
  };
}

function buildConsultationEmails(record: any) {
  const {
    full_name,
    email,
    phone,
    consult_date,
    coach,
    service,
    hours,
    payment_method,
  } = record;

  const userHtml = `
    <h2>Thanks for booking, ${full_name}!</h2>
    <p>Your consultation request has been received:</p>
    <ul>
      <li><strong>Service:</strong> ${service}</li>
      <li><strong>Coach:</strong> ${coach}</li>
      <li><strong>Duration:</strong> ${hours} hour(s)</li>
      <li><strong>Preferred date:</strong> ${consult_date}</li>
      <li><strong>Payment method:</strong> ${payment_method}</li>
    </ul>
    <p>We'll confirm your appointment shortly.</p>
    <p>&mdash; J&amp;M Leadership and Management Limited</p>
  `;

  const adminHtml = `
    <h2>New Consultation Booking</h2>
    <ul>
      <li><strong>Name:</strong> ${full_name}</li>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Phone:</strong> ${phone}</li>
      <li><strong>Service:</strong> ${service}</li>
      <li><strong>Coach:</strong> ${coach}</li>
      <li><strong>Duration:</strong> ${hours} hour(s)</li>
      <li><strong>Preferred date:</strong> ${consult_date}</li>
      <li><strong>Payment method:</strong> ${payment_method}</li>
    </ul>
  `;

  return {
    userSubject: "Your J&M Leadership Consultation — Received",
    userHtml,
    adminSubject: `New Consultation Booking: ${full_name}`,
    adminHtml,
  };
}

function buildContactEmails(record: any) {
  const { full_name, email, message } = record;

  const userHtml = `
    <h2>Thanks for reaching out, ${full_name}!</h2>
    <p>We've received your message and will get back to you shortly.</p>
    <p>&mdash; J&amp;M Leadership and Management Limited</p>
  `;

  const adminHtml = `
    <h2>New Contact Message</h2>
    <ul>
      <li><strong>Name:</strong> ${full_name}</li>
      <li><strong>Email:</strong> ${email}</li>
    </ul>
    <p><strong>Message:</strong></p>
    <p>${message}</p>
  `;

  return {
    userSubject: "We received your message — J&M Leadership",
    userHtml,
    adminSubject: `New Contact Message: ${full_name}`,
    adminHtml,
  };
}

Deno.serve(async (req) => {
  // Basic shared-secret check since Database Webhooks don't send a Supabase JWT.
  // Set this same value as a custom header on the webhook itself (see setup steps).
  const incomingSecret = req.headers.get("x-webhook-secret");
  if (incomingSecret !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = await req.json();
    const { table, record } = payload;

    let emails;
    if (table === "enrollments") emails = buildEnrollmentEmails(record);
    else if (table === "consultations")
      emails = buildConsultationEmails(record);
    else if (table === "contact_messages") emails = buildContactEmails(record);
    else return new Response("Unknown table", { status: 400 });

    await Promise.all([
      sendEmail(record.email, emails.userSubject, emails.userHtml),
      sendEmail(BUSINESS_OWNER_EMAIL, emails.adminSubject, emails.adminHtml),
    ]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
