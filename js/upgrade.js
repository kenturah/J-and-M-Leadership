// J&M UPGRADE LAYER — scroll reveals, header state, progress bar. Safe to delete (site works without it).
(function () {
  // Safety: the offer pill must live inside .hero-box (first child), or it can sit beside the headline
  const pillEl = document.querySelector(".hero-offer"), boxEl = document.querySelector(".hero-box");
  if (pillEl && boxEl && pillEl.parentElement !== boxEl) boxEl.insertBefore(pillEl, boxEl.firstChild);

 const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 
  // header + progress bar
  const header = document.querySelector("header");
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      header && header.classList.toggle("is-scrolled", y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // highlight current section in nav
  const links = [...document.querySelectorAll(".nav-links a[href^='#']:not(.btn)")];
  const secs = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window && secs.length) {
    const spy = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach((s) => spy.observe(s));
  }

  if (reduce || !("IntersectionObserver" in window)) return;

  // scroll reveals
  document.documentElement.classList.add("js-reveal");
  const add = (sel, dir, stagger) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add("reveal", dir);
      if (stagger) el.style.setProperty("--d", i * stagger + "s");
    });
  };
  add(".title", "from-up");
  add(".section-intro", "from-up");
  add(".about-lead", "from-left");
  add(".pillar", "from-right", 0.15);
  add(".promo-banner", "zoom");
  add(".course-card", "from-up", 0.12);
  add(".enroll-form", "zoom");
  add("#events .card, #events article", "from-up", 0.1);
  add("#consult .card", "zoom");
  add(".testimonial-card", "from-up", 0.12);
  add("#contact .card", "zoom");

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add("in");
      io.unobserve(el);
      // once played, drop reveal classes so normal hover transforms work again
      setTimeout(() => el.classList.remove("reveal", "from-up", "from-left", "from-right", "zoom"), 1400 + (parseFloat(el.style.getPropertyValue("--d")) || 0) * 1000);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
