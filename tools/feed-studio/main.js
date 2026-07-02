import "./style.css";
import { sourceRegistry } from "../../src/data/sourceRegistry.js";

const APP_KEY = "usge-feed-studio-state-v1";
const DRAFT_KEY = "usge-feed-studio-drafts-v1";
const SEED_LIMIT = 50;
const app = document.querySelector("#app");

const state = loadState();
let drafts = loadDrafts();
let queue = [];
let dailyBatch = {
  generatedAt: null,
  timezone: "America/New_York",
  model: "",
  limit: 3,
  sourceCount: 0,
  itemCount: 0,
  items: []
};

if (!drafts.length) {
  drafts = seedTierOneSlots(SEED_LIMIT);
  persistDrafts();
}

if (!state.selectedDraftId && drafts[0]) state.selectedDraftId = drafts[0].id;

loadQueue().then((items) => {
  queue = items;
  if (!drafts.length) {
    drafts = seedTierOneSlots(SEED_LIMIT);
    persistDrafts();
  }
  render();
});

loadDailyBatch().then((payload) => {
  dailyBatch = normalizeBatch(payload);
  render();
});

render();

app.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-action]");
  const tierFilterButton = event.target.closest("[data-role='tier-filter']");
  if (tierFilterButton) {
    state.tierFilter = tierFilterButton.value;
    persistState();
    render();
    return;
  }
  if (actionButton) {
    const { action, id, value } = actionButton.dataset;
    if (action === "seed-tier-1") {
      drafts = seedTierOneSlots(SEED_LIMIT);
      state.selectedDraftId = drafts[0]?.id ?? "";
      persistDrafts();
      persistState();
      render();
      return;
    }
    if (action === "select-draft") {
      state.selectedDraftId = id;
      persistState();
      render();
      return;
    }
    if (action === "duplicate-draft") {
      const selected = drafts.find((item) => item.id === id);
      if (!selected) return;
      const clone = { ...structuredClone(selected), id: `draft-${crypto.randomUUID()}` };
      clone.title = `${clone.title || clone.sourceName || "Untitled"} (copy)`;
      drafts = [clone, ...drafts];
      state.selectedDraftId = clone.id;
      persistDrafts();
      persistState();
      render();
      return;
    }
    if (action === "delete-draft") {
      drafts = drafts.filter((item) => item.id !== id);
      if (state.selectedDraftId === id) state.selectedDraftId = drafts[0]?.id ?? "";
      persistDrafts();
      persistState();
      render();
      return;
    }
    if (action === "generate-outline") {
      updateDraft(id, (current) => ({
        ...current,
        analysis: buildOutline(current),
        status: current.url ? "ready" : "needs_url"
      }));
      return;
    }
    if (action === "create-from-source") {
      const source = sourceRegistry.find((item) => item.id === id);
      if (!source) return;
      const draft = createBlankDraft({
        id: `draft-${crypto.randomUUID()}`,
        sourceName: source.source_name,
        sourceTier: source.tier,
        sourceUrl: source.source_url,
        url: source.source_url
      });
      drafts = [draft, ...drafts];
      state.selectedDraftId = draft.id;
      persistDrafts();
      persistState();
      render();
      return;
    }
    if (action === "copy-draft") {
      const selected = drafts.find((item) => item.id === id) ?? dailyBatch.items.find((item) => item.id === id);
      if (!selected) return;
      await navigator.clipboard.writeText(JSON.stringify(selected, null, 2));
      actionButton.textContent = "Copied";
      setTimeout(() => {
        if (document.body.contains(actionButton)) actionButton.textContent = value || "Copy JSON";
      }, 1200);
      return;
    }
    if (action === "bulk-import") {
      const textarea = document.querySelector("[data-role='bulk-import']");
      const urls = (textarea?.value ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, SEED_LIMIT);
      if (urls.length) {
        const imported = urls.map((url, index) => createBlankDraft({
          id: `import-${crypto.randomUUID()}`,
          sourceName: `Imported URL ${index + 1}`,
          sourceTier: 2,
          sourceUrl: url,
          url
        }));
        drafts = [...imported, ...drafts];
        state.selectedDraftId = imported[0].id;
        persistDrafts();
        persistState();
        render();
      }
      return;
    }
    if (action === "export-json") {
      const payload = JSON.stringify({ drafts, queue, dailyBatch }, null, 2);
      await navigator.clipboard.writeText(payload);
      actionButton.textContent = "Copied";
      setTimeout(() => {
        if (document.body.contains(actionButton)) actionButton.textContent = "Export JSON";
      }, 1200);
    }
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.matches("[data-role='source-search']")) {
    state.sourceSearch = target.value;
    persistState();
    render();
    return;
  }
  if (target.matches("[data-role='draft-search']")) {
    state.draftSearch = target.value;
    persistState();
    render();
    return;
  }
  if (target.matches("[data-role='tier-filter']")) {
    state.tierFilter = target.value;
    persistState();
    render();
    return;
  }
  const draftId = target.getAttribute("data-draft-id");
  const field = target.getAttribute("data-field");
  if (draftId && field) {
    updateDraft(draftId, (current) => ({ ...current, [field]: target.value }));
  }
});

