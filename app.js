// Picsart Pulse - client demo SPA
const S = { brand: "coca-cola", brands: {}, step: 0, trends: [], trend: null, campaign: null, asset: null, live: false };
const STEPS = ["Overview", "Trends", "Score", "Campaign", "Launch", "Results"];
const $ = (s, r = document) => r.querySelector(s);
const view = $("#view");
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : "" + n;
function resolveBundle(p){var s=p.split("?");var path=s[0];var q=Object.fromEntries(new URLSearchParams(s[1]||""));var B=window.PULSE_BUNDLE||{};
if(path==="/api/config")return B.config;
if(path==="/api/trends")return {brand:q.brand,trends:(B.trends||{})[q.brand]||[]};
if(path==="/api/campaign"){var c=((B.campaigns||{})[q.brand]||{})[q.trend]||{};return {brand:q.brand,trend:q.trend,campaign:c.campaign||null,asset:c.asset||null,gen_url:c.gen_url||null};}
if(path==="/api/creators")return ((B.creators||{})[q.brand]||{})[q.trend]||{creators:[],projected_reach:0,creator_count:0,payout_model:""};
return {};}
const api = (p) => Promise.resolve(resolveBundle(p));

function toast(msg, err) {
  const t = $("#toast"); t.innerHTML = msg; t.className = "toast show" + (err ? " err" : "");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.className = "toast", 3600);
}
function setBrandColor() {
  // The client's color is shown only as a small brand dot, not the whole UI.
  const a = (S.brands[S.brand] || {}).accent || "#F40009";
  document.documentElement.style.setProperty("--brand", a);
}
function avatarColor(seed) {
  const c = ["#F40009", "#6C5CE7", "#00B894", "#0984E3", "#E17055", "#E84393", "#FDCB6E", "#00CEC9"];
  let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return c[h % c.length];
}

