// ---- Render Lucide icons (runs after the Lucide CDN script has loaded) ----
lucide.createIcons();

// ---- Mobile nav: hamburger toggle, close on link click, lock scroll while open ----
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

function openNav() {
  navLinks.classList.add("open");
  navToggle.setAttribute("aria-expanded", "true");
  document.body.classList.add("nav-open");
}

function closeNav() {
  navLinks.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-open");
}

navToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.contains("open");
  isOpen ? closeNav() : openNav();
});

// Tapping a link (including the mobile "Enroll Now" button) closes the menu
navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeNav);
});

// Avoid a stuck-open overlay if the screen is resized/rotated past the mobile breakpoint
window.addEventListener("resize", () => {
  if (window.innerWidth > 950) closeNav();
});

// =====================================================================
// CAMPAIGN CONFIG — the ONLY place to edit fee, dates, bank & installments
// =====================================================================
const CAMPAIGN = {
  originalFee: 150000,
  discountPercent: 50,
  startDate: "26 October 2026",
  deadlineLabel: "23 October 2026",
  deadlineISO: "2026-10-23T23:59:59+01:00", // registration closes end of day (Lagos)
  session: "Spring",
  bank: { name: "[BANK NAME]", accountName: "[ACCOUNT NAME]", accountNumber: "[ACCOUNT NUMBER]" },
  // Set approved:true ONLY after the MD approves the structure. Until then the option stays disabled.
  installment: {
    approved: false,
    initial: 40000,
    count: 2,
    each: 35000,
    deadlines: ["26 October 2026 (initial)", "[DATE]"],
    finalDate: "[DATE]",
    missedPolicy: "[WHAT HAPPENS IF A DEADLINE IS MISSED]",
    certAfterFullPayment: true,
  },
};
CAMPAIGN.salePrice = CAMPAIGN.originalFee * (1 - CAMPAIGN.discountPercent / 100);
const naira = (n) => "\u20A6" + Number(n).toLocaleString("en-NG");
const registrationClosed = () => new Date() > new Date(CAMPAIGN.deadlineISO);

// Fill prices/dates everywhere from the config
document.querySelectorAll(".js-price-old").forEach((el) => (el.textContent = naira(CAMPAIGN.originalFee)));
document.querySelectorAll(".js-price-new").forEach((el) => (el.textContent = naira(CAMPAIGN.salePrice)));
document.querySelectorAll(".js-deadline").forEach((el) => (el.textContent = CAMPAIGN.deadlineLabel));
document.querySelectorAll(".js-startdate").forEach((el) => (el.textContent = CAMPAIGN.startDate));

// Installment option stays disabled until approved
const optInstallment = document.getElementById("optInstallment");
if (optInstallment && !CAMPAIGN.installment.approved) {
  optInstallment.disabled = true;
  optInstallment.textContent = "Installment payment (schedule coming soon)";
}

// Payment summary shown under the dropdown
function renderPaymentSummary() {
  const box = document.getElementById("paymentSummary");
  const choice = document.getElementById("paymentOption")?.value;
  if (!box) return;
  if (!choice) { box.hidden = true; return; }
  const b = CAMPAIGN.bank;
  const bank = `<p><b>Bank transfer:</b> ${b.name} &middot; ${b.accountName} &middot; ${b.accountNumber}</p>`;
  if (choice === "One-off") {
    box.innerHTML = `<p>Total (50% off, certification included): <span class="amt">${naira(CAMPAIGN.salePrice)}</span></p>${bank}<p>Payment details will also be emailed to you. Your place is confirmed once payment is verified.</p>`;
  } else {
    const i = CAMPAIGN.installment;
    box.innerHTML = `<p>Total: <span class="amt">${naira(CAMPAIGN.salePrice)}</span></p>
      <p>Initial payment: ${naira(i.initial)} &middot; ${i.count} further installment(s) of ${naira(i.each)}</p>
      <p>Deadlines: ${i.deadlines.join("; ")}. Full fee due by ${i.finalDate}.</p>
      <p>Missed deadline: ${i.missedPolicy}</p>
      ${i.certAfterFullPayment ? "<p>Certificate is issued after full payment.</p>" : ""}${bank}`;
  }
  box.hidden = false;
}
document.getElementById("paymentOption")?.addEventListener("change", renderPaymentSummary);