function render() {
  const visibleSources = sourceRegistry.filter((source) => {
    const tierMatches = state.tierFilter === "all" || String(source.tier) === state.tierFilter;
    const text = `${source.source_name} ${source.category} ${source.notes}`.toLowerCase();
    const searchMatches = !state.sourceSearch || text.includes(state.sourceSearch.toLowerCase());
    return tierMatches && searchMatches;
  });

  const visibleDrafts = drafts.filter((draft) => {
    const text = `${draft.title} ${draft.sourceName} ${draft.company} ${draft.projectName} ${draft.url}`.toLowerCase();
    return !state.draftSearch || text.includes(state.draftSearch.toLowerCase());
  });

  const selectedDraft = drafts.find((item) => item.id === state.selectedDraftId) ?? drafts[0] ?? null;
  const tierOneCount = drafts.filter((item) => item.sourceTier === 1).length;
  const readyCount = drafts.filter((item) => item.status === "ready").length;
  const batchCounts = countBatchTiers(dailyBatch.items);

  app.innerHTML = `
    <div class="studio">
      <header class="studio-header">
        <div>
          <div class="studio-kicker">Private local workspace</div>
          <h1>Feed Studio</h1>
          <p>Facts only: company, location, MW or GW, utility, ISO or RTO, project name, date, investment amount, transmission or substation references, and source URL. Use Tier 1 for verification, Tier 2 and Tier 3 for discovery.</p>
        </div>
        <div class="button-row">
          <button class="button primary" data-action="seed-tier-1">Seed 50 Tier 1 slots</button>
          <button class="button" data-action="export-json">Export JSON</button>
        </div>
      </header>

      <section class="panel" style="margin: 16px 16px 0;">
        <div class="panel-header">
          <div>
            <h2>Daily 3-article batch</h2>
            <p>Generated briefs are tier-ordered, limited to three per run, and shown here before anything is pushed live.</p>
          </div>
          <div class="batch-meta">
            <strong>${dailyBatch.items.length || 0} drafts</strong>
            <small>${dailyBatch.generatedAt ? `Updated ${formatShortDate(dailyBatch.generatedAt)}` : "Waiting for the next run"}</small>
          </div>
        </div>
        <div class="toolbar">
          <div class="summary-grid batch-summary-grid">
            <div class="summary-card"><span>Limit</span><strong>${dailyBatch.limit ?? 3}</strong></div>
            <div class="summary-card"><span>Tier 1</span><strong>${batchCounts[1] ?? 0}</strong></div>
            <div class="summary-card"><span>Tier 2</span><strong>${batchCounts[2] ?? 0}</strong></div>
            <div class="summary-card"><span>Tier 3</span><strong>${batchCounts[3] ?? 0}</strong></div>
          </div>
          <div class="row">
            <label>Generation model</label>
            <input class="input" value="${escapeHtml(dailyBatch.model || "gpt-5.4-mini-medium")}" readonly />
          </div>
          <div class="row">
            <label>Batch rules</label>
            <textarea class="textarea" readonly>Up to 3 drafts per day; Tier 1 first, then Tier 2, then Tier 3; keep AUTO_PUBLISH off; review on localhost before pushing.</textarea>
          </div>
        </div>
        <div class="queue-list daily-batch-list">
          ${dailyBatch.items.length ? dailyBatch.items.map(renderBatchCard).join("") : `<div class="empty-state">No generated batch yet. Run the daily batch generator or wait for the scheduled job.</div>`}
        </div>
      </section>

      <main class="studio-layout">
        <aside class="panel">
          <div class="panel-header">
            <div>
              <h2>Source Registry</h2>
              <p>Filter by tier. Tier 1 sources are the verification layer.</p>
            </div>
          </div>
          <div class="toolbar">
            <div class="source-filter">
              ${["all", "1", "2", "3"].map((tier) => `<button class="${state.tierFilter === tier ? "active" : ""}" data-role="tier-filter" value="${tier}">${tier === "all" ? "All" : `Tier ${tier}`}</button>`).join("")}
            </div>
            <div class="row">
              <label for="source-search">Search sources</label>
              <input id="source-search" class="input" data-role="source-search" value="${escapeHtml(state.sourceSearch)}" placeholder="Search by source, category, or note" />
            </div>
            <div class="button-row">
              <button class="button" data-action="seed-tier-1">Seed 50 Tier 1 slots</button>
            </div>
          </div>
          <div class="source-list">
            ${visibleSources.map(renderSourceCard).join("") || `<div class="empty-state">No sources match this filter.</div>`}
          </div>
        </aside>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>Draft Queue</h2>
              <p>Build the first 50 briefs here. Each draft can be facts-only and analysis-ready.</p>
            </div>
          </div>
          <div class="toolbar">
            <div class="summary-grid">
              <div class="summary-card"><span>Total drafts</span><strong>${drafts.length}</strong></div>
              <div class="summary-card"><span>Tier 1 seeded</span><strong>${tierOneCount}</strong></div>
              <div class="summary-card"><span>Ready</span><strong>${readyCount}</strong></div>
            </div>
            <div class="row">
              <label for="draft-search">Search drafts</label>
              <input id="draft-search" class="input" data-role="draft-search" value="${escapeHtml(state.draftSearch)}" placeholder="Search titles, companies, utilities, or URLs" />
            </div>
            <div class="row">
              <label for="bulk-import">Bulk import URLs</label>
              <textarea id="bulk-import" class="textarea" data-role="bulk-import" placeholder="Paste one source URL per line. Up to 50 at a time."></textarea>
            </div>
            <div class="button-row">
              <button class="button primary" data-action="bulk-import">Add URLs</button>
            </div>
          </div>
          <div class="draft-list">
            ${visibleDrafts.map((draft) => renderDraftCard(draft, selectedDraft?.id === draft.id)).join("") || `<div class="empty-state">No drafts yet. Seed Tier 1 slots or import URLs to begin.</div>`}
          </div>
        </section>

        <aside class="panel">
          <div class="panel-header">
            <div>
              <h2>Editor</h2>
              <p>Keep the published brief original and analysis-focused.</p>
            </div>
          </div>
          <div class="editor">
            ${selectedDraft ? renderEditor(selectedDraft) : `<div class="empty-state">Select a draft to edit its facts and analysis.</div>`}

            <div class="note">
              When the source material comes from Tier 2 or Tier 3, verify the important facts against Tier 1 whenever possible. Do not copy article text; use source facts only, then write original analysis.
            </div>
          </div>
        </aside>
      </main>

      <section class="studio-layout" style="padding-top: 0;">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h3>Review Queue</h3>
              <p>Private queue preview from the monitor.</p>
            </div>
          </div>
          <div class="queue-list">
            ${queue.length ? queue.map(renderQueueCard).join("") : `<div class="empty-state">No queue items yet. Run the monitor after you add URLs.</div>`}
          </div>
        </section>
      </section>
    </div>
  `;
}