// ---------- chrome ----------
function renderStepper() {
  $("#stepper").innerHTML = STEPS.map((s, i) => {
    const reachable = i <= 1 || S.trend;
    const cls = i === S.step ? "active" : i < S.step ? "done" : (reachable ? "" : "locked");
    const cur = i === S.step ? ' aria-current="step"' : "";
    return `<button class="step ${cls}" data-i="${i}"${cur}>
      <span class="n" aria-hidden="true">${i + 1}</span> ${s}</button>`;
  }).join("");
  $("#stepper").querySelectorAll(".step").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (i <= 1 || S.trend) go(i);
    else toast("Pick a trend first to open this step.");
  });
}
function go(i) { S.step = i; renderStepper(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }

// ---------- count-up ----------
const REDUCE_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function countUp(el, to, suffix = "", dur = 900) {
  if (REDUCE_MOTION) { el.textContent = (to >= 1e3 ? fmt(to) : to) + suffix; return; }
  const t0 = performance.now();
  (function tick(t) {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = (to >= 1e3 ? fmt(Math.round(to * e)) : Math.round(to * e)) + suffix;
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}

// ---------- loading + error helpers ----------
function skeletonRadar(n = 6) {
  const w = ["55%", "82%", "92%", "70%"];
  return `<div class="skel-grid">${Array.from({ length: n }).map((_, i) =>
    `<div class="skel" style="--i:${Math.min(i, 8)}">${w.map(x => `<div class="line" style="width:${x}"></div>`).join("")}<div class="line" style="width:40%;margin-top:30px"></div></div>`).join("")}</div>`;
}
function errorView(msg, onRetry) {
  view.innerHTML = `<div class="errbox"><h3>Couldn't load that</h3><p>${msg}</p><button class="cta" id="retryBtn">Try again</button></div>`;
  $("#retryBtn").onclick = onRetry;
}

// ---------- steps ----------
async function render() {
  if (S.step === 0) return renderOverview();
  if (S.step === 1) return renderTrends();
  if (S.step === 2) return renderScore();
  if (S.step === 3) return renderCampaign();
  if (S.step === 4) return renderCreators();
  if (S.step === 5) return renderResults();
}

async function renderOverview() {
  const b = S.brands[S.brand];
  let samples = [];
  try { const sr = await api(`/api/trends?brand=${S.brand}`); samples = sr.trends.filter(t => t.gen_url).slice(0, 5).map(t => t.gen_url); } catch (e) {}
  const I = {
    trends: '<path d="M5 19V11M12 19V5M19 19V14" stroke-linecap="round"/>',
    score: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/>',
    spark: '<path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7z" stroke-linejoin="round"/>',
    launch: '<circle cx="12" cy="12" r="2.4"/><path d="M6.4 6.4a8 8 0 000 11.2M17.6 6.4a8 8 0 010 11.2" stroke-linecap="round"/>',
    chart: '<path d="M4 18h16M7 15l3.4-4 3 2.4L19 7" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const steps = [
    ["#5650DE", I.trends, "Pick a client", `Choose the client you are pitching or running. Right now: ${b.name}.`],
    ["#7C5CF0", I.score, "Find trends", `See this week's live trends, scored for that client.`],
    ["#0FA3A3", I.spark, "Build the campaign", `Turn the top trend into a brief and a generated asset.`],
    ["#E0930C", I.launch, "Launch", `Launch across channels through real creators who post to their own audiences.`],
    ["#1FA45C", I.chart, "Show results", `Walk in with reach, cost, and a campaign already live.`],
  ];
  view.innerHTML = `
    <h1 class="h1" style="max-width:30ch;font-size:clamp(30px,4.4vw,46px)">Custom trend detection to automated content and launch.</h1>
    <p class="lead">Pick a client, find the trends that fit them, and walk in with a finished, on-trend campaign.</p>
    <div class="flow">
      ${steps.map(s => `<div class="flow-step" style="--c:${s[0]}"><div class="badge"><svg viewBox="0 0 24 24" aria-hidden="true">${s[1]}</svg></div><h4>${s[2]}</h4><p>${s[3]}</p></div>`).join("")}
    </div>
    ${samples.length ? `<div class="section-head"><h2>What it produces</h2><span class="hint">real AI-generated assets</span></div>
    <div class="ov-samples">${samples.map(u => `<div class="ov-sample"><img src="${u}" alt="" loading="lazy" onload="this.classList.add('in')"></div>`).join("")}</div>` : ""}
    <div class="ov-foot">
      <p class="ov-line">From identifying a trend to a finished campaign in <b>under 2 hours</b>, often <b>15 minutes</b>.</p>
      <button class="cta" id="startBtn">Find trends for ${b.name}</button>
    </div>`;
  $("#startBtn").onclick = () => go(1);
}

async function renderTrends() {
  const b = S.brands[S.brand];
  view.innerHTML = `<h1 class="h1">Trends for ${b.name}</h1>
    <div class="section-head"><h2>This week</h2><span class="hint">scoring trends</span></div>
    ${skeletonRadar()}`;
  let r;
  try { r = await api(`/api/trends?brand=${S.brand}`); }
  catch (e) { return errorView("Couldn't reach the trend engine. Make sure the server is running, then try again.", renderTrends); }
  S.trends = r.trends || [];
  const acts = S.trends.filter(t => t.recommendation === "ACT").length;
  view.innerHTML = `
    <h1 class="h1">Trends for ${b.name}</h1>
    <p class="lead">This week's live trends, scored for fit with ${b.name}. ${acts} are worth taking into the pitch. Pick one to build the campaign.</p>
    <div class="grid" id="grid"></div>`;
  const g = $("#grid");
  const GLABEL = { ACT: "Act on these", WATCH: "Watch", SKIP: "Skip" };
  let lastRec = null;
  S.trends.forEach((t, i) => {
    if (t.recommendation !== lastRec) {
      lastRec = t.recommendation;
      const n = S.trends.filter(x => x.recommendation === lastRec).length;
      const lab = document.createElement("div");
      lab.className = "grouplabel " + lastRec;
      lab.innerHTML = `<span class="dot" aria-hidden="true"></span>${GLABEL[lastRec]} <span class="ct">${n}</span><span class="ln"></span>`;
      g.appendChild(lab);
    }
    const el = document.createElement("button");
    el.type = "button";
    el.style.setProperty("--i", Math.min(i, 8));
    el.className = "tcard" + (t.recommendation === "SKIP" ? " muted" : "");
    el.setAttribute("aria-label", `${t.name}, fit score ${t.total} of 100, ${t.recommendation}. Open.`);
    const img = t.gen_url
      ? `<div class="tcard-img"><img src="${t.gen_url}" alt="" loading="lazy" onload="this.classList.add('in')"><span class="pill ${t.recommendation} tcard-pill">${t.recommendation}</span></div>`
      : "";
    el.innerHTML = `
      ${img}
      <div class="tcard-body">
        <h3>${t.name}</h3>
        <div class="plats">${t.platforms.join(", ")}. ${t.emerged}.</div>
        ${t.gen_url ? "" : `<div class="sum">${t.summary}</div>`}
        <div class="dataline">${t.signal.views_30d} views, ${t.signal.outlier} outlier, ${t.signal.growth}</div>
        <div class="tcard-foot">
          <div class="score-num"><b data-to="${t.total}">0</b><span>/100 fit</span></div>
          ${t.gen_url ? "" : `<span class="pill ${t.recommendation}">${t.recommendation}</span>`}
        </div>
      </div>`;
    el.onclick = () => pickTrend(t.id);
    g.appendChild(el);
    countUp(el.querySelector("[data-to]"), t.total, "", 700 + i * 40);
  });
}

async function pickTrend(id) {
  S.trend = S.trends.find(t => t.id === id);
  try {
    const r = await api(`/api/campaign?brand=${S.brand}&trend=${id}`);
    S.campaign = r.campaign; S.asset = r.asset; S.genUrl = r.gen_url;
  } catch (e) {
    S.campaign = null; S.asset = null; S.genUrl = null;
    toast("Couldn't load that campaign brief. Showing the score only.", true);
  }
  go(2);
}

function renderScore() {
  const t = S.trend, b = S.brands[S.brand];
  const hasBrief = !!S.campaign;
  const DIMS = [["fit", "Brand fit", "30%"], ["velocity", "Growth", "25%"], ["audience", "Audience", "20%"], ["feasibility", "Can we make it", "15%"], ["timing", "Timing", "10%"]];
  view.innerHTML = `
    <h1 class="h1">${t.name}</h1>
    <p class="lead">How this trend scores for ${b.name}. We act only when the score clears the bar, so there is no wasted spend.</p>
    <div class="split" style="margin-top:24px">
      <div class="panel">
        <h2>Score breakdown</h2>
        <div id="dims"></div>
        <p class="formula">Weighted: brand fit 30%, growth 25%, audience 20%, feasibility 15%, timing 10%.</p>
      </div>
      <div>
        ${S.genUrl ? `<div class="asset-frame asset-tall"><img src="${S.genUrl}" alt="Generated asset for ${t.name}" onload="this.classList.add('in')"></div>` : ""}
        <div class="totalbox">
          <div><div class="big" id="bigScore">0</div><div class="lbl">out of 100</div></div>
          <span class="pill ${t.recommendation}">${t.recommendation}</span>
        </div>
        <div class="gate">
          <div class="g-top">Brand safety check</div>
          <p><b>${t.replicability}/10.</b> ${t.replicability_note}</p>
        </div>
        <div class="fitnote"><span class="q">Why it fits ${b.name}:</span> ${t.fit_note}</div>
        <div class="cta-row">
          ${hasBrief
            ? `<button class="cta" id="toCampaign">Build this campaign</button>`
            : `<button class="cta" id="toCampaign" disabled aria-disabled="true">No brief for this ${t.recommendation} trend</button>`}
          <button class="cta ghost" id="backTrends">Back to trends</button>
        </div>
        ${hasBrief ? "" : `<p class="why" style="margin-top:11px">In this demo Pulse pre-builds full briefs for the ACT trends only. ${t.name} is ${t.recommendation}.</p>`}
      </div>
    </div>`;
  const dims = $("#dims");
  DIMS.forEach(([k, label, weight], i) => {
    const v = t.scores[k], why = (t.rationales || {})[k] || "";
    const d = document.createElement("div"); d.className = "dim";
    d.innerHTML = `<div class="dim-top"><span class="name">${label} <span>${weight}</span></span>
      <span class="val">${v}/10</span></div><div class="bar"><i></i></div><div class="why">${why}</div>`;
    dims.appendChild(d);
    setTimeout(() => d.querySelector("i").style.transform = `scaleX(${v / 10})`, 120 + i * 110);
  });
  countUp($("#bigScore"), t.total, "", 1000);
  if (hasBrief) $("#toCampaign").onclick = () => go(3);
  $("#backTrends").onclick = () => go(1);
}

function renderCampaign() {
  const c = S.campaign, a = S.asset, b = S.brands[S.brand];
  if (!c) {
    view.innerHTML = `<h1 class="h1">No brief for this trend</h1>
    <p class="lead">This ${S.trend.recommendation} trend has no pre-built brief in the demo. Pick an ACT trend on the trends page.</p>
    <div class="cta-row"><button class="cta ghost" onclick="go(1)">Back to trends</button></div>`; return;
  }
  view.innerHTML = `
    <h1 class="h1">${c.concept}</h1>
    <p class="lead">${b.name}. ${c.format}. Generate the hero asset live, then launch it.</p>
    <div class="create" style="margin-top:24px">
      <div>
        <div class="phone">
          <div class="ph-badge" id="phBadge">${S.genUrl ? `Generated for ${b.name}` : `Generate a ${b.name} asset`}</div>
          <div class="ph-media" id="phMedia">${S.genUrl ? `<img src="${S.genUrl}" alt="Generated ${b.name} asset for ${c.concept}">`
            : (a ? `<video src="${a.url}#t=0.1" autoplay muted loop playsinline aria-hidden="true"></video>` : "")}</div>
          <div class="ph-cap">${c.caption}</div>
        </div>
        <p class="gen-note" id="genNote">${S.genUrl ? "Real asset, generated by the engine." : "Reference motion. Generate to produce the real asset."}</p>
        <div class="cta-row" style="margin-top:14px">
          <button class="cta ghost" id="genBtn">${S.genUrl ? "Regenerate" : "Generate the asset"}</button>
        </div>
      </div>
      <div class="brief">
        <h2>The idea</h2>
        <p class="idea">${c.big_idea}</p>
        <div class="briefcheck">Brief check: hook, on brand, on format, brand safe. All clear.</div>
        <div class="section-head" style="margin:20px 0 8px"><h2 style="font-size:15px">Hooks</h2></div>
        <div class="hooks">${c.hooks.map((h, i) => `<div class="hook"><span class="hn">${i + 1}</span>${h}</div>`).join("")}</div>
        <div class="section-head" style="margin:22px 0 4px"><h2 style="font-size:15px">Shot list</h2></div>
        ${c.shotlist.map((s, i) => `<div class="shot"><span class="sn">${i + 1}</span>${s}</div>`).join("")}
        <div class="kv" style="margin-top:18px">
          <span class="k">Caption</span><span class="v">${c.caption}</span>
          <span class="k">Music</span><span class="v">${c.music}</span>
          <span class="k">Creator brief</span><span class="v">${c.creator_brief}</span>
        </div>
        <div class="tags">${c.hashtags.map(h => `<span class="tag">${h}</span>`).join("")}</div>
        <div class="cta-row">
          <button class="cta" id="toLaunch">Launch in channels</button>
        </div>
      </div>
    </div>`;
  $("#toLaunch").onclick = () => go(4);
  $("#genBtn").onclick = async () => {
    const btn = $("#genBtn"); btn.innerHTML = `<span class="spin"></span> Generating`; btn.disabled = true;
    const product = (b.product || b.name);
    let r;
    try {
      r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, concept: c.concept, trend_name: S.trend.name, label: c.shotlist[0] }) }).then(x => x.json());
    } catch (e) { btn.textContent = "Generate the asset"; btn.disabled = false; return toast("Couldn't reach the engine.", true); }
    btn.disabled = false; btn.textContent = "Regenerate";
    if (!r.ok) return toast("Generation failed: " + r.error, true);
    $("#phMedia").innerHTML = `<img src="${r.url}" alt="Generated ${b.name} asset for ${c.concept}">`;
    $("#phBadge").textContent = `Generated for ${b.name}${r.cached ? " (cached)" : ""}`;
    $("#genNote").textContent = r.cached ? "Served from cache. No new generation." : "One image, generated live just now.";
    toast(`<b>Asset generated for ${b.name}.</b> ${r.cached ? "Cached, no credits used." : "Live, one image."}`);
  };
}

