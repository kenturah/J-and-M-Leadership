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
const PAYMENT_DEADLINE: string | null = null;   // null = no deadline (registration open). Example: "30 October 2026"
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
    ? `<li><strong>Installment Plan:</strong> ${fmt(plan.initial)}${PAYMENT_DEADLINE ? " before " + PAYMENT_DEADLINE : " now"}, then ${fmt(plan.balance)} before ${BALANCE_DEADLINE}</li>`
    : "";

  const instructions = isInst
    ? `<p>Please reply to this email with your proof of payment for your first installment (<strong>${fmt(plan.initial)}</strong>) ${PAYMENT_DEADLINE ? "before <strong>" + PAYMENT_DEADLINE + "</strong>" : "as soon as possible"}.</p>
       <p>Your balance of <strong>${fmt(plan.balance)}</strong> must be paid before <strong>${BALANCE_DEADLINE}</strong>. Please reply with proof of payment for it as well.</p>
       <p>If a payment deadline is missed, your registration will remain incomplete until the full fee has been paid.${CERT_AFTER_FULL_PAYMENT ? " Your certificate will be issued after full payment." : ""}</p>`
    : `<p>Please reply to this email with your proof of payment ${PAYMENT_DEADLINE ? "before <strong>" + PAYMENT_DEADLINE + "</strong>" : "as soon as possible"}.</p>`;

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

// ===================== BRANDED EMAIL SHELL (same design as the webinar email) =====================
const LOGO_URL = "https://jandmcompanylimited.com/assets/images/logo.png";
const CLASS_START: string | null = null;  // null = hide the "Classes begin" line. Example: "2 November 2026"
const SITE_URL = "https://www.jandmcompanylimited.com";

function inlineStyle(html: string) {
  return html
    .replace(/<h2>/g, '<h2 style="color:#0d233a;margin:0 0 16px 0;font-size:20px;font-weight:700;">')
    .replace(/<h3>/g, '<h3 style="color:#0d233a;margin:26px 0 8px 0;font-size:16px;font-weight:700;">')
    .replace(/<p>/g, '<p style="margin:0 0 16px 0;">')
    .replace(/<ul>/g, '<ul style="background-color:#f8fafc;border-left:4px solid #0066cc;border-radius:6px;margin:22px 0;padding:16px 20px 16px 38px;line-height:1.9;">');
}

