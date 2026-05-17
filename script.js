(function () {
  const STORAGE_KEY = "gb_lang";
  const SUPPORTED = ["en", "es", "zh", "fr"];
  const dict = window.TRANSLATIONS || {};

  function detectInitialLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
    const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(browser) ? browser : "en";
  }

  function applyLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = "en";
    const strings = dict[lang] || {};
    document.documentElement.setAttribute("lang", lang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (strings[key]) el.textContent = strings[key];
    });

    document.querySelectorAll(".lang-switcher button").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });

    localStorage.setItem(STORAGE_KEY, lang);
  }

  function initLangSwitcher() {
    document.querySelectorAll(".lang-switcher button").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyLang(btn.getAttribute("data-lang"));
      });
    });
  }

  function initRevealOnScroll() {
    const targets = document.querySelectorAll(
      ".section, .hero-text, .hero-photo, .glass-card, .timeline-item"
    );
    targets.forEach((el) => el.classList.add("reveal"));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach((el) => io.observe(el));
  }

  function initMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const inner = document.querySelector(".nav-inner");
    if (!toggle || !inner) return;
    toggle.addEventListener("click", () => inner.classList.toggle("open"));
    inner.querySelectorAll(".nav-links a").forEach((a) =>
      a.addEventListener("click", () => inner.classList.remove("open"))
    );
  }

  function initYear() {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyLang(detectInitialLang());
    initLangSwitcher();
    initRevealOnScroll();
    initMobileNav();
    initYear();
  });
})();