function renderSourceCard(source) {
  return `
    <article class="source-card">
      <h4>${escapeHtml(source.source_name)}</h4>
      <p>${escapeHtml(source.notes || "No notes available.")}</p>
      <div class="source-meta">
        <span class="pill tier-${source.tier}">Tier ${source.tier}</span>
        <span class="pill">${escapeHtml(source.source_type)}</span>
        <span class="pill">${escapeHtml(source.fetch_method)}</span>
      </div>
      <div class="draft-actions">
        <button class="button" data-action="create-from-source" data-id="${source.id}">Create draft</button>
      </div>
    </article>
  `;
}

function renderDraftCard(draft, selected) {
  return `
    <article class="draft-card ${selected ? "selected" : ""}">
      <h4>${escapeHtml(draft.title || draft.sourceName || "Untitled draft")}</h4>
      <p>${escapeHtml(draft.analysis || draft.sourceFacts || "No facts captured yet.")}</p>
      <div class="draft-meta">
        <span class="pill tier-${draft.sourceTier}">Tier ${draft.sourceTier}</span>
        <span class="pill ${draft.status}">${escapeHtml(draft.status)}</span>
        <span class="pill">${escapeHtml(draft.sourceName || "No source")}</span>
      </div>
      <div class="draft-actions">
        <button class="button" data-action="select-draft" data-id="${draft.id}">Edit</button>
        <button class="button" data-action="generate-outline" data-id="${draft.id}">Outline</button>
        <button class="button" data-action="duplicate-draft" data-id="${draft.id}">Duplicate</button>
        <button class="button" data-action="copy-draft" data-id="${draft.id}" data-value="Copy JSON">Copy JSON</button>
        <button class="button ghost" data-action="delete-draft" data-id="${draft.id}">Delete</button>
      </div>
    </article>
  `;
}

