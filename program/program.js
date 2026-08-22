(function () {
  "use strict";
  const data = window.LIFTRPG_PROGRAM_STATUS;
  const app = document.getElementById("app");
  if (!data || !app) return;
  const esc = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  const list = (items) =>
    items?.length
      ? `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
      : "";
  const wave = (item) =>
    `<details class="wave" ${item.state === "in_progress" ? "open" : ""}><summary><span class="wave-number">${esc(item.number)}</span><span class="wave-title">${esc(item.title)}</span><span class="wave-state"><strong>${esc(item.progress)}%</strong>${esc(item.weight)}% of program</span></summary><div class="wave-body"><p>${esc(item.promise)}</p>${list(item.delivered)}${list(item.remaining)}<div class="mini-track" aria-label="${esc(item.progress)} percent complete"><span style="width:${Number(item.progress)}%"></span></div></div></details>`;
  app.innerHTML = `<section class="hero" id="top"><p class="eyebrow">${esc(data.eyebrow)}</p><h1>${esc(data.headline)}</h1><p class="hero-copy">${esc(data.summary)}</p><div class="hero-meta"><strong>${esc(data.current.wave)} · ${esc(data.current.label)}</strong><span>Updated ${esc(new Date(data.updatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }))}</span></div></section><section class="progress-panel" aria-label="Overall program progress"><div class="progress-number">${esc(data.overallProgress)}<span>% through the program</span></div><div class="track"><span style="width:${Number(data.overallProgress)}%"></span></div><p class="progress-caption">Weighted by scope. The waves are intentionally not equal.</p></section><section class="current-card"><div class="current-top"><div><p class="section-label">Right now</p><h2>${esc(data.current.now)}</h2></div><span class="state-pill">In progress · ${esc(data.current.progress)}%</span></div><div class="current-copy"><p><strong>Why this matters</strong>${esc(data.current.why)}</p><p><strong>Exit condition</strong>${esc(data.current.exit)}</p></div></section><section><div class="section-head"><div><p class="section-label">The route</p><h2>Five waves. One proving book.</h2></div><p>Open a wave for its promise, what has landed, and what remains.</p></div><div class="wave-list">${data.waves.map(wave).join("")}</div></section><section><div class="section-head"><div><p class="section-label">Evidence</p><h2>${esc(data.proof.headline)}</h2></div><p>These figures describe the current deterministic witness, not a creative-quality verdict.</p></div><div class="proof-grid">${data.proof.items.map((item) => `<div class="proof-item"><span class="proof-value">${esc(item.value)}</span><span class="proof-label">${esc(item.label)}</span></div>`).join("")}</div></section><section class="milestone"><div><p class="section-label">Next moment that needs you</p><h2>${esc(data.nextMilestone.label)}</h2></div><div class="milestone-copy"><p>${esc(data.nextMilestone.description)}</p><p class="action">${esc(data.nextMilestone.authorAction)}</p></div></section><section class="terms"><div class="section-head"><div><p class="section-label">Plain language</p><h2>Three kinds of proof.</h2></div><p>The system is easier to trust when each role has one job.</p></div><div class="term-grid">${data.terms.map((item) => `<article class="term"><h3>${esc(item.term)}</h3><p class="short">${esc(item.short)}</p><p class="detail">${esc(item.detail)}</p></article>`).join("")}</div></section><section class="log"><div class="section-head"><div><p class="section-label">Milestone log</p><h2>What changed, without the noise.</h2></div><p>Append-only decisions and proof transitions. Newest first.</p></div><div class="log-list">${data.log.map((item) => `<article class="log-entry"><div class="log-date"><span class="status-dot ${esc(item.state)}"></span>${esc(item.date)}</div><div><h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p></div></article>`).join("")}</div></section>`;

  const restoredScroll = Number(sessionStorage.getItem("program-room-scroll"));
  if (Number.isFinite(restoredScroll) && restoredScroll > 0) {
    sessionStorage.removeItem("program-room-scroll");
    requestAnimationFrame(() => window.scrollTo(0, restoredScroll));
  }

  const recordedUpdate = data.updatedAt;
  const checkForMilestone = () => {
    const script = document.createElement("script");
    script.src = `status-data.js?refresh=${Date.now()}`;
    script.onload = () => {
      script.remove();
      if (window.LIFTRPG_PROGRAM_STATUS?.updatedAt !== recordedUpdate) {
        sessionStorage.setItem("program-room-scroll", String(window.scrollY));
        window.location.reload();
      }
    };
    script.onerror = () => script.remove();
    document.head.appendChild(script);
  };

  const refreshTimer = window.setInterval(checkForMilestone, 30_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForMilestone();
  });
  window.addEventListener(
    "pagehide",
    () => window.clearInterval(refreshTimer),
    {
      once: true,
    },
  );
})();