// Close the form automatically after the deadline
if (registrationClosed()) {
  const f = document.getElementById("enrollmentForm");
  if (f) f.innerHTML = '<p class="registration-closed">Registration for this cohort has closed. Please contact us for the next intake.</p>';
}

// ---- Session options per level. Edit dates here once confirmed — everything else updates automatically. ----
const SESSIONS_BY_LEVEL = {
  Basic: [
    { value: "Summer", label: "Summer (Jan – Mar) — Closed", disabled: true },
    { value: "Autumn", label: "Autumn (Apr – Jun) — Closed", disabled: true },
    { value: "Winter", label: "Winter (Jul – Sep) — Closed", disabled: true },
    { value: "Spring", label: "Spring (Oct – Dec) — Starts 26 Oct", disabled: false },
  ],
  Advanced: [
    { value: "Session1", label: "First Session (Jan – Jun) — Closed", disabled: true },
    { value: "Session2", label: "Second Session (Jul – Dec) — Closed", disabled: true },
  ],
};

function populateSessions(level) {
  const sessionSelect = document.getElementById("sessionSelect");
  if (!sessionSelect) return;

  // Block Advanced selection safely
  if (level === "Advanced") {
    sessionSelect.innerHTML = '<option value="">Advanced level is currently paused</option>';
    sessionSelect.disabled = true;
    return;
  }

  const options = SESSIONS_BY_LEVEL[level];
  if (!options) {
    sessionSelect.innerHTML = '<option value="">Select a course first</option>';
    sessionSelect.disabled = true;
    return;
  }

  sessionSelect.innerHTML =
    '<option value="">Select a session</option>' +
    options
      .map(
        (option) => `<option value="${option.value}">${option.label}</option>`,
      )
      .join("");
  sessionSelect.disabled = false;
}

// ---- Course "Enroll" buttons: preselect the course/level + sessions, then scroll to the form ----
document.querySelectorAll(".btn-enroll").forEach((btn) => {
  btn.addEventListener("click", () => {
    const course = btn.dataset.course;
    const level = btn.dataset.level;
    const select = document.getElementById("courseSelect");
    if (select) {
      select.value = `${course}-${level}`;
    }
    populateSessions(level);
    document
      .getElementById("enroll-form")
      .scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("enrollName")?.focus({ preventScroll: true });
  });
});

// ---- Manual course dropdown change also updates the session options ----
document.getElementById("courseSelect")?.addEventListener("change", (e) => {
  const level = e.target.value.split("-")[1];
  populateSessions(level);
});

// Prevent selecting disabled options manually
document.getElementById("sessionSelect")?.addEventListener("change", (e) => {
  const selectedOption = e.target.options[e.target.selectedIndex];
  if (selectedOption && selectedOption.disabled) {
    e.target.value = ""; // Reset to default "Select a session"
    alert("This session is currently closed for enrollment.");
  }
});

// ----- supabase setup -----
const SUPABASE_URL = "https://vrpituvomsaovwumjkgp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycGl0dXZvbXNhb3Z3dW1qa2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODMyOTcsImV4cCI6MjA5OTc1OTI5N30.htav8vCkTbpiZK_UyK61SvnZgwyNcoxnUM8qGp_853s";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);


// ---- Generic form submit handler ----
// mapFn turns the raw form fields into the exact column shape each table expects.
function handleFormSubmit(formId, statusId, successMessage, tableName, mapFn) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      form.reportValidity();
      status.textContent = "Please fill in all required fields correctly.";
      status.className = "form-status error";

      // Clear validation error message after 4 seconds
      setTimeout(() => {
        status.textContent = "";
        status.className = "form-status";
      }, 4000);

      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const payload = mapFn(new FormData(form));
    const { error } = await supabaseClient.from(tableName).insert([payload]);

    submitBtn.disabled = false;

    if (error) {
      console.error(error);
      status.textContent =
        "Something went wrong. Please try again or reach out to us directly.";
      status.className = "form-status error";

      // Clear server error message after 4 seconds
      setTimeout(() => {
        status.textContent = "";
        status.className = "form-status";
      }, 4000);

      return;
    }

    // ==========================================
    // META PIXEL CUSTOM EVENT TRACKING STARTS HERE
    // ==========================================
    if (typeof fbq === "function") {
      if (formId === "enrollmentForm") {
        fbq("track", "CompleteRegistration", { content_name: "Course Enrollment" });
      } else if (formId === "contactForm") {
        fbq("track", "Contact", { content_name: "Contact Message" });
      } else if (formId === "consultForm") {
        fbq("track", "Schedule", { content_name: "Consultation Request" });
      }
    }
    // ==========================================

    status.textContent = successMessage;
    status.className = "form-status success";
    form.reset();
    form.classList.remove("was-validated");

    if (formId === "enrollmentForm") {
      const ps = document.getElementById("paymentSummary");
      if (ps) ps.hidden = true;
      const sessionSelect = document.getElementById("sessionSelect");
      sessionSelect.innerHTML =
        '<option value="">Select a course first</option>';
      sessionSelect.disabled = true;
    }

    // Clear success message after 4 seconds
    setTimeout(() => {
      status.textContent = "";
      status.className = "form-status";
    }, 4000);
  });
}

