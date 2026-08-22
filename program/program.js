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

  const currentWave = data.waves.find((wave) => wave.state === "in_progress");
  const nextMoves = currentWave?.remaining?.slice(0, 3) ?? [];
  const shortLog = data.log.slice(0, 4);
  const stateLabel = {
    complete: "Complete",
    in_progress: "In progress",
    queued: "Queued",
    active: "Active",
    found: "Found",
    investigating: "Investigating",
    waiting: "Waiting",
  };
  const signalTime = (value) =>
    new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

  app.innerHTML = `
    <section class="command-header" id="top">
      <p class="eyebrow">Publishing compiler</p>
      <h1>${esc(data.overallProgress)}% <span>complete.</span></h1>
      <p class="position">${esc(data.current.wave)} is ${esc(data.current.progress)}% complete. ${esc(data.current.now)}</p>
      <div class="meter" aria-label="${esc(data.overallProgress)} percent of the full program complete"><span style="width:${Number(data.overallProgress)}%"></span></div>
    </section>

    <section class="situation" aria-labelledby="situation-title">
      <div>
        <p class="label">Situation</p>
        <h2 id="situation-title">${esc(data.current.situation)}</h2>
        <p>${esc(data.current.why)}</p>
      </div>
      <dl class="fact-list">
        <div><dt>Product risk</dt><dd>${esc(data.current.risk)}</dd></div>
        <div><dt>Active blocker</dt><dd>${esc(data.current.blocker)}</dd></div>
        <div><dt>Author action</dt><dd>None</dd></div>
        <div><dt>Next author checkpoint</dt><dd>${esc(data.nextMilestone.label)}</dd></div>
      </dl>
    </section>

    <section class="current-view" aria-labelledby="current-view-title">
      <div class="current-view-head">
        <p class="label">Current view</p>
        <span class="view-state"><i aria-hidden="true"></i>${esc(stateLabel[data.currentView.state] ?? data.currentView.state)}</span>
      </div>
      <h2 id="current-view-title"><span>${esc(data.currentView.step)}</span> ${esc(data.currentView.title)}</h2>
      <p class="objective">${esc(data.currentView.objective)}</p>
      <ol class="activity-list">
        ${data.currentView.activity
          .map(
            (item) => `
              <li class="${esc(item.state)}">
                <span>${esc(stateLabel[item.state] ?? item.state)}</span>
                <p>${esc(item.text)}</p>
              </li>`,
          )
          .join("")}
      </ol>
      <div class="workstream-head">
        <h3>Live workstream</h3>
        <span>Latest agent signals</span>
      </div>
      <div class="workstream" aria-live="polite">
        ${data.currentView.agents
          .map(
            (agent) => `
              <article class="agent-row ${esc(agent.state)}">
                <div class="agent-identity">
                  <strong>${esc(agent.name)}</strong>
                  <span>${esc(agent.role)}</span>
                </div>
                <p>${esc(agent.activity)}</p>
                <div class="agent-signal">
                  <span><i aria-hidden="true"></i>${esc(stateLabel[agent.state] ?? agent.state)}</span>
                  <time datetime="${esc(agent.lastSignal)}">${esc(signalTime(agent.lastSignal))}</time>
                </div>
              </article>`,
          )
          .join("")}
      </div>
    </section>

    <section class="section" aria-labelledby="route-title">
      <div class="section-head"><h2 id="route-title">Program route</h2><p>Open any wave</p></div>
      <div class="route">
        ${data.waves
          .map(
            (wave) => `
              <details class="route-item ${wave.state === "in_progress" ? "current" : ""}">
                <summary>
                  <span class="number">${esc(wave.number)}</span>
                  <span class="title">${esc(wave.title)}</span>
                  <span class="bar"><span style="width:${Number(wave.progress)}%"></span></span>
                  <span class="percent">${esc(wave.progress)}%</span>
                  <span class="chevron" aria-hidden="true">+</span>
                </summary>
                <ol class="step-list">
                  ${wave.steps
                    .map(
                      (step) => `
                        <li class="${esc(step.state)}">
                          <span class="step-id">${esc(step.id)}</span>
                          <span class="step-title">${esc(step.title)}</span>
                          <span class="step-state">${esc(stateLabel[step.state] ?? step.state)}</span>
                        </li>`,
                    )
                    .join("")}
                </ol>
              </details>`,
          )
          .join("")}
      </div>
    </section>

    <section class="section" aria-labelledby="next-title">
      <div class="section-head"><h2 id="next-title">Next three moves</h2></div>
      <ol class="next-list">${nextMoves.map((move) => `<li>${esc(move)}</li>`).join("")}</ol>
    </section>

    <section class="author-callout">
      <strong>When you are needed</strong>
      <p>${esc(data.nextMilestone.authorAction)}</p>
    </section>

    <section class="section" aria-labelledby="log-title">
      <div class="section-head"><h2 id="log-title">Recent movement</h2><p>Newest first</p></div>
      <div class="log">
        ${shortLog
          .map(
            (item) => `
              <div class="log-row">
                <time datetime="${esc(item.date)}"><span class="signal ${esc(item.state)}"></span> ${esc(item.date.slice(5))}</time>
                <p>${esc(item.title)}</p>
              </div>`,
          )
          .join("")}
      </div>
    </section>

    <p class="glossary"><strong>Canary</strong> tests direction. <strong>Recorder</strong> preserves what happened. <strong>Oracle</strong> proves it independently.</p>
  `;

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