async function renderCreators() {
  const b = S.brands[S.brand];
  view.innerHTML = `<h1 class="h1">Launch across channels</h1>
    <div class="loading">Matching creators and channels</div>`;
  let r;
  try { r = await api(`/api/creators?brand=${S.brand}&trend=${S.trend.id}`); }
  catch (e) { return errorView("Couldn't load the creator roster. Try again in a moment.", renderCreators); }
  const channels = [...new Set(r.creators.map(c => c.platform))];
  view.innerHTML = `
    <h1 class="h1">Launch across channels</h1>
    <p class="lead">The campaign launches through Picsart Earn creators who post to their own audiences, so it reads as real content, not an ad. You stay in front of ${b.name}.</p>
    <div class="channels">${channels.map(ch => `<span class="chan"><span class="cdot" aria-hidden="true"></span>${ch}</span>`).join("")}</div>
    <div class="reach-hero" style="margin-top:20px">
      ${S.genUrl ? `<div class="reach-thumb"><img src="${S.genUrl}" alt="" onload="this.classList.add('in')"></div>` : ""}
      <div><div class="num" id="reach">0</div><div class="lbl">Projected reach, first wave</div></div>
      <div class="cap">${r.creator_count} matched creators across ${channels.join(", ")}. You pay per post.</div>
    </div>
    <p class="meta-line">Creators get paid to make content. No follower minimums, no gatekeeping. Built on Picsart Earn.</p>
    <div class="section-head"><h2>Matched creators</h2><span class="hint">ranked by fit and engagement</span></div>
    <div class="croster">
      ${r.creators.map(c => `
        <div class="ccard">
          <div class="av" style="background:${avatarColor(c.handle)}">${c.name.split(" ").map(x => x[0]).join("")}</div>
          <div class="info"><div class="hd"><b>${c.handle}</b> <span class="tier">${c.tier}</span></div>
            <div class="niche">${c.niche}. ${c.platform}, ${c.region}.</div></div>
          <div class="stats">
            <div><b>${fmt(c.followers)}</b>followers</div>
            <div><b>${fmt(c.avg_views)}</b>avg views</div>
            <div><b>${c.engagement}</b>engagement</div>
          </div>
        </div>`).join("")}
    </div>
    <div class="cta-row"><button class="cta" id="toResults">See the results</button></div>`;
  countUp($("#reach"), r.projected_reach, "", 1300);
  $("#toResults").onclick = () => go(5);
}