handleFormSubmit(
  "enrollmentForm",
  "enrollStatus",
  "Thanks! Your request is received. Check your email for payment details — your place is confirmed once payment is verified.",
  "enrollments",
  (fd) => {
    const [course, level] = fd.get("courseSelect").split("-");
    return {
      course,
      level,
      session: fd.get("sessionSelect"),
      payment_option: fd.get("paymentOption"),
      amount_due: CAMPAIGN.salePrice,
      amount_paid: 0,
      payment_status: "Pending",
      registration_status: "Pending payment",
      course_start_date: "2026-10-26",
      full_name: fd.get("enrollName"),
      email: fd.get("enrollEmail"),
      phone: fd.get("enrollPhone"),
    };
  },
);

handleFormSubmit(
  "consultForm",
  "consultStatus",
  "Thanks! Your consultation request has been received — we'll confirm shortly.",
  "consultations",
  (fd) => ({
    full_name: fd.get("consultName"),
    email: fd.get("consultEmail"),
    phone: fd.get("consultPhone"),
    consult_date: fd.get("consultDate"),
    service: fd.get("consultService"),
    hours: Number(fd.get("consultHours")),
    payment_method: fd.get("consultPayment"),
  }),
);

handleFormSubmit(
  "contactForm",
  "contactStatus",
  "Message sent successfully.",
  "contact_messages",
  (fd) => ({
    full_name: fd.get("contactName"),
    email: fd.get("contactEmail"),
    message: fd.get("contactMessage"),
  }),
);

// ---- Hero Section Text Slider ----
const heroStatements = [
  "Become a Certified Leader, Manager, Entrepreneur or Sales Expert",
  "In partnership with MYLIFE2LIVE academy, USA to provide globally relevant training and certifications.",
  "We offer high-impact corporate training and strategic workforce development designed to empower leaders and elevate team performance."
];

let heroIndex = 0;
const heroHeading = document.getElementById("heroSub");


function rotateHeroText() {
  if (!heroHeading) return;
  heroHeading.style.transition = "opacity 0.6s ease, transform 0.6s ease";
  heroHeading.style.opacity = 0;
  heroHeading.style.transform = "translateY(8px)";
  setTimeout(() => {
    heroIndex = (heroIndex + 1) % heroStatements.length;
    heroHeading.textContent = heroStatements[heroIndex];
    heroHeading.style.opacity = 0.88;
    heroHeading.style.transform = "none";
  }, 600);
}

setInterval(rotateHeroText, 6000);


// function rotateHeroText() {
//   if (!heroHeading) return;
//   heroHeading.style.transition = "opacity 0.6s ease, transform 0.6s ease";
//   heroHeading.style.opacity = 0;
//   heroHeading.style.transform = "translateY(8px)";
//   heroHeading.classList.add("fade-out");

//   setTimeout(() => {
//     heroIndex = (heroIndex + 1) % heroStatements.length;
//     heroHeading.textContent = heroStatements[heroIndex];

//     // Force browser reflow to trigger transition smooth re-entry
//     // Force the browser to acknowledge the new state
//     // before we remove the class, so the transition actually fires
//     void heroHeading.offsetWidth;  // forces reflow

//     requestAnimationFrame(() => {
//       heroHeading.classList.remove("fade-out");
//     });
//   }, 600);
// }

// setInterval(rotateHeroText, 6000);

