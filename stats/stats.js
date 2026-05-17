(function () {
  const cfg = window.GB_SUPABASE;
  if (!cfg) { alert("Missing supabase-config.js"); return; }

  const sb = supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const $ = (id) => document.getElementById(id);
  const charts = {};   // active Chart.js instances, keyed by canvas id
  const PALETTE = ["#64ffda", "#a78bfa", "#22d3ee", "#34d399", "#f472b6", "#fbbf24", "#60a5fa", "#fb923c", "#94a3b8"];

  // ---------- Auth ----------
  async function ensureSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
  }

  function showLogin() {
    $("login").hidden = false;
    $("dashboard").hidden = true;
    $("logout").hidden = true;
  }

  function showDashboard() {
    $("login").hidden = true;
    $("dashboard").hidden = false;
    $("logout").hidden = false;
  }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email").value.trim().toLowerCase();
    const msg = $("login-msg");
    msg.className = "login-msg";
    msg.textContent = "Sending magic link…";

    if (email !== cfg.adminEmail.toLowerCase()) {
      msg.className = "login-msg err";
      msg.textContent = "Only the admin email is authorized.";
      return;
    }

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    if (error) {
      msg.className = "login-msg err";
      msg.textContent = "Error: " + error.message;
    } else {
      msg.className = "login-msg ok";
      msg.textContent = "Check your inbox — click the link to sign in.";
    }
  });

  $("logout").addEventListener("click", async () => {
    await sb.auth.signOut();
    showLogin();
  });

  $("range").addEventListener("change", () => loadData());

  // ---------- Data ----------
  function rangeStart() {
    const v = $("range").value;
    if (v === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(v, 10));
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  async function loadData() {
    const since = rangeStart();
    let q = sb.from("visits")
      .select("created_at,path,referrer,lang,viewport_w,country,latitude,longitude,device_type,os_name,browser_name")
      .order("created_at", { ascending: false });
    if (since) q = q.gte("created_at", since);
    const { data, error } = await q.limit(50000);
    if (error) {
      console.error(error);
      alert("Could not load visits: " + error.message);
      return;
    }
    render(data || []);
  }

  // ---------- Rendering ----------
  function setKpis(rows) {
    $("kpi-total").textContent = rows.length.toLocaleString();
    const todayStr = new Date().toISOString().slice(0, 10);
    $("kpi-today").textContent = rows.filter((r) => (r.created_at || "").slice(0, 10) === todayStr).length.toLocaleString();
    $("kpi-countries").textContent = new Set(rows.map((r) => r.country).filter(Boolean)).size;
    $("kpi-langs").textContent = new Set(rows.map((r) => r.lang).filter(Boolean)).size;
  }

  function bucketBy(rows, keyFn) {
    const m = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      if (k == null) continue;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }

  function dailySeries(rows, since) {
    // Fill in days with zero so the line chart doesn't gap.
    const start = since ? new Date(since) : (() => {
      const dates = rows.map((r) => new Date(r.created_at)).sort((a, b) => a - b);
      return dates.length ? dates[0] : new Date();
    })();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(0, 0, 0, 0);

    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d).toISOString().slice(0, 10));
    }
    const counts = Object.fromEntries(days.map((d) => [d, 0]));
    for (const r of rows) {
      const k = (r.created_at || "").slice(0, 10);
      if (k in counts) counts[k] += 1;
    }
    return { labels: days, data: days.map((d) => counts[d]) };
  }

  function drawChart(id, config) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id).getContext("2d"), config);
  }

  function commonDarkOpts(extra = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#a8b2d1", font: { family: "JetBrains Mono", size: 11 } } },
        tooltip: { backgroundColor: "#0a192f", titleColor: "#64ffda", bodyColor: "#ccd6f6", borderColor: "#233554", borderWidth: 1 },
      },
      scales: {
        x: { ticks: { color: "#8892b0", font: { family: "JetBrains Mono", size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
        y: { ticks: { color: "#8892b0", font: { family: "JetBrains Mono", size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" }, beginAtZero: true },
      },
      ...extra,
    };
  }

  function renderList(elId, entries, formatter = (k) => k) {
    const el = $(elId);
    el.innerHTML = "";
    if (!entries.length) {
      el.innerHTML = '<li class="empty">No data yet</li>';
      return;
    }
    for (const [k, v] of entries.slice(0, 8)) {
      const li = document.createElement("li");
      li.innerHTML = `<span class="label">${escapeHtml(formatter(k))}</span><span class="count">${v}</span>`;
      el.appendChild(li);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- Map ----------
  let leafletMap = null;
  let markerCluster = null;

  function renderMap(rows) {
    if (typeof L === "undefined") return;     // Leaflet not loaded yet, silently skip

    if (!leafletMap) {
      leafletMap = L.map("map", {
        worldCopyJump: true,
        zoomControl: true,
        attributionControl: true,
        minZoom: 1,
      }).setView([20, 0], 2);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(leafletMap);

      markerCluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 40,
      });
      leafletMap.addLayer(markerCluster);

      // Fix gray-tile bug when the panel appears after layout
      setTimeout(() => leafletMap.invalidateSize(), 200);
    }

    markerCluster.clearLayers();

    const points = [];
    for (const r of rows) {
      if (typeof r.latitude !== "number" || typeof r.longitude !== "number") continue;
      const m = L.circleMarker([r.latitude, r.longitude], {
        radius: 6,
        fillColor: "#64ffda",
        color: "#64ffda",
        weight: 1,
        fillOpacity: 0.65,
      });
      const tip = [r.country, new Date(r.created_at).toLocaleString()].filter(Boolean).join(" · ");
      if (tip) m.bindTooltip(tip);
      markerCluster.addLayer(m);
      points.push([r.latitude, r.longitude]);
    }
    if (points.length) {
      try { leafletMap.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 5 }); } catch (_) {}
    }
  }

  function render(rows) {
    setKpis(rows);
    const since = rangeStart();

    // Daily line
    const daily = dailySeries(rows, since);
    drawChart("chart-daily", {
      type: "line",
      data: {
        labels: daily.labels,
        datasets: [{
          label: "Visits",
          data: daily.data,
          borderColor: "#64ffda",
          backgroundColor: "rgba(100, 255, 218, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        }],
      },
      options: commonDarkOpts(),
    });

    // Countries (top 8)
    const countries = bucketBy(rows, (r) => r.country || "Unknown").slice(0, 8);
    drawChart("chart-countries", {
      type: "bar",
      data: {
        labels: countries.map((e) => e[0]),
        datasets: [{
          label: "Visits",
          data: countries.map((e) => e[1]),
          backgroundColor: PALETTE,
          borderRadius: 4,
        }],
      },
      options: commonDarkOpts({
        indexAxis: "y",
        plugins: { legend: { display: false } },
      }),
    });

    // Languages
    const langs = bucketBy(rows, (r) => r.lang || "—");
    drawChart("chart-langs", {
      type: "doughnut",
      data: {
        labels: langs.map((e) => e[0]),
        datasets: [{ data: langs.map((e) => e[1]), backgroundColor: PALETTE, borderColor: "#0a192f", borderWidth: 2 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: "#a8b2d1", font: { family: "JetBrains Mono", size: 11 } } } },
      },
    });

    // Devices: prefer UAParser's device_type, fall back to viewport width.
    const devices = bucketBy(rows, (r) => {
      if (r.device_type) {
        const t = r.device_type.toLowerCase();
        return t.charAt(0).toUpperCase() + t.slice(1); // Mobile / Tablet / Desktop
      }
      if (r.viewport_w == null) return "Unknown";
      return r.viewport_w < 700 ? "Mobile" : r.viewport_w < 1100 ? "Tablet" : "Desktop";
    });
    drawChart("chart-devices", {
      type: "doughnut",
      data: {
        labels: devices.map((e) => e[0]),
        datasets: [{ data: devices.map((e) => e[1]), backgroundColor: ["#22d3ee", "#a78bfa", "#34d399", "#94a3b8"], borderColor: "#0a192f", borderWidth: 2 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: "#a8b2d1", font: { family: "JetBrains Mono", size: 11 } } } },
      },
    });

    // OS breakdown (iOS / Android / Windows / macOS / Linux ...)
    const oses = bucketBy(rows, (r) => r.os_name || "Unknown").slice(0, 8);
    drawChart("chart-os", {
      type: "bar",
      data: {
        labels: oses.map((e) => e[0]),
        datasets: [{
          label: "Visits",
          data: oses.map((e) => e[1]),
          backgroundColor: PALETTE,
          borderRadius: 4,
        }],
      },
      options: commonDarkOpts({
        indexAxis: "y",
        plugins: { legend: { display: false } },
      }),
    });

    // Browsers
    const browsers = bucketBy(rows, (r) => r.browser_name || "Unknown").slice(0, 8);
    drawChart("chart-browser", {
      type: "doughnut",
      data: {
        labels: browsers.map((e) => e[0]),
        datasets: [{ data: browsers.map((e) => e[1]), backgroundColor: PALETTE, borderColor: "#0a192f", borderWidth: 2 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: "#a8b2d1", font: { family: "JetBrains Mono", size: 11 } } } },
      },
    });

    // Map
    renderMap(rows);

    // Top paths
    renderList("list-paths", bucketBy(rows, (r) => r.path || "/"));

    // Top referrers (strip protocol, group by host, ignore self)
    const selfHost = location.hostname;
    const refs = bucketBy(rows, (r) => {
      if (!r.referrer) return "(direct)";
      try {
        const u = new URL(r.referrer);
        if (u.hostname === selfHost) return null;
        return u.hostname;
      } catch (_) { return null; }
    });
    renderList("list-referrers", refs);
  }

  // ---------- Boot ----------
  async function init() {
    const session = await ensureSession();
    if (session && session.user && (session.user.email || "").toLowerCase() === cfg.adminEmail.toLowerCase()) {
      showDashboard();
      await loadData();
    } else {
      // If a non-admin somehow has a session, sign them out so they don't see UI.
      if (session) await sb.auth.signOut();
      showLogin();
    }
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session && (session.user.email || "").toLowerCase() === cfg.adminEmail.toLowerCase()) {
      showDashboard();
      loadData();
    } else if (event === "SIGNED_OUT") {
      showLogin();
    }
  });

  init();
})();
