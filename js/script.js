// function generateStudent() {
//   let name = document.getElementById("fullname").value;
//   if (name === "") {
//     alert("Enter full name");
//     return;
//   }
//   let username =
//     name.toLowerCase().replace(/\s/g, "") + Math.floor(Math.random() * 100);
//   let id = "JML" + Math.floor(10000 + Math.random() * 90000);

//   document.getElementById("studentInfo").innerHTML =
//     "Registered Successfully! Username: <strong>" +
//     username +
//     "</strong> | Student ID: <strong>" +
//     id +
//     "</strong>";
// }

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
      .map((o) => `<option value="${o.value}">${o.label}</option>`)
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
  const level = e.target.value.split("-")[1]; // "Leadership-Basic" -> "Basic"
  populateSessions(level);
});

// ---- Generic form submit handler ----
// Swap the body of this function for a real API call (e.g. fetch('/api/enroll', {...}))
// when the backend is ready. For now it validates and shows a status message.
function handleFormSubmit(formId, statusId, successMessage) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      status.textContent = "Please fill in all required fields correctly.";
      status.className = "form-status error";
      return;
    }

    // TODO: replace with a real submission (fetch/AJAX to your backend or a service like Formspree)
    status.textContent = successMessage;
    status.className = "form-status success";
    form.reset();
  });
}

handleFormSubmit(
  "enrollmentForm",
  "enrollStatus",
  "Thanks! Your enrollment request has been received — we'll be in touch shortly.",
);
handleFormSubmit(
  "consultForm",
  "consultStatus",
  "Thanks! Your consultation request has been received — we'll confirm shortly.",
);
handleFormSubmit("contactForm", "contactStatus", "Message sent successfully.");