function renderResults() {
  const t = S.trend, b = S.brands[S.brand];
  const agency = S.agency || "your agency";
  view.innerHTML = `
    <div class="head-row">
      <div>
        <h1 class="h1">Results you can track</h1>
        <p class="lead">Once the campaign is live, every post produces real, measurable performance. Below is what a launch looks like, and exactly how we measure it.</p>
        <div class="example-tag">Example results, not live data</div>
      </div>
      ${S.genUrl ? `<div class="head-thumb"><img src="${S.genUrl}" alt="" onload="this.classList.add('in')"></div>` : ""}
    </div>` + `
    <div class="metricrow" style="margin-top:12px">
      <div class="m"><div class="mv" data-to="1400000">0</div><div class="ml">Views, first week</div><div class="md">across all creator posts</div></div>
      <div class="m"><div class="mv" data-to="86" data-suf="K">0</div><div class="ml">Engagements</div><div class="md">likes, comments, shares, saves</div></div>
      <div class="m"><div class="mv" data-to="412" data-suf="K">0</div><div class="ml">Top post</div><div class="md">best performing creator</div></div>
      <div class="m"><div class="mv" data-to="9">0</div><div class="ml">Posts live</div><div class="md">native, not paid ads</div></div>
    </div>
    <div class="section-head"><h2>How we measure it</h2></div>
    <div class="mlist">
      <div class="mrow"><span class="mnum">1</span><div><b>Every post tracked.</b> We pull each creator post's real views, engagement, and outlier ratio with Virlo Satellite. The same tracking already runs in the weekly trends report.</div></div>
      <div class="mrow"><span class="mnum">2</span><div><b>Deliverables logged.</b> Creators are paid per post, so every post URL is captured automatically. Nothing is estimated.</div></div>
      <div class="mrow"><span class="mnum">3</span><div><b>Conversions on request.</b> Connect ${b.name}'s analytics to tie the posts to traffic and sales. That part is the client's data.</div></div>
    </div>
    <div class="cta-row" style="margin-top:32px">
      <button class="cta ghost" onclick="go(1)">Run another trend</button>
    </div>`;
  view.querySelectorAll("[data-to]").forEach(el => countUp(el, +el.dataset.to, el.dataset.suf || "", 1100));
}

// ---------- boot ----------
async function boot() {
  const cfg = await api("/api/config");
  S.brands = cfg.brands;
  const sel = $("#brandSelect");
  sel.innerHTML = Object.entries(S.brands).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");
  const def = Object.entries(S.brands).find(([k, v]) => v.default);
  S.brand = def ? def[0] : Object.keys(S.brands)[0]; sel.value = S.brand;
  setBrandColor();
  sel.onchange = () => { S.brand = sel.value; S.trend = S.campaign = null; setBrandColor(); go(0); };
  document.addEventListener("keydown", onKey);
  renderStepper(); render();
}
function onKey(e) {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "select" || tag === "input" || tag === "textarea") return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const max = S.trend ? STEPS.length - 1 : 1;
  if (e.key === "ArrowRight") { if (S.step < max) go(S.step + 1); }
  else if (e.key === "ArrowLeft") { if (S.step > 0) go(S.step - 1); }
  else if (/^[1-6]$/.test(e.key)) {
    const i = +e.key - 1;
    if (i <= 1 || S.trend) go(i); else toast("Pick a trend first to open this step.");
  } else return;
  e.preventDefault();
}
window.go = go;
boot();
