(function () {
  const STORAGE_KEY = "gb_lang";
  const SUPPORTED = ["en", "es", "zh", "fr"];
  const dict = window.TRANSLATIONS || {};

  // ---------- i18n ----------
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
      btn.addEventListener("click", () => applyLang(btn.getAttribute("data-lang")));
    });
  }

  // ---------- Mobile menu ----------
  function initMobileMenu() {
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".mobile-menu");
    if (!toggle || !menu) return;

    function close() {
      toggle.classList.remove("open");
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
    function open() {
      toggle.classList.add("open");
      menu.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    toggle.addEventListener("click", () => {
      menu.classList.contains("open") ? close() : open();
    });
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("open")) close();
    });
  }

  // ---------- Nav shrink on scroll ----------
  function initNavScroll() {
    const nav = document.querySelector(".nav");
    if (!nav) return;
    let lastY = window.scrollY;
    function update() {
      const y = window.scrollY;
      nav.classList.toggle("scrolled", y > 50);
      lastY = y;
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  // ---------- Experience tabs ----------
  function initTabs() {
    const tabs = document.querySelectorAll(".tab-list .tab");
    const panels = document.querySelectorAll(".tab-panels .tab-panel");
    const indicator = document.querySelector(".tab-indicator");
    if (!tabs.length || !panels.length || !indicator) return;

    function setIndicator(idx) {
      const isMobile = window.matchMedia("(max-width: 900px)").matches;
      const size = isMobile
        ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tab-width"))
        : parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tab-height"));
      if (isMobile) {
        indicator.style.transform = `translateX(${size * idx}px)`;
      } else {
        indicator.style.transform = `translateY(${size * idx}px)`;
      }
    }

    function activate(name, idx) {
      tabs.forEach((t) => {
        const on = t.getAttribute("data-tab") === name;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      panels.forEach((p) => {
        p.classList.toggle("active", p.getAttribute("data-panel") === name);
      });
      setIndicator(idx);
    }

    tabs.forEach((t, idx) => {
      t.addEventListener("click", () => activate(t.getAttribute("data-tab"), idx));
    });

    // Initial position + handle resize
    activate(tabs[0].getAttribute("data-tab"), 0);
    window.addEventListener("resize", () => {
      const active = document.querySelector(".tab.active");
      if (!active) return;
      const idx = Array.from(tabs).indexOf(active);
      setIndicator(idx);
    });
  }

  // ---------- Reveal on scroll ----------
  function initReveal() {
    const targets = document.querySelectorAll(
      ".section, .hero-eyebrow, .hero-name, .hero-tagline, .hero-bio, .hero .big-btn"
    );
    targets.forEach((el) => el.classList.add("reveal"));

    // Hero reveals slightly staggered on load
    document.querySelectorAll(".hero .reveal").forEach((el, i) => {
      el.style.transitionDelay = `${i * 90}ms`;
      setTimeout(() => el.classList.add("visible"), 80);
    });

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
    document.querySelectorAll(".section.reveal").forEach((el) => io.observe(el));
  }

  // ---------- Visit tracker ----------
  // Bots that DO execute JS but identify themselves in the UA string.
  // Plain Googlebot etc. don't run JS so they never reach here.
  const BOT_RE = /bot|crawl|spider|preview|monitor|headless|playwright|puppeteer|lighthouse|pagespeed|gptbot|chatgpt|claude|anthropic|openai/i;

  function parseUA() {
    if (typeof UAParser === "undefined") return {};
    try {
      const r = new UAParser().getResult();
      return {
        device_type:     r.device && r.device.type ? r.device.type : "desktop",
        os_name:         r.os && r.os.name ? r.os.name : null,
        os_version:      r.os && r.os.version ? r.os.version : null,
        browser_name:    r.browser && r.browser.name ? r.browser.name : null,
        browser_version: r.browser && r.browser.version ? r.browser.version : null,
      };
    } catch (_) {
      return {};
    }
  }

  async function trackVisit() {
    const cfg = window.GB_SUPABASE;
    if (!cfg) return;

    const host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "") return;
    if (location.pathname.startsWith("/stats")) return;
    if (sessionStorage.getItem("gb_tracked")) return;

    const ua = navigator.userAgent || "";
    if (BOT_RE.test(ua)) return;             // silent drop for JS-running bots
    if (navigator.webdriver) return;          // headless automation flag

    sessionStorage.setItem("gb_tracked", "1");

    // Geo + parsed UA
    let country = null, latitude = null, longitude = null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1800);
      const r = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) {
        const j = await r.json();
        country = j.country_code || null;
        if (typeof j.latitude === "number")  latitude  = j.latitude;
        if (typeof j.longitude === "number") longitude = j.longitude;
      }
    } catch (_) { /* offline / blocked / quota — fine, stays null */ }

    const uaInfo = parseUA();

    try {
      await fetch(`${cfg.url}/rest/v1/visits`, {
        method: "POST",
        headers: {
          apikey: cfg.publishableKey,
          Authorization: `Bearer ${cfg.publishableKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          path: location.pathname || "/",
          referrer: document.referrer || null,
          lang: document.documentElement.lang || null,
          viewport_w: window.innerWidth || null,
          viewport_h: window.innerHeight || null,
          user_agent: ua.slice(0, 250),
          country,
          latitude,
          longitude,
          ...uaInfo,
        }),
      });
    } catch (_) { /* tracker must never break the page */ }
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyLang(detectInitialLang());
    initLangSwitcher();
    initMobileMenu();
    initNavScroll();
    initTabs();
    initReveal();
    // Fire tracker after the page is interactive — don't block render.
    if ("requestIdleCallback" in window) {
      requestIdleCallback(trackVisit, { timeout: 2000 });
    } else {
      setTimeout(trackVisit, 800);
    }
  });
})();