function wrapEmail(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f6f9;padding:30px 15px;"><tr><td align="center">
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
  <tr><td align="center" style="background-color:#0d233a;padding:35px 20px;">
    <img src="${LOGO_URL}" alt="J&amp;M Logo" width="90" style="display:block;width:90px;max-width:90px;height:auto;border-radius:8px;margin-bottom:15px;">
    <h1 style="color:#ffffff;margin:0 0 6px 0;font-size:20px;font-weight:700;letter-spacing:0.3px;">J&amp;M Leadership &amp; Management Academy</h1>
    <p style="color:#94a3b8;margin:0;font-size:13px;font-style:italic;">Raising Exceptional Leaders. Redefining Success.</p>
  </td></tr>
  <tr><td style="padding:35px 30px;color:#333333;font-size:15px;line-height:1.6;">${inlineStyle(content)}</td></tr>
  <tr><td style="padding:0 30px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>
  <tr><td style="padding:25px 30px;background-color:#ffffff;text-align:center;font-size:13px;color:#777777;">
    <p style="margin:0 0 6px 0;font-weight:bold;color:#333333;font-size:14px;">J&amp;M Leadership and Management Academy</p>
    <p style="margin:0 0 16px 0;font-style:italic;color:#666666;font-size:12px;">Raising Exceptional Leaders. Redefining Success.</p>
    <p style="margin:0;line-height:1.8;">
      <img src="https://cdn-icons-png.flaticon.com/24/542/542689.png" width="14" height="14" style="vertical-align:middle;margin-right:4px;" alt="Email"><a href="mailto:hello@jandmcompanylimited.com" style="color:#0066cc;text-decoration:none;">Email Us</a>
      &nbsp;|&nbsp;
      <img src="https://cdn-icons-png.flaticon.com/24/1006/1006771.png" width="14" height="14" style="vertical-align:middle;margin-right:4px;" alt="Website"><a href="${SITE_URL}" style="color:#0066cc;text-decoration:none;">Website</a>
      &nbsp;|&nbsp;
      <img src="https://cdn-icons-png.flaticon.com/24/2111/2111463.png" width="14" height="14" style="vertical-align:middle;margin-right:4px;" alt="Instagram"><a href="https://instagram.com/jmleadershipinstitute" style="color:#0066cc;text-decoration:none;">Instagram</a>
      &nbsp;|&nbsp;
      <img src="https://cdn-icons-png.flaticon.com/24/3536/3536505.png" width="14" height="14" style="vertical-align:middle;margin-right:4px;" alt="LinkedIn"><a href="https://linkedin.com/company/j-m-leadership-and-management-academy-ltd/" style="color:#0066cc;text-decoration:none;">LinkedIn</a>
    </p>
  </td></tr>
  <tr><td align="center" style="background-color:#f1f5f9;padding:15px 20px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;">&copy; 2026 J&amp;M Leadership and Management Limited. All Rights Reserved.</td></tr>
</table></td></tr></table></body></html>`;
}

// ===================== PAYMENT CONFIRMATION (sent when you mark a student Paid / Part-paid) =====================
const plain = (n: number) => "\u20A6" + Number(n).toLocaleString("en-NG");

function firstNameOf(full: string) {
  const w = String(full ?? "").trim().split(/\s+/)[0] || "there";
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function paymentKey(status: any): "paid" | "part" | null {
  const s = String(status ?? "").toLowerCase().replace(/[\s_]+/g, "-");
  if (s === "paid") return "paid";
  if (s.startsWith("part")) return "part";
  return null;
}

function buildPaymentEmail(record: any) {
  const key = paymentKey(record.payment_status)!;
  const paid = Number(record.amount_paid ?? 0);
  const due = Number(record.amount_due ?? 0);
  const balance = Math.max(0, due - paid);
  const isInst = record.payment_option === "Installment";
  const isChurch = record.member_type === "Church";
  const course = `${esc(record.level)} ${esc(record.course)}`;
  const offer = isChurch ? "church member rate" : "50% off";
  const name = esc(firstNameOf(record.full_name));

  const details = `<ul>
      <li><strong>Course:</strong> ${course} (${offer})</li>
      <li><strong>Session:</strong> ${esc(record.session)} Session 2026</li>
      ${CLASS_START ? `<li><strong>Classes begin:</strong> ${CLASS_START}</li>` : ""}
      <li><strong>Total fee:</strong> ${fmt(due)}</li>
      <li><strong>Amount paid:</strong> ${fmt(paid)}</li>
      <li><strong>Balance:</strong> ${fmt(balance)}${key === "part" ? ` &mdash; due before ${BALANCE_DEADLINE}` : ""}</li>
    </ul>`;

  const closing = `
    <p>At J&amp;M Academy, we believe learning is more than just courses &ndash; it&rsquo;s about building confidence, skills and community. We&rsquo;ll be with you every step of the way. If you have any questions or need support, you can reach us at <a href="mailto:hello@jandmcompanylimited.com" style="color:#0066cc;">hello@jandmcompanylimited.com</a>.</p>
    <p>We can&rsquo;t wait to see your incredible achievements with us. &#128640;</p>
    <p>Warm regards,<br />J&amp;M Leadership &amp; Management Academy Team</p>`;

  if (key === "paid") {
    return {
      subject: "J&M Academy \u2013 Payment Confirmed, Welcome!",
      html: `
        <h2>Hi ${name},</h2>
        <p>We&rsquo;re pleased to confirm that we&rsquo;ve successfully received ${isInst ? "your final payment, bringing your total to " : "your payment of "}<strong>${fmt(paid)}</strong>. Welcome to the J&amp;M Academy community! &#127881;</p>
        <p>Your registration is now <strong>fully confirmed</strong>${isInst ? " and your course fee has been paid in full. You are eligible for your certificate and exams." : "."}</p>
        ${details}
        <p>Over the next few days, our team will reach out with your onboarding guide, next steps, and everything you&rsquo;ll need for your course. There&rsquo;s nothing else you need to do at this stage.</p>
        ${closing}`,
    };
  }

  return {
    subject: `J&M Academy \u2013 Payment Received (Balance ${plain(balance)})`,
    html: `
      <h2>Hi ${name},</h2>
      <p>Thank you! We&rsquo;ve received your payment of <strong>${fmt(paid)}</strong>. Welcome to the J&amp;M Academy community! &#127881;</p>
      <p>Your place on the course is secured. Here is where your payment stands:</p>
      ${details}
      <p>Our team will reach out with your onboarding guide, next steps, and everything you&rsquo;ll need for your course.</p>
      <p><strong>Please note:</strong> your balance of <strong>${fmt(balance)}</strong> must be paid before <strong>${BALANCE_DEADLINE}</strong>. Your certificate will only be issued, and you will only be able to write your exams, after your full payment has been completed. We&rsquo;ll send you a reminder before the deadline.</p>
      ${closing}`,
  };
}

async function markSent(id: any, note: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key || id == null) return;
  await fetch(`${url}/rest/v1/enrollments?id=eq.${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ communication_status: note }),
  });
}

async function handlePaymentUpdate(record: any, oldRecord: any) {
  const key = paymentKey(record.payment_status);
  // Only react when payment_status actually CHANGED to Paid / Part-paid (this also prevents loops and duplicate emails)
  if (!key || String(oldRecord?.payment_status ?? "") === String(record.payment_status ?? "")) {
    return new Response(JSON.stringify({ ignored: true }), { headers: { "Content-Type": "application/json" } });
  }
  const mail = buildPaymentEmail(record);
  const ok = await sendEmail(record.email, mail.subject, wrapEmail(mail.html));
  if (ok) {
    const stamp = new Date().toISOString().slice(0, 10);
    await markSent(record.id, `Payment confirmation emailed (${record.payment_status}) ${stamp}`);
  }
  return new Response(JSON.stringify({ success: ok }), { headers: { "Content-Type": "application/json" } });
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
    const { table, record, type, old_record } = payload;

    // Payment-status changes arrive as UPDATE events
    if (type === "UPDATE") {
      if (table === "enrollments") return await handlePaymentUpdate(record, old_record);
      return new Response(JSON.stringify({ ignored: true }), { headers: { "Content-Type": "application/json" } });
    }

    let emails: any;
    if (table === "enrollments") emails = buildEnrollmentEmails(record);
    else if (table === "consultations")
      emails = buildConsultationEmails(record);
    else if (table === "contact_messages") emails = buildContactEmails(record);
    else return new Response("Unknown table", { status: 400 });

    await Promise.all([
      sendEmail(record.email, emails.userSubject, wrapEmail(emails.userHtml)),
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