function renderEditor(draft) {
  return `
    <div class="editor-grid">
      ${field("Title", "title", draft.title, "text")}
      ${field("Source URL", "url", draft.url, "url")}
      ${field("Source name", "sourceName", draft.sourceName, "text")}
      ${field("Company", "company", draft.company, "text")}
      ${field("Location", "location", draft.location, "text")}
      ${field("Project name", "projectName", draft.projectName, "text")}
      ${field("MW or GW", "mw", draft.mw, "text")}
      ${field("Utility", "utility", draft.utility, "text")}
      ${field("ISO or RTO", "iso", draft.iso, "text")}
      ${field("Date", "date", draft.date, "date")}
      ${field("Investment amount", "investmentAmount", draft.investmentAmount, "text")}
      ${field("Transmission or substation refs", "transmissionRefs", draft.transmissionRefs, "text")}
      ${field("Source facts", "sourceFacts", draft.sourceFacts, "textarea", true)}
      ${field("Original analysis", "analysis", draft.analysis, "textarea", true)}
    </div>
    <div class="button-row">
      <button class="button primary" data-action="select-draft" data-id="${draft.id}">Keep editing</button>
      <button class="button" data-action="generate-outline" data-id="${draft.id}">Refresh outline</button>
    </div>
  `;
}

function renderQueueCard(item) {
  return `
    <article class="queue-card">
      <h4>${escapeHtml(item.title)}</h4>
      <small>${escapeHtml(item.source_name)} · Tier ${item.source_tier} · ${escapeHtml(item.verification_status)}</small>
      <p>${escapeHtml(item.snippet || "No snippet available.")}</p>
    </article>
  `;
}

function renderBatchCard(item) {
  const tier = getTier(item);
  const sourceLine = [item.sourceName, item.publishedDate ? formatShortDate(item.publishedDate) : ""].filter(Boolean).join(" · ");
  return `
    <article class="queue-card">
      <div class="source-meta">
        <span class="pill tier-${tier}">Tier ${tier || "?"}</span>
        <span class="pill">${escapeHtml(item.sourceType || "source")}</span>
      </div>
      <h4>${escapeHtml(item.title || item.sourceName || "Untitled briefing")}</h4>
      <small>${escapeHtml(sourceLine)}</small>
      <p>${escapeHtml(item.summary || item.whyItMatters || "No summary available.")}</p>
      <div class="draft-actions">
        <button class="button" data-action="copy-draft" data-id="${escapeHtml(item.id || crypto.randomUUID())}" data-value="Copy JSON">Copy JSON</button>
      </div>
    </article>
  `;
}

