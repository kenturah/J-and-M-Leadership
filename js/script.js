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
// Tapping a link (including the mobile "Enroll Now" button) closes the menu
navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeNav);
});

// Avoid a stuck-open overlay if the screen is resized/rotated past the mobile breakpoint
window.addEventListener("resize", () => {
  if (window.innerWidth > 950) closeNav();
});

// ---- Session options per level. Edit dates here once confirmed — everything else updates automatically. ----
const SESSIONS_BY_LEVEL = {
  Basic: [
    { value: "Summer", label: "Summer (Jan – Mar)" },
    { value: "Autumn", label: "Autumn (Apr – Jun)" },
    { value: "Winter", label: "Winter (Jul – Sep)" },
    { value: "Spring", label: "Spring (Oct – Dec)" },
  ],
  Advanced: [
    { value: "Session1", label: "First Session (Jan – Jun)" },
    { value: "Session2", label: "Second Session (Jul – Dec)" },
  ],
};

function populateSessions(level) {
  const sessionSelect = document.getElementById("sessionSelect");
  if (!sessionSelect) return;

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
  const level = e.target.value.split("-")[1];
  populateSessions(level);
});

// ----- supabase setup -----
const SUPABASE_URL = "https://jqnhjuxvfvrodymqnnfb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbmhqdXh2ZnZyb2R5bXFubmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzU2MTQsImV4cCI6MjA5OTM1MTYxNH0.zFnapvdoPjzhGb7IQ3_w_vxja4zKdlvRLlVqP05awuQ";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// ----- supabase setup -----
const SUPABASE_URL = "https://jqnhjuxvfvrodymqnnfb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbmhqdXh2ZnZyb2R5bXFubmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzU2MTQsImV4cCI6MjA5OTM1MTYxNH0.zFnapvdoPjzhGb7IQ3_w_vxja4zKdlvRLlVqP05awuQ";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

// ---- Generic form submit handler ----
// mapFn turns the raw form fields into the exact column shape each table expects.
function handleFormSubmit(formId, statusId, successMessage, tableName, mapFn) {
// mapFn turns the raw form fields into the exact column shape each table expects.
function handleFormSubmit(formId, statusId, successMessage, tableName, mapFn) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      form.classList.add("was-validated");
      form.reportValidity();
      status.textContent = "Please fill in all required fields correctly.";
      status.className = "form-status error";
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
      return;
    }

    status.textContent = successMessage;
    status.className = "form-status success";
    form.reset();
    form.classList.remove("was-validated");

    if (formId === "enrollmentForm") {
      const sessionSelect = document.getElementById("sessionSelect");
      sessionSelect.innerHTML =
        '<option value="">Select a course first</option>';
      sessionSelect.disabled = true;
    }
    form.classList.remove("was-validated");

    if (formId === "enrollmentForm") {
      const sessionSelect = document.getElementById("sessionSelect");
      sessionSelect.innerHTML =
        '<option value="">Select a course first</option>';
      sessionSelect.disabled = true;
    }
  });
}

handleFormSubmit(
  "enrollmentForm",
  "enrollStatus",
  "Thanks! Your enrollment request has been received — we'll be in touch shortly.",
  "enrollments",
  (fd) => {
    const [course, level] = fd.get("courseSelect").split("-");
    return {
      course,
      level,
      session: fd.get("sessionSelect"),
      full_name: fd.get("enrollName"),
      email: fd.get("enrollEmail"),
      phone: fd.get("enrollPhone"),
    };
  },
  "enrollments",
  (fd) => {
    const [course, level] = fd.get("courseSelect").split("-");
    return {
      course,
      level,
      session: fd.get("sessionSelect"),
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
    // coach: fd.get("consultCoach"),
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

const heroStatements = [
  "Become a Certified Leader, Manager, Entrepreneur or Sales Expert",
  "In partnership with MYLIFE2LIVE academy to provide globally relevant training and certifications.",
];

let heroIndex = 0;
const heroHeading = document.getElementById("heroHeading");

function rotateHeroText() {
  heroHeading.classList.add("fade-out");

  setTimeout(() => {
    heroIndex = (heroIndex + 1) % heroStatements.length;
    heroHeading.textContent = heroStatements[heroIndex];

    // Force the browser to acknowledge the new state
    // before we remove the class, so the transition actually fires
    void heroHeading.offsetWidth; // forces reflow

    requestAnimationFrame(() => {
      heroHeading.classList.remove("fade-out");
    });
  }, 600);
}

setInterval(rotateHeroText, 4000);

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

const heroStatements = [
  "Become a Certified Leader, Manager, Entrepreneur or Sales Expert",
  "In partnership with MYLIFE2LIVE academy to provide globally relevant training and certifications.",
];

let heroIndex = 0;
const heroHeading = document.getElementById("heroHeading");

function rotateHeroText() {
  heroHeading.classList.add("fade-out");

  setTimeout(() => {
    heroIndex = (heroIndex + 1) % heroStatements.length;
    heroHeading.textContent = heroStatements[heroIndex];

    // Force the browser to acknowledge the new state
    // before we remove the class, so the transition actually fires
    void heroHeading.offsetWidth; // forces reflow

    requestAnimationFrame(() => {
      heroHeading.classList.remove("fade-out");
    });
  }, 600);
}

setInterval(rotateHeroText, 4000);
