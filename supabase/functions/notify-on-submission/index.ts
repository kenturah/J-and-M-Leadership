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
// Students are told to REPLY with proof of payment, so replies must go to a real inbox.
const REPLY_TO = Deno.env.get("REPLY_TO_EMAIL") ?? BUSINESS_OWNER_EMAIL;

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, reply_to: REPLY_TO }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Resend error sending to ${to}:`, errorText);
  }

  return res.ok;
}

// ===== EMAIL CONFIG (keep in sync with js/script.js CAMPAIGN) =====
const PAYMENT_DEADLINE = "25 October 2026";   // first/one-off payment deadline
const BALANCE_DEADLINE = "26 November 2026";  // installment completion deadline
const CHURCH_INSTALLMENT = { initial: 10000, balance: 10000 };
const PUBLIC_INSTALLMENT = { initial: 40000, balance: 35000 }; // PLACEHOLDER until the MD approves public installments
const CERT_AFTER_FULL_PAYMENT = true;          // confirm with the MD
const OFFER_NOTE = "Please note: This special offer is available for this year only.";
const fmt = (n: number) => "&#8358;" + Number(n).toLocaleString("en-NG");
const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildEnrollmentEmails(record: any) {
  const { course, level, session, full_name, payment_option, amount_due, member_type } = record;
  const isChurch = member_type === "Church";
  const isInst = payment_option === "Installment";
  const plan = isChurch ? CHURCH_INSTALLMENT : PUBLIC_INSTALLMENT;

  const bank = [
    Deno.env.get("BANK_NAME") ?? "[BANK NAME]",
    Deno.env.get("BANK_ACCOUNT_NAME") ?? "[ACCOUNT NAME]",
    Deno.env.get("BANK_ACCOUNT_NUMBER") ?? "[ACCOUNT NUMBER]",
  ].map(esc).join(" | ");

  const total = fmt(amount_due ?? 0);
  const offer = isChurch
    ? "church member rate, certificate &amp; student package included"
    : "50% off, certification included";

  const planItem = isInst
    ? `<li><strong>Installment Plan:</strong> ${fmt(plan.initial)} before ${PAYMENT_DEADLINE}, then ${fmt(plan.balance)} before ${BALANCE_DEADLINE}</li>`
    : "";

  const instructions = isInst
    ? `<p>Please reply to this email with your proof of payment for your first installment (<strong>${fmt(plan.initial)}</strong>) before <strong>${PAYMENT_DEADLINE}</strong>.</p>
       <p>Your balance of <strong>${fmt(plan.balance)}</strong> must be paid before <strong>${BALANCE_DEADLINE}</strong>. Please reply with proof of payment for it as well.</p>
       <p>If a payment deadline is missed, your registration will remain incomplete until the full fee has been paid.${CERT_AFTER_FULL_PAYMENT ? " Your certificate will be issued after full payment." : ""}</p>`
    : `<p>Please reply to this email with your proof of payment before <strong>${PAYMENT_DEADLINE}</strong>.</p>`;

  const userHtml = `
    <h2>Thanks for registering, ${esc(full_name)}!</h2>
    <p>We&rsquo;ve received your registration for:</p>
    <ul>
      <li><strong>Course:</strong> ${esc(level)} ${esc(course)} &mdash; ${offer}</li>
      <li><strong>Session:</strong> ${esc(session)} Session 2026</li>
      <li><strong>Payment Option:</strong> ${esc(payment_option)}</li>
      <li><strong>Total Fee:</strong> ${total}</li>
      ${planItem}
    </ul>
    <h3>Next step: make your payment</h3>
    <p>Bank transfer to: <strong>${bank}</strong></p>
    ${instructions}
    <p>Your registration will only be confirmed once your payment has been verified.</p>
    <p>Your class onboarding details, curriculum and timetable will be shared with you before the commencement of classes.</p>
    <p>${OFFER_NOTE}</p>
    <p>We&rsquo;re excited to have you join the J&amp;M learning community.</p>
    <p>Warm regards,<br />J&amp;M Leadership &amp; Management Academy Team</p>
  `;

  const adminHtml = `
    <h2>New Enrollment Received</h2>
    <ul>
      <li><strong>Name:</strong> ${esc(full_name)}</li>
      <li><strong>Email:</strong> ${esc(record.email)}</li>
      <li><strong>Phone:</strong> ${esc(record.phone)}</li>
      <li><strong>Course:</strong> ${esc(course)} &ndash; ${esc(level)}</li>
      <li><strong>Session:</strong> ${esc(session)}</li>
      <li><strong>Member type:</strong> ${esc(member_type ?? "Public")}${record.promo_code ? " (code: " + esc(record.promo_code) + ")" : ""}</li>
      <li><strong>Payment option:</strong> ${esc(payment_option)}</li>
      <li><strong>Total fee:</strong> ${total}</li>
      ${isInst ? `<li><strong>Plan:</strong> ${fmt(plan.initial)} now + ${fmt(plan.balance)} by ${BALANCE_DEADLINE}</li>` : ""}
      <li><strong>Status:</strong> Pending payment verification</li>
    </ul>
  `;

  return {
    userSubject: "J&M Academy Registration \u2013 Complete Your Payment",
    userHtml,
    adminSubject: `New Enrollment${isChurch ? " [CHURCH]" : ""}: ${full_name} \u2014 ${course} (${level}) \u2014 ${payment_option}`,
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