function field(label, key, value, type, multiline = false) {
  const id = `${key}-${crypto.randomUUID()}`;
  return `
    <div class="field ${multiline ? "wide" : ""}">
      <label for="${id}">${label}</label>
      ${
        multiline
          ? `<textarea id="${id}" data-draft-id="${state.selectedDraftId}" data-field="${key}">${escapeHtml(value ?? "")}</textarea>`
          : `<input id="${id}" type="${type}" data-draft-id="${state.selectedDraftId}" data-field="${key}" value="${escapeHtml(value ?? "")}" />`
      }
    </div>
  `;
}

function updateDraft(id, updater) {
  drafts = drafts.map((draft) => (draft.id === id ? updater(draft) : draft));
  persistDrafts();
  render();
}

function createBlankDraft({ id, sourceName, sourceTier, sourceUrl, url }) {
  return {
    id,
    sourceTier,
    sourceName,
    sourceUrl,
    url,
    title: "",
    company: "",
    location: "",
    mw: "",
    utility: "",
    iso: "",
    projectName: "",
    date: "",
    investmentAmount: "",
    transmissionRefs: "",
    sourceFacts: "",
    analysis: "",
    status: url ? "needs_url" : "draft"
  };
}

function seedTierOneSlots(limit) {
  const tierOneSources = sourceRegistry.filter((source) => source.tier === 1 && source.source_url && source.source_type !== "local_government");
  const slots = tierOneSources.slice(0, limit).map((source, index) => createBlankDraft({
    id: `tier1-${source.id}-${index + 1}`,
    sourceName: source.source_name,
    sourceTier: 1,
    sourceUrl: source.source_url,
    url: source.source_url
  }));
  while (slots.length < limit) {
    const index = slots.length + 1;
    slots.push(createBlankDraft({
      id: `tier1-placeholder-${index}`,
      sourceName: `Tier 1 follow-up slot ${index}`,
      sourceTier: 1,
      sourceUrl: "",
      url: ""
    }));
  }
  return slots;
}

function buildOutline(draft) {
  return [
    "Facts",
    draft.sourceFacts?.trim() || "Add verified source facts from the linked article.",
    "",
    "Why it matters",
    "Explain how the project affects electricity demand, grid connection, local utilities, transmission, permitting, and AI or data-center growth.",
    "",
    "Public-safe framing",
    "Keep the article original, cite the source URL, and avoid copying the source article text."
  ].join("\n");
}

function loadState() {
  try {
    return {
      tierFilter: "1",
      sourceSearch: "",
      draftSearch: "",
      selectedDraftId: "",
      ...JSON.parse(localStorage.getItem(APP_KEY) || "{}")
    };
  } catch {
    return { tierFilter: "1", sourceSearch: "", draftSearch: "", selectedDraftId: "" };
  }
}

function persistState() {
  localStorage.setItem(APP_KEY, JSON.stringify(state));
}

function loadDrafts() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistDrafts() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

async function loadQueue() {
  try {
    const response = await fetch("./data/feed-review-queue.json");
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

async function loadDailyBatch() {
  try {
    const response = await fetch("./data/daily-feed-batch.json");
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeBatch(payload) {
  if (!payload || typeof payload !== "object") {
    return {
      generatedAt: null,
      timezone: "America/New_York",
      model: "",
      limit: 3,
      sourceCount: 0,
      itemCount: 0,
      items: []
    };
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  return {
    generatedAt: payload.generatedAt ?? null,
    timezone: payload.timezone ?? "America/New_York",
    model: payload.model ?? "",
    limit: Number(payload.limit ?? 3),
    sourceCount: Number(payload.sourceCount ?? 0),
    itemCount: Number(payload.itemCount ?? items.length),
    items
  };
}

function countBatchTiers(items) {
  return items.reduce((counts, item) => {
    const tier = getTier(item);
    counts[tier] = (counts[tier] ?? 0) + 1;
    return counts;
  }, { 1: 0, 2: 0, 3: 0 });
}

function getTier(item) {
  return Number(item.sourceTier ?? item.source_tier ?? 0) || 0;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
