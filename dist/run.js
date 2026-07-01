#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// lib/config.ts
import fs2 from "fs";
import path2 from "path";
function findRoot2() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs2.existsSync(path2.join(dir, CONFIG_FILE))) return dir;
    const p = path2.dirname(dir);
    if (p === dir) break;
    dir = p;
  }
  return process.cwd();
}
function loadConfig() {
  if (_config) return _config;
  const root = findRoot2();
  const p = path2.join(root, CONFIG_FILE);
  if (!fs2.existsSync(p)) {
    throw new Error(`No ${CONFIG_FILE} found. Run \`npx seoflow init\` first.`);
  }
  let raw;
  try {
    raw = JSON.parse(fs2.readFileSync(p, "utf8"));
  } catch (e) {
    throw new Error(`Invalid JSON in ${CONFIG_FILE}: ${e instanceof Error ? e.message : e}`);
  }
  if (!raw || typeof raw !== "object") {
    throw new Error(`${CONFIG_FILE} must be a JSON object.`);
  }
  const r = (s) => path2.resolve(root, s);
  _config = {
    ...raw,
    postsDir: r(raw.postsDir),
    gscPagesCsv: r(raw.gscPagesCsv),
    gscQueriesCsv: r(raw.gscQueriesCsv),
    auditLogPath: r(raw.auditLogPath),
    keywordCachePath: r(raw.keywordCachePath)
  };
  return _config;
}
function getPostsDir() {
  return loadConfig().postsDir;
}
function getAuditLogPath() {
  return loadConfig().auditLogPath;
}
function getSiteUrl() {
  return loadConfig().siteUrl;
}
function getToolTriggers() {
  return loadConfig().tools;
}
function getBookingTriggers() {
  return loadConfig().bookings;
}
function getWritingSample(contentType) {
  const c = loadConfig();
  if (c.writingSamples && contentType && c.writingSamples[contentType]) {
    return c.writingSamples[contentType];
  }
  if (c.writingSamples?.default) return c.writingSamples.default;
  return c.writingSample;
}
function getContentDomain() {
  return loadConfig().contentDomain || "blog";
}
function getImageSearchFallback() {
  return loadConfig().imageSearchFallback || "travel";
}
function getDefaultCategory() {
  return loadConfig().defaultCategory || loadConfig().generation?.defaultCategory || "travel";
}
function getContentTypes() {
  return loadConfig().contentTypes || DEFAULT_CONTENT_TYPES;
}
function getAiContext() {
  const c = loadConfig();
  return {
    siteName: c.siteName,
    siteUrl: c.siteUrl,
    author: c.author,
    authorLocation: c.authorLocation,
    writingSample: c.writingSample,
    contentDomain: c.contentDomain || "blog"
  };
}
var CONFIG_FILE, _config, DEFAULT_CONTENT_TYPES;
var init_config = __esm({
  "lib/config.ts"() {
    "use strict";
    CONFIG_FILE = "seoflow.config.json";
    _config = null;
    DEFAULT_CONTENT_TYPES = {
      "guide": {
        schema: "TravelGuide",
        instructions: `Write a comprehensive travel guide. Include practical tips, transportation options, best time to visit, where to stay (budget/mid-range/splurge), and local customs. Use first-person where relevant ("I found that...", "In my experience..."). Include specific prices, transit times, and real details.`
      },
      "itinerary": {
        schema: "Itinerary",
        instructions: `Write a day-by-day itinerary. Include specific timings, meal recommendations, transit between stops, and practical tips for each day. Start with a "Quick Summary" box highlighting the itinerary at a glance. Include a budget breakdown section.`
      },
      "things-to-do": {
        schema: "TravelGuide",
        instructions: `Write a things-to-do guide with categorized attractions. Include opening hours, ticket prices, how long to spend at each, and honest opinions on what's worth skipping. Group by category (museums, outdoor, free, etc.) or by area.`
      },
      "city-pass-review": {
        schema: "Review",
        instructions: `Write an honest review of the city pass. Include price comparison with individual attraction costs, what's included vs excluded, best use strategy (which days/attractions maximize value), and who it's worth for. Start with a verdict summary.`
      },
      "article": {
        schema: "Article",
        instructions: `Write an informative article. Use first-person perspective where relevant. Include specific examples, data points, and practical takeaways. Structure with clear H2 sections.`
      }
    };
  }
});

// lib/audit-log.ts
import fs4 from "fs";
import path3 from "path";
function loadAuditLog() {
  const p = getAuditLogPath();
  if (!fs4.existsSync(p)) {
    return { version: "1.0", last_run: null, posts: {} };
  }
  try {
    const log = JSON.parse(fs4.readFileSync(p, "utf8"));
    if (!log || typeof log !== "object" || Array.isArray(log)) {
      return { version: "1.0", last_run: null, posts: {} };
    }
    if (!log.posts || typeof log.posts !== "object") {
      log.posts = {};
    }
    return log;
  } catch {
    return { version: "1.0", last_run: null, posts: {} };
  }
}
function saveAuditLog(log, dryRun = false) {
  if (!dryRun) {
    const p = getAuditLogPath();
    fs4.mkdirSync(path3.dirname(p), { recursive: true });
    fs4.writeFileSync(p, JSON.stringify(log, null, 2));
  }
}
function isAlreadyDone(log, slug) {
  if (!log || !log.posts) return false;
  const entry = log.posts[slug];
  if (!entry || entry.status !== "completed") return false;
  if (!entry.next_review) return false;
  return new Date(entry.next_review) > /* @__PURE__ */ new Date();
}
function logEntry(log, slug, data) {
  if (!log.posts) log.posts = {};
  log.posts[slug] = {
    ...log.posts[slug] || {},
    ...data,
    audit_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    auditor: "seoflow-agent"
  };
  log.last_run = (/* @__PURE__ */ new Date()).toISOString();
}
var init_audit_log = __esm({
  "lib/audit-log.ts"() {
    "use strict";
    init_config();
  }
});

// lib/gemini-client.ts
async function geminiChat(prompt) {
  return geminiChatInternal(prompt);
}
async function geminiChatWithRetry(prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await geminiChatInternal(prompt);
    if (result) return result;
    if (attempt < maxRetries) {
      const delay = attempt * 1e4;
      console.log(`     Gemini retry in ${delay / 1e3}s (attempt ${attempt}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return null;
}
async function geminiChatInternal(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 8192 } }),
        signal: AbortSignal.timeout(9e4)
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`     Gemini HTTP ${res.status}: ${text.slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || "empty";
      console.error(`     Gemini blocked: ${reason}`);
      return null;
    }
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    console.error(`     Gemini error: ${e instanceof Error ? e.message : "Unknown"}`);
    return null;
  }
}
var GEMINI_MODEL;
var init_gemini_client = __esm({
  "lib/gemini-client.ts"() {
    "use strict";
    GEMINI_MODEL = "gemini-2.5-flash";
  }
});

// lib/openrouter-client.ts
function getApiKey() {
  if (_apiKey !== null) return _apiKey;
  _apiKey = process.env.OPENROUTER_API_KEY || null;
  return _apiKey;
}
function hasOpenRouterKey() {
  return !!getApiKey();
}
function getModelConfig(task) {
  return DEFAULT_CONFIGS[task] || DEFAULT_CONFIGS["content-audit"];
}
async function openrouterChat(prompt, config) {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const taskConfig = {
    ...DEFAULT_CONFIGS["content-audit"],
    ...config
  };
  try {
    let siteUrl = "";
    let siteName = "";
    try {
      siteUrl = getSiteUrl();
      siteName = loadConfig().siteName;
    } catch {
    }
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": siteUrl ? `https://${siteUrl}` : "https://seoflow",
        "X-Title": siteName ? `${siteName} SeoFlow` : "SeoFlow"
      },
      body: JSON.stringify({
        model: taskConfig.model,
        messages: [{ role: "user", content: prompt }],
        temperature: taskConfig.temperature ?? 0.5,
        max_tokens: taskConfig.maxTokens ?? 4096
      }),
      signal: AbortSignal.timeout(12e4)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`     OpenRouter HTTP ${res.status}: ${text.slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`     OpenRouter error: ${msg}`);
    return null;
  }
}
async function openrouterChatWithRetry(prompt, config, maxRetries = 3) {
  const label = config?.label || getModelConfig("content-audit").label;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`     \u{1F916} ${label}${attempt > 1 ? ` (attempt ${attempt}/${maxRetries})` : ""}...`);
    const result = await openrouterChat(prompt, config);
    if (result) return result;
    if (attempt < maxRetries) {
      const delay = attempt * 1e4;
      console.log(`     Retrying in ${delay / 1e3}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return null;
}
var BASE_URL, DEFAULT_CONFIGS, _apiKey;
var init_openrouter_client = __esm({
  "lib/openrouter-client.ts"() {
    "use strict";
    init_config();
    BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
    DEFAULT_CONFIGS = {
      "seo-review": {
        model: "anthropic/claude-3.5-haiku",
        temperature: 0.3,
        maxTokens: 2048,
        label: "Claude 3.5 Haiku"
      },
      "content-audit": {
        model: "google/gemini-2.5-flash-001",
        temperature: 0.5,
        maxTokens: 8192,
        label: "Gemini 2.5 Flash"
      },
      "fact-check": {
        model: "anthropic/claude-3.5-haiku",
        temperature: 0.2,
        maxTokens: 1024,
        label: "Claude 3.5 Haiku"
      }
    };
    _apiKey = null;
  }
});

// lib/claude-client.ts
function getApiKey2() {
  if (_apiKey2 !== null) return _apiKey2;
  _apiKey2 = process.env.ANTHROPIC_API_KEY || null;
  return _apiKey2;
}
function hasClaudeKey() {
  return !!getApiKey2();
}
function getModelConfig2(task) {
  return DEFAULT_CONFIGS2[task] || DEFAULT_CONFIGS2["content-audit"];
}
async function claudeChat(prompt, config) {
  const apiKey = getApiKey2();
  if (!apiKey) return null;
  const taskConfig = {
    ...DEFAULT_CONFIGS2["content-audit"],
    ...config
  };
  try {
    let siteName = "";
    let siteUrl = "";
    try {
      siteName = loadConfig().siteName;
      siteUrl = getSiteUrl();
    } catch {
    }
    const res = await fetch(BASE_URL2, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-metadata": JSON.stringify({
          "user-agent": siteName ? `${siteName} SeoFlow` : "SeoFlow",
          "origin": siteUrl ? `https://${siteUrl}` : "https://seoflow"
        })
      },
      body: JSON.stringify({
        model: taskConfig.model,
        messages: [{ role: "user", content: prompt }],
        temperature: taskConfig.temperature ?? 0.5,
        max_tokens: taskConfig.maxTokens ?? 4096
      }),
      signal: AbortSignal.timeout(12e4)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`     Claude HTTP ${res.status}: ${text.slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    return data?.content?.[0]?.text || null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`     Claude error: ${msg}`);
    return null;
  }
}
async function claudeChatWithRetry(prompt, config, maxRetries = 3) {
  const label = config?.label || getModelConfig2("content-audit").label;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`     \u{1F916} ${label}${attempt > 1 ? ` (attempt ${attempt}/${maxRetries})` : ""}...`);
    const result = await claudeChat(prompt, config);
    if (result) return result;
    if (attempt < maxRetries) {
      const delay = attempt * 1e4;
      console.log(`     Retrying in ${delay / 1e3}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return null;
}
var BASE_URL2, DEFAULT_CONFIGS2, _apiKey2;
var init_claude_client = __esm({
  "lib/claude-client.ts"() {
    "use strict";
    init_config();
    BASE_URL2 = "https://api.anthropic.com/v1/messages";
    DEFAULT_CONFIGS2 = {
      "seo-review": {
        model: "claude-3-5-haiku-20241022",
        temperature: 0.3,
        maxTokens: 2048,
        label: "Claude 3.5 Haiku"
      },
      "content-audit": {
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.5,
        maxTokens: 8192,
        label: "Claude 3.5 Sonnet"
      },
      "fact-check": {
        model: "claude-3-5-haiku-20241022",
        temperature: 0.2,
        maxTokens: 1024,
        label: "Claude 3.5 Haiku"
      }
    };
    _apiKey2 = null;
  }
});

// lib/ai-provider.ts
function resetAiCallCounter() {
  _runCounter.count = 0;
}
function getAiCallCount() {
  return _runCounter.count;
}
function checkBudget(task) {
  try {
    const cfg = loadConfig();
    const max = cfg.aiLimits?.maxCallsPerRun;
    if (max && _runCounter.count >= max) {
      console.log(`     \u26A0\uFE0F  AI budget: ${_runCounter.count}/${max} calls used \u2014 skipping ${task}`);
      return false;
    }
  } catch {
  }
  return true;
}
function getPreferredProvider() {
  const env = process.env.AI_PROVIDER?.toLowerCase().trim();
  if (env === "claude" && hasClaudeKey()) return "claude";
  if (env === "openrouter" && hasOpenRouterKey()) return "openrouter";
  if (env === "gemini" && hasGemini()) return "gemini";
  if (hasClaudeKey()) return "claude";
  if (hasOpenRouterKey()) return "openrouter";
  return "gemini";
}
function logAiStatus() {
  if (hasClaudeKey()) console.log("   Claude AI: connected (Claude 3.5 Haiku/Sonnet)");
  else console.log("   \u26A0\uFE0F  ANTHROPIC_API_KEY not set \u2014 Claude disabled");
  if (hasOpenRouterKey()) {
    console.log(`   OpenRouter: connected (300+ models available)`);
  } else {
    console.log("   \u26A0\uFE0F  OPENROUTER_API_KEY not set \u2014 OpenRouter disabled");
  }
  if (hasGemini()) console.log("   Gemini AI: connected (gemini-2.5-flash)");
  else console.log("   \u26A0\uFE0F  GEMINI_API_KEY not set \u2014 Gemini disabled");
  const preferred = getPreferredProvider();
  if (preferred === "claude") console.log(`   \u2192 Primary provider: Claude (set AI_PROVIDER=claude)`);
  else if (preferred === "openrouter") console.log(`   \u2192 Primary provider: OpenRouter (set AI_PROVIDER=openrouter)`);
  else console.log(`   \u2192 Primary provider: Gemini (set AI_PROVIDER=gemini or unset)`);
}
async function aiChatWithRetry(prompt, task = "content-audit", maxRetries = 3) {
  if (!checkBudget(task)) return null;
  _runCounter.count++;
  const preferred = getPreferredProvider();
  if (preferred === "claude" && hasClaudeKey()) {
    const config = getModelConfig2(task);
    const result = await claudeChatWithRetry(prompt, config, maxRetries);
    if (result) return result;
  } else if (preferred === "openrouter" && hasOpenRouterKey()) {
    const config = getModelConfig(task);
    const result = await openrouterChatWithRetry(prompt, config, maxRetries);
    if (result) return result;
  } else if (preferred === "gemini" && hasGemini()) {
    const result = await geminiChatWithRetry(prompt, maxRetries);
    if (result) return result;
  }
  const availableProviders = [];
  if (preferred !== "claude" && hasClaudeKey()) availableProviders.push("claude");
  if (preferred !== "openrouter" && hasOpenRouterKey()) availableProviders.push("openrouter");
  if (preferred !== "gemini" && hasGemini()) availableProviders.push("gemini");
  for (const provider of availableProviders) {
    console.log(`     ${preferred} failed, falling back to ${provider}...`);
    if (provider === "claude") {
      const result = await claudeChatWithRetry(prompt, getModelConfig2(task), 1);
      if (result) return result;
    } else if (provider === "openrouter") {
      const result = await openrouterChatWithRetry(prompt, getModelConfig(task), 1);
      if (result) return result;
    } else if (provider === "gemini") {
      const result = await geminiChat(prompt);
      if (result) return result;
    }
  }
  return null;
}
var _runCounter, hasGemini;
var init_ai_provider = __esm({
  "lib/ai-provider.ts"() {
    "use strict";
    init_gemini_client();
    init_openrouter_client();
    init_claude_client();
    init_config();
    _runCounter = { count: 0 };
    hasGemini = () => !!process.env.GEMINI_API_KEY;
  }
});

// lib/neuronwriter.ts
import https2 from "https";
function neuronKey() {
  return process.env.NEURONWRITER_API_KEY || process.env.NEURONWRITE_API_KEY || null;
}
function neuronProjectId() {
  return process.env.NEURONWRITE_PROJECT_ID || process.env.NEURONWRITER_PROJECT_ID || "";
}
async function neuronPost(method, payload) {
  const apiKey = neuronKey();
  if (!apiKey) return null;
  return new Promise((resolve) => {
    const body = JSON.stringify(payload);
    const req = https2.request(
      `${NEURON_BASE}/${method}`,
      {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (res) => {
        let data = "";
        res.on("data", (d) => data += d);
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(15e3, () => {
      req.destroy();
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}
function pickStrings(list, limit = 15) {
  if (!Array.isArray(list)) return [];
  return [
    ...new Set(
      list.map((x) => {
        if (typeof x === "string") return x.trim();
        if (x?.q) return String(x.q).trim();
        if (x?.t) return String(x.t).trim();
        return "";
      }).filter(Boolean)
    )
  ].slice(0, limit);
}
async function fetchNeuronData(keyword) {
  if (!neuronKey()) {
    return {
      queryId: null,
      targetWordCount: null,
      missingTerms: [],
      h2Terms: [],
      peopleAlsoAsk: [],
      contentQuestions: [],
      notes: "NeuronWriter API key not set"
    };
  }
  const project = neuronProjectId();
  const listResp = await neuronPost("list-queries", { project, keyword, status: "ready" });
  const list = Array.isArray(listResp) ? listResp : [];
  let queryId = list.find((q) => q.keyword?.toLowerCase() === keyword.toLowerCase())?.query || "";
  if (!queryId) {
    const created = await neuronPost("new-query", {
      project,
      keyword,
      engine: "google.co.uk",
      language: "English"
    });
    if (!created?.query) {
      return {
        queryId: null,
        targetWordCount: null,
        missingTerms: [],
        h2Terms: [],
        peopleAlsoAsk: [],
        contentQuestions: [],
        notes: `NW: could not create query for "${keyword}" (check NEURONWRITE_PROJECT_ID and API credits)`
      };
    }
    queryId = created.query;
  }
  const start = Date.now();
  let data = null;
  while (Date.now() - start < 12e4) {
    data = await neuronPost("get-query", { query: queryId });
    if (data?.status === "ready") break;
    if (data?.status === "not found") {
      return {
        queryId,
        targetWordCount: null,
        missingTerms: [],
        h2Terms: [],
        peopleAlsoAsk: [],
        contentQuestions: [],
        notes: "NW: query not found"
      };
    }
    await new Promise((r) => setTimeout(r, 6e3));
  }
  if (!data || data.status !== "ready") {
    return {
      queryId,
      targetWordCount: null,
      missingTerms: [],
      h2Terms: [],
      peopleAlsoAsk: [],
      contentQuestions: [],
      notes: "NW: query not ready in time"
    };
  }
  return {
    queryId,
    targetWordCount: Number(data?.metrics?.word_count?.target || 0) || null,
    missingTerms: pickStrings(
      data?.terms_txt?.content_basic_w_ranges?.split("\n") || data?.terms_txt?.content_basic?.split("\n") || []
    ),
    h2Terms: pickStrings(data?.terms?.h2 || data?.terms_txt?.h2?.split("\n") || []),
    peopleAlsoAsk: pickStrings(data?.ideas?.people_also_ask || []),
    contentQuestions: pickStrings(data?.ideas?.content_questions || []),
    notes: null
  };
}
function hasNeuronKey() {
  return !!neuronKey();
}
function getNeuronProjectId() {
  const pid = neuronProjectId();
  return pid || "default";
}
var NEURON_BASE;
var init_neuronwriter = __esm({
  "lib/neuronwriter.ts"() {
    "use strict";
    NEURON_BASE = "https://app.neuronwriter.com/neuron-api/0.5/writer";
  }
});

// lib/learning.ts
import fs5 from "fs";
import path4 from "path";
function getDataDir() {
  const dir = path4.dirname(loadConfig().auditLogPath);
  if (!fs5.existsSync(dir)) fs5.mkdirSync(dir, { recursive: true });
  return dir;
}
function getLearningPath() {
  return path4.join(getDataDir(), "learning.json");
}
function getGscBaselinesPath() {
  return path4.join(getDataDir(), "gsc-baselines.json");
}
function getRunLogDir() {
  const dir = path4.join(getDataDir(), "run-log");
  if (!fs5.existsSync(dir)) fs5.mkdirSync(dir, { recursive: true });
  return dir;
}
function loadDB() {
  const fallback = () => ({
    version: "2.0",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    steps: {},
    contentSnapshots: {},
    patterns: {},
    categories: {}
  });
  const p = getLearningPath();
  if (fs5.existsSync(p)) {
    try {
      const parsed = JSON.parse(fs5.readFileSync(p, "utf8"));
      return {
        ...fallback(),
        ...parsed && typeof parsed === "object" ? parsed : {},
        steps: parsed?.steps && typeof parsed.steps === "object" ? parsed.steps : {},
        contentSnapshots: parsed?.contentSnapshots && typeof parsed.contentSnapshots === "object" ? parsed.contentSnapshots : {},
        patterns: parsed?.patterns && typeof parsed.patterns === "object" ? parsed.patterns : {},
        categories: parsed?.categories && typeof parsed.categories === "object" ? parsed.categories : {}
      };
    } catch {
    }
  }
  return fallback();
}
function saveDB(db) {
  db.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  fs5.writeFileSync(getLearningPath(), JSON.stringify(db, null, 2));
}
function loadGscBaselines() {
  const p = getGscBaselinesPath();
  if (fs5.existsSync(p)) {
    try {
      return JSON.parse(fs5.readFileSync(p, "utf8"));
    } catch {
    }
  }
  return {};
}
function saveGscBaselines(b) {
  fs5.writeFileSync(getGscBaselinesPath(), JSON.stringify(b, null, 2));
}
function recordContentSnapshot(slug, data) {
  const db = loadDB();
  db.contentSnapshots[slug] = data;
  saveDB(db);
  refreshPatterns(db);
}
function refreshPatterns(db) {
  const baselines = loadGscBaselines();
  const snapshots = db.contentSnapshots;
  const byTitleLength = [];
  const byDescLength = [];
  const byImageDensity = [];
  const byWordCount = [];
  for (const [slug, s] of Object.entries(snapshots)) {
    const gsc = baselines[slug];
    if (!gsc) continue;
    byTitleLength.push({ len: s.titleLength, ctr: gsc.ctr, pos: gsc.position });
    byDescLength.push({ len: s.descLength, ctr: gsc.ctr, pos: gsc.position });
    byImageDensity.push({ density: s.imageDensity, ctr: gsc.ctr, pos: gsc.position });
    byWordCount.push({ wc: s.wordCount, ctr: gsc.ctr, pos: gsc.position });
  }
  const patterns = {};
  patterns.title = bucketAndAnalyze(
    byTitleLength.map((d) => ({ value: d.len, ctr: d.ctr, pos: d.pos })),
    [0, 40, 50, 60, 70, 1e3],
    ["<40", "40-49", "50-59", "60-69", "70+"],
    "title length"
  );
  patterns.description = bucketAndAnalyze(
    byDescLength.map((d) => ({ value: d.len, ctr: d.ctr, pos: d.pos })),
    [0, 120, 140, 155, 165, 200, 1e3],
    ["<120", "120-139", "140-154", "155-165", "166-200", "200+"],
    "meta description"
  );
  patterns.imageDensity = bucketAndAnalyze(
    byImageDensity.map((d) => ({ value: d.density * 1e3, ctr: d.ctr, pos: d.pos })),
    [0, 0.5, 1, 2, 4, 100],
    ["<0.5/1k", "0.5-1/1k", "1-2/1k", "2-4/1k", "4+/1k"],
    "images per 1000 words"
  );
  patterns.wordCount = bucketAndAnalyze(
    byWordCount.map((d) => ({ value: d.wc, ctr: d.ctr, pos: d.pos })),
    [0, 500, 1e3, 1500, 2500, 1e5],
    ["<500", "500-1000", "1000-1500", "1500-2500", "2500+"],
    "word count"
  );
  db.patterns = patterns;
  saveDB(db);
}
function bucketAndAnalyze(data, thresholds, labels, dimension) {
  const insights = [];
  for (let i = 0; i < thresholds.length - 1; i++) {
    const bucket = data.filter((d) => d.value >= thresholds[i] && d.value < thresholds[i + 1]);
    if (bucket.length < 3) continue;
    const avgCtr = bucket.reduce((s, d) => s + d.ctr, 0) / bucket.length;
    const avgPos = bucket.reduce((s, d) => s + d.pos, 0) / bucket.length;
    const bestBucketCtr = insights.length > 0 ? Math.max(...insights.map((i2) => i2.avgCtr)) : 0;
    const isBest = bucket.length >= 3 && (insights.length === 0 || avgCtr >= bestBucketCtr);
    const worstCtr = insights.length > 0 ? Math.min(...insights.map((i2) => i2.avgCtr)) : avgCtr;
    insights.push({
      dimension,
      range: labels[i],
      avgCtr,
      avgPosition: avgPos,
      sampleSize: bucket.length,
      recommendation: isBest && bucket.length >= 5 ? `Posts with ${labels[i]} ${dimension} avg ${avgCtr.toFixed(1)}% CTR (best range)` : null
    });
  }
  insights.sort((a, b) => b.avgCtr - a.avgCtr);
  if (insights.length > 0 && insights[0].sampleSize >= 5) {
    insights[0].recommendation = `Posts with ${insights[0].range} ${dimension} perform best: ${insights[0].avgCtr.toFixed(1)}% CTR, pos ${insights[0].avgPosition.toFixed(1)}`;
  }
  return insights;
}
function recordStep(slug, step, category, changesApplied, gscData) {
  const db = loadDB();
  if (!db.steps[step]) {
    db.steps[step] = { runs: 0, improved: 0, avgCtrChange: 0, avgPositionChange: 0, bestForCategories: [], worstForCategories: [] };
  }
  db.steps[step].runs += changesApplied > 0 ? 1 : 0;
  if (category) {
    if (!db.categories[category]) db.categories[category] = 0;
    db.categories[category]++;
  }
  saveDB(db);
  if (gscData.impressions || gscData.clicks) {
    const baselines = loadGscBaselines();
    baselines[slug] = { date: (/* @__PURE__ */ new Date()).toISOString(), impressions: gscData.impressions || 0, clicks: gscData.clicks || 0, ctr: gscData.ctr || 0, position: gscData.position || 0 };
    saveGscBaselines(baselines);
  }
}
function checkGscDelta(slug, step, category, currentGsc) {
  const baselines = loadGscBaselines();
  const before = baselines[slug];
  if (!before || !currentGsc.impressions) return null;
  const delta = {
    impressionsChange: currentGsc.impressions - before.impressions,
    clicksChange: (currentGsc.clicks || 0) - before.clicks,
    ctrChange: (currentGsc.ctr || 0) - before.ctr,
    positionChange: (currentGsc.position || 0) - before.position
  };
  const improved = delta.clicksChange > 0 || delta.positionChange < 0 && delta.impressionsChange > 0;
  const db = loadDB();
  const s = db.steps[step];
  if (s && s.runs > 0) {
    s.improved += improved ? 1 : 0;
    s.avgCtrChange = (s.avgCtrChange * (s.runs - 1) + delta.ctrChange) / s.runs;
    s.avgPositionChange = (s.avgPositionChange * (s.runs - 1) + delta.positionChange) / s.runs;
    const cat = category || "unknown";
    if (improved) {
      if (!s.bestForCategories.includes(cat)) s.bestForCategories.push(cat);
    } else {
      if (!s.worstForCategories.includes(cat)) s.worstForCategories.push(cat);
    }
    s.bestForCategories = s.bestForCategories.slice(-10);
    s.worstForCategories = s.worstForCategories.slice(-10);
    saveDB(db);
  }
  return delta;
}
function predictPriority(slug, gsc, content) {
  const db = loadDB();
  let totalScore = 0;
  const stepScores = {};
  const patterns = [];
  if (gsc.impressions && gsc.impressions > 5e3) totalScore += 30;
  else if (gsc.impressions && gsc.impressions > 1e3) totalScore += 20;
  else if (gsc.impressions && gsc.impressions > 500) totalScore += 10;
  if (gsc.position && gsc.position >= 5 && gsc.position <= 15) totalScore += 35;
  else if (gsc.position && gsc.position > 15 && gsc.position <= 30) totalScore += 20;
  if (gsc.impressions && gsc.impressions > 500 && gsc.ctr && gsc.ctr < 3) totalScore += 25;
  if (content) {
    const titlePatterns = db.patterns.title || [];
    if (titlePatterns.length > 0) {
      const bestRange = titlePatterns[0];
      const isOptimal = titlePatterns.some((p) => {
        if (!p.range) return false;
        const [low, high] = p.range.split("-").map((s) => parseInt(s));
        if (!isNaN(low) && !isNaN(high) && content.titleLength >= low && content.titleLength < high) return true;
        return false;
      });
      if (!isOptimal) {
        totalScore += 15;
        patterns.push(`Title length (${content.titleLength}) not in optimal range (${bestRange.range} = ${bestRange.avgCtr.toFixed(1)}% CTR)`);
      }
    }
    const imgPatterns = db.patterns.imageDensity || [];
    if (imgPatterns.length > 0 && content.imageDensity < 1) {
      totalScore += 10;
      patterns.push(`Low image density (${(content.imageDensity * 1e3).toFixed(1)}/1k words)`);
    }
    const wcPatterns = db.patterns.wordCount || [];
    if (wcPatterns.length > 0) {
      const bestWcBucket = wcPatterns[0];
      if (content.wordCount < 1e3 && bestWcBucket.sampleSize >= 5) {
        totalScore += 10;
        patterns.push(`Word count (${content.wordCount}) below optimal (${bestWcBucket.range} = ${bestWcBucket.avgCtr.toFixed(1)}% CTR)`);
      }
    }
    const descPatterns = db.patterns.description || [];
    if (descPatterns.length > 0) {
      const bestDesc = descPatterns[0];
      if (content.descLength < 120 || content.descLength > 165) {
        totalScore += 10;
        patterns.push(`Meta description (${content.descLength} chars) outside optimal range (${bestDesc.range})`);
      }
    }
  }
  for (const [step, data] of Object.entries(db.steps)) {
    if (data.runs < 3) continue;
    const score = data.improved / data.runs * -data.avgPositionChange;
    if (score > 0) {
      stepScores[step] = Math.round(score * 10);
    }
  }
  return { slug, totalScore, stepScores, patterns };
}
function getLearningSummary() {
  const db = loadDB();
  const lines = [];
  for (const [step, s] of Object.entries(db.steps)) {
    if (s.runs < 3) continue;
    const pct = Math.round(s.improved / s.runs * 100);
    const pos = s.avgPositionChange.toFixed(1);
    const dir = s.avgPositionChange < 0 ? "\u2191" : "\u2193";
    lines.push(`  ${step}: ${pct}% success (${s.runs}x, pos ${dir}${Math.abs(parseFloat(pos))})`);
  }
  for (const [dim, insights] of Object.entries(db.patterns)) {
    if (insights.length > 0 && insights[0].sampleSize >= 5) {
      lines.push(`  \u{1F4D0} ${dim}: best = ${insights[0].range} (${insights[0].avgCtr.toFixed(1)}% CTR)`);
    }
  }
  return lines;
}
function logRun(record) {
  const log = { ...record, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  const dir = getRunLogDir();
  fs5.appendFileSync(path4.join(dir, `run-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.jsonl`), JSON.stringify(log) + "\n");
}
var init_learning = __esm({
  "lib/learning.ts"() {
    "use strict";
    init_config();
  }
});

// lib/mdx-parser.ts
var mdx_parser_exports = {};
__export(mdx_parser_exports, {
  buildFrontmatterBlock: () => buildFrontmatterBlock,
  countImages: () => countImages,
  countInternalLinks: () => countInternalLinks,
  countWords: () => countWords,
  extractExistingLinks: () => extractExistingLinks,
  getH2Sections: () => getH2Sections,
  parseMdx: () => parseMdx,
  scorePriority: () => scorePriority,
  sectionNeedsImage: () => sectionNeedsImage
});
function parseMdx(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { frontmatter: {}, fmBlock: "", content: raw };
  const fmBlock = match[0];
  const content = raw.slice(fmBlock.length);
  const frontmatter = {};
  let currentKey = null;
  let inMultiline = false;
  let multilineVal = [];
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (kv) {
      if (inMultiline && currentKey) {
        frontmatter[currentKey] = multilineVal.join("\n").trim();
        inMultiline = false;
        multilineVal = [];
      }
      currentKey = kv[1];
      let val = kv[2].trim();
      if (val === ">-" || val === ">") {
        inMultiline = true;
        multilineVal = [];
        continue;
      }
      if (val === "true") val = true;
      else if (val === "false") val = false;
      else if (/^\d+$/.test(val)) val = parseInt(val);
      else if (val.startsWith("'") && val.endsWith("'") || val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      frontmatter[currentKey] = val;
    } else if (inMultiline) {
      multilineVal.push(line.trim());
    } else if (currentKey && line.match(/^\s+-\s+(.+)/)) {
      if (!Array.isArray(frontmatter[currentKey])) frontmatter[currentKey] = [];
      frontmatter[currentKey].push(line.replace(/^\s+-\s+/, "").trim().replace(/^['"]|['"]$/g, ""));
    }
  }
  if (inMultiline && currentKey) frontmatter[currentKey] = multilineVal.join(" ").trim();
  return { frontmatter, fmBlock, content };
}
function buildFrontmatterBlock(fm) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const item of v) lines.push(`  - ${JSON.stringify(item)}`);
    } else if (typeof v === "string" && v.includes("\n")) {
      lines.push(`${k}: >-`);
      for (const l of v.split("\n")) lines.push(`  ${l}`);
    } else if (typeof v === "string" && (v.includes(":") || v.includes("#") || v.includes('"'))) {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    } else if (typeof v === "boolean") {
      lines.push(`${k}: ${v}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push("---");
  return lines.join("\n") + "\n";
}
function countWords(content) {
  return content.replace(/```[\s\S]*?```/g, "").replace(/<[^>]+>/g, "").replace(/[#*_\[\]()]/g, "").split(/\s+/).filter(Boolean).length;
}
function countInternalLinks(content, siteUrl) {
  const links = [...content.matchAll(/\[.*?\]\(([^)]+)\)/g)].map((m) => m[1]);
  return links.filter((l) => !l.startsWith("http") || (siteUrl ? l.includes(siteUrl) : false)).length;
}
function countImages(content) {
  return (content.match(/!\[.*?\]\(.*?\)|<Image\s/g) || []).length;
}
function extractExistingLinks(content) {
  const links = /* @__PURE__ */ new Set();
  for (const m of content.matchAll(/\[.*?\]\(([^)]+)\)/g)) {
    const siteUrl = getSiteUrl().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const href = m[1].replace(new RegExp(`^https?://(www\\.)?${siteUrl.replace(/\./g, "\\.")}`), "");
    links.add(href);
  }
  return links;
}
function getH2Sections(content) {
  const sections = [];
  const lines = content.split("\n");
  let current = null;
  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      if (current) sections.push(current);
      current = { heading: h2[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}
function sectionNeedsImage(sectionLines) {
  const text = sectionLines.join("\n");
  const hasImage = /!\[.*?\]\(.*?\)|<Image\s/.test(text);
  const wordCount = countWords(text);
  return !hasImage && wordCount > 150;
}
function scorePriority(slug, gscData) {
  const gsc = gscData[slug] || {};
  let score = 0;
  if (gsc.impressions && gsc.impressions > 5e3) score += 50;
  else if (gsc.impressions && gsc.impressions > 1e3) score += 30;
  else if (gsc.impressions && gsc.impressions > 500) score += 15;
  if (gsc.position && gsc.position >= 5 && gsc.position <= 15) score += 40;
  else if (gsc.position && gsc.position >= 15 && gsc.position <= 30) score += 20;
  if (gsc.impressions && gsc.impressions > 500 && gsc.ctr && gsc.ctr < 3) score += 25;
  if (gsc.clicks && gsc.clicks > 100) score += 20;
  else if (gsc.clicks && gsc.clicks > 50) score += 10;
  return score;
}
var init_mdx_parser = __esm({
  "lib/mdx-parser.ts"() {
    "use strict";
    init_config();
  }
});

// lib/cluster.ts
var cluster_exports = {};
__export(cluster_exports, {
  analyzeSerpOverlap: () => analyzeSerpOverlap,
  classifyIntent: () => classifyIntent,
  clusterKeywords: () => clusterKeywords,
  designArchitecture: () => designArchitecture,
  expandKeywords: () => expandKeywords,
  generateClusterPlan: () => generateClusterPlan,
  saveClusterPlan: () => saveClusterPlan
});
function classifyIntent(keyword) {
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(keyword)) {
      return intent;
    }
  }
  return "informational";
}
async function expandKeywords(seed) {
  const variants = [{ keyword: seed }];
  const modifiers = [
    "best",
    "how to",
    "vs",
    "for beginners",
    "tools",
    "examples",
    "guide",
    "template",
    "mistakes",
    "checklist",
    "pricing",
    "review",
    "alternative",
    "comparison",
    "free",
    "top"
  ];
  for (const modifier of modifiers) {
    variants.push({ keyword: `${modifier} ${seed}` });
    variants.push({ keyword: `${seed} ${modifier}` });
  }
  const questionWords = ["who", "what", "when", "where", "why", "how"];
  for (const question of questionWords) {
    variants.push({ keyword: `${question} ${seed}` });
  }
  const unique = /* @__PURE__ */ new Set();
  return variants.filter((v) => {
    const normalized = v.keyword.toLowerCase().trim();
    if (unique.has(normalized)) return false;
    unique.add(normalized);
    return classifyIntent(normalized) !== "navigational";
  });
}
async function analyzeSerpOverlap(keyword1, keyword2) {
  const similarity = calculateTextSimilarity(keyword1, keyword2);
  return Math.floor(similarity * 10);
}
function calculateTextSimilarity(str1, str2) {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = [...set1].filter((x) => set2.has(x)).length;
  const union = (/* @__PURE__ */ new Set([...set1, ...set2])).size;
  return union === 0 ? 0 : intersection / union;
}
async function clusterKeywords(keywords) {
  const clusters = [];
  const used = /* @__PURE__ */ new Set();
  const byIntent = {};
  keywords.forEach((kw, idx) => {
    const intent = kw.intent || classifyIntent(kw.keyword);
    if (!byIntent[intent]) byIntent[intent] = [];
    byIntent[intent].push(idx);
  });
  for (const intentGroup of Object.values(byIntent)) {
    for (let i = 0; i < intentGroup.length; i++) {
      if (used.has(i)) continue;
      const cluster = {
        name: `Cluster ${clusters.length + 1}`,
        color: getRandomColor(),
        posts: []
      };
      const seedIdx = intentGroup[i];
      cluster.posts.push({
        title: keywords[seedIdx].keyword,
        keyword: keywords[seedIdx].keyword,
        template: "blog-post",
        wordCount: 1500,
        status: "planned"
      });
      used.add(seedIdx);
      for (let j = i + 1; j < intentGroup.length; j++) {
        if (used.has(j)) continue;
        const overlap = await analyzeSerpOverlap(
          keywords[seedIdx].keyword,
          keywords[intentGroup[j]].keyword
        );
        if (overlap >= 4) {
          cluster.posts.push({
            title: keywords[intentGroup[j]].keyword,
            keyword: keywords[intentGroup[j]].keyword,
            template: "blog-post",
            wordCount: 1200,
            status: "planned"
          });
          used.add(j);
        }
      }
      if (cluster.posts.length > 0) {
        clusters.push(cluster);
      }
    }
  }
  return clusters;
}
function designArchitecture(clusters) {
  const allPosts = clusters.flatMap((c) => c.posts);
  const pillar = allPosts.reduce((best, post) => {
    if (!best || post.keyword.length > best.keyword.length) {
      return post;
    }
    return best;
  }, allPosts[0]);
  const plan = {
    pillar: { ...pillar, template: "ultimate-guide", wordCount: 3e3, status: "planned" },
    clusters: clusters.map((c) => ({
      ...c,
      posts: c.posts.filter((p) => p.keyword !== pillar.keyword)
      // Remove pillar from clusters
    })).filter((c) => c.posts.length > 0),
    // Remove empty clusters
    links: [],
    meta: {
      totalPosts: 1 + clusters.reduce((sum, c) => sum + c.posts.length, 0),
      totalClusters: clusters.length,
      totalLinks: 0,
      estimatedWords: 3e3 + clusters.reduce((sum, c) => sum + c.posts.reduce((s, p) => s + p.wordCount, 0), 0)
    }
  };
  plan.clusters.forEach((cluster) => {
    cluster.posts.forEach((post) => {
      plan.links.push({
        from: post.title,
        to: plan.pillar.title,
        type: "mandatory",
        anchor: plan.pillar.keyword
      });
      plan.links.push({
        from: plan.pillar.title,
        to: post.title,
        type: "mandatory",
        anchor: post.keyword
      });
    });
  });
  plan.clusters.forEach((cluster) => {
    for (let i = 0; i < cluster.posts.length; i++) {
      for (let j = i + 1; j < cluster.posts.length; j++) {
        plan.links.push({
          from: cluster.posts[i].title,
          to: cluster.posts[j].title,
          type: "recommended",
          anchor: cluster.posts[j].keyword
        });
        plan.links.push({
          from: cluster.posts[j].title,
          to: cluster.posts[i].title,
          type: "recommended",
          anchor: cluster.posts[i].keyword
        });
      }
    }
  });
  plan.meta.totalLinks = plan.links.length;
  return plan;
}
function getRandomColor() {
  const colors = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#F97316"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
async function generateClusterPlan(seedKeyword) {
  console.log(`\u{1F50D} Expanding seed keyword: "${seedKeyword}"`);
  const keywords = await expandKeywords(seedKeyword);
  console.log(`\u2705 Found ${keywords.length} keyword variants`);
  console.log(`\u{1F50D} Clustering keywords...`);
  const clusters = await clusterKeywords(keywords);
  console.log(`\u2705 Created ${clusters.length} clusters`);
  console.log(`\u{1F50D} Designing hub-and-spoke architecture...`);
  const plan = designArchitecture(clusters);
  console.log(`\u2705 Cluster plan complete: ${plan.meta.totalPosts} posts, ${plan.meta.totalClusters} clusters`);
  return plan;
}
function saveClusterPlan(plan, dir) {
  const fs16 = __require("fs");
  const path14 = __require("path");
  if (!fs16.existsSync(dir)) {
    fs16.mkdirSync(dir, { recursive: true });
  }
  const jsonPath = path14.join(dir, "cluster-plan.json");
  fs16.writeFileSync(jsonPath, JSON.stringify(plan, null, 2));
  const mdPath = path14.join(dir, "cluster-plan.md");
  fs16.writeFileSync(mdPath, clusterPlanToMarkdown(plan));
  console.log(`\u2705 Cluster plan saved to ${dir}`);
}
function clusterPlanToMarkdown(plan) {
  let md = `# Cluster Plan: ${plan.pillar.keyword}

`;
  md += `## Pillar Page
`;
  md += `- **Title**: ${plan.pillar.title}
`;
  md += `- **Keyword**: ${plan.pillar.keyword}
`;
  md += `- **Template**: ${plan.pillar.template}
`;
  md += `- **Word Count**: ${plan.pillar.wordCount} words

`;
  plan.clusters.forEach((cluster) => {
    md += `## Cluster: ${cluster.name} (${cluster.color})
`;
    cluster.posts.forEach((post) => {
      md += `- **${post.title}** (${post.template}, ${post.wordCount} words)
`;
    });
    md += `
`;
  });
  md += `## Meta Data
`;
  md += `- Total Posts: ${plan.meta.totalPosts}
`;
  md += `- Total Clusters: ${plan.meta.totalClusters}
`;
  md += `- Total Links: ${plan.meta.totalLinks}
`;
  md += `- Estimated Words: ${plan.meta.estimatedWords.toLocaleString()}
`;
  return md;
}
var INTENT_PATTERNS;
var init_cluster = __esm({
  "lib/cluster.ts"() {
    "use strict";
    INTENT_PATTERNS = {
      informational: /how|what|why|guide|tutorial|learn|explain|definition/i,
      commercial: /best|top|review|comparison|vs|alternative|ranked/i,
      transactional: /buy|price|discount|coupon|order|sign up|purchase/i,
      navigational: /login|dashboard|support|contact us|about us/i
    };
  }
});

// lib/content-brief.ts
var content_brief_exports = {};
__export(content_brief_exports, {
  analyzeCompetitors: () => analyzeCompetitors,
  generateContentBrief: () => generateContentBrief,
  generateEEATRequirements: () => generateEEATRequirements,
  generateInternalLinks: () => generateInternalLinks,
  generateMetaTags: () => generateMetaTags,
  generateOutline: () => generateOutline,
  generateUniqueAngle: () => generateUniqueAngle,
  identifyContentGaps: () => identifyContentGaps,
  saveContentBrief: () => saveContentBrief
});
async function analyzeCompetitors(keyword) {
  const competitors = [
    {
      url: "https://example.com/best-product",
      title: `The Best ${keyword} in 2024 - Top 10 Reviews`,
      h2Sections: [
        "Introduction",
        "How We Tested",
        "Top 10 Products",
        "Buying Guide",
        "FAQ",
        "Conclusion"
      ],
      estimatedWords: 2800,
      score: 32,
      mainGap: "Missing price comparison table"
    },
    {
      url: "https://example.org/product-review",
      title: `${keyword} Review - Is It Worth Buying?`,
      h2Sections: [
        "Overview",
        "Features",
        "Pros and Cons",
        "Performance",
        "Pricing",
        "Conclusion"
      ],
      estimatedWords: 1800,
      score: 28,
      mainGap: "Shallow feature comparison"
    },
    {
      url: "https://test.com/product-guide",
      title: `Complete Guide to ${keyword} - Everything You Need to Know`,
      h2Sections: [
        "What Is It?",
        "Key Features",
        "How to Use",
        "Tips and Tricks",
        "FAQ"
      ],
      estimatedWords: 2200,
      score: 30,
      mainGap: "Missing real-world use cases"
    }
  ];
  return competitors;
}
function identifyContentGaps(competitors) {
  const gaps = [];
  const allSections = /* @__PURE__ */ new Set();
  competitors.forEach((comp) => {
    comp.h2Sections.forEach((section) => allSections.add(section.toLowerCase()));
  });
  const expectedSections = ["introduction", "how we tested", "buying guide", "faq", "conclusion"];
  expectedSections.forEach((section) => {
    if (!allSections.has(section.toLowerCase())) {
      gaps.push({
        type: "topic",
        description: `Missing "${section}" section`,
        impact: 8,
        effort: 2,
        priority: 4
      });
    }
  });
  competitors.forEach((comp) => {
    const sectionCount = comp.h2Sections.length;
    if (sectionCount < 6) {
      gaps.push({
        type: "depth",
        description: `${comp.title} has shallow section coverage (only ${sectionCount} H2 sections)`,
        impact: 6,
        effort: 3,
        priority: 2
      });
    }
  });
  competitors.forEach((comp) => {
    if (!comp.h2Sections.some((s) => s.toLowerCase().includes("faq") || s.toLowerCase().includes("questions"))) {
      gaps.push({
        type: "quality",
        description: `${comp.title} missing FAQ section with common questions`,
        impact: 7,
        effort: 2,
        priority: 3.5
      });
    }
  });
  return gaps.sort((a, b) => b.priority - a.priority);
}
function generateOutline(keyword, competitors, gaps) {
  const outline = [];
  outline.push({
    heading: "Introduction",
    wordCount: 200,
    format: "paragraph",
    keywordGuidance: "Use primary keyword in first 100 words",
    featuredSnippetTarget: false
  });
  outline.push({
    heading: "How We Selected and Tested",
    wordCount: 300,
    format: "paragraph",
    keywordGuidance: 'Use secondary keywords: "how to choose", "testing methodology"',
    featuredSnippetTarget: true
  });
  const competitorSections = /* @__PURE__ */ new Set();
  competitors.forEach((comp) => {
    comp.h2Sections.forEach((section) => {
      if (!["introduction", "conclusion", "faq"].includes(section.toLowerCase())) {
        competitorSections.add(section);
      }
    });
  });
  competitorSections.forEach((section) => {
    outline.push({
      heading: section,
      wordCount: 400,
      format: "paragraph",
      keywordGuidance: `Use relevant secondary keywords for this section`,
      featuredSnippetTarget: false
    });
  });
  gaps.forEach((gap) => {
    if (gap.type === "topic") {
      const sectionName = gap.description.replace('Missing "', "").replace('" section', "");
      outline.push({
        heading: sectionName.charAt(0).toUpperCase() + sectionName.slice(1),
        wordCount: 300,
        format: "paragraph",
        keywordGuidance: `Focus on addressing this gap: ${gap.description}`,
        featuredSnippetTarget: true
      });
    }
  });
  outline.push({
    heading: "Frequently Asked Questions",
    wordCount: 400,
    format: "faq",
    keywordGuidance: "Use long-tail question keywords",
    featuredSnippetTarget: true
  });
  outline.push({
    heading: "Conclusion",
    wordCount: 200,
    format: "paragraph",
    keywordGuidance: "Include primary keyword and clear recommendation",
    featuredSnippetTarget: false
  });
  return outline;
}
function generateMetaTags(keyword) {
  const title = `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} - Expert Reviews and Buying Guide`;
  const description = `Complete guide to ${keyword}. Expert reviews, buying tips, and comparisons to help you make the best choice in 2024.`;
  let finalTitle = title;
  if (finalTitle.length > 60) {
    finalTitle = title.slice(0, 57) + "...";
  }
  let finalDescription = description;
  if (finalDescription.length > 150) {
    finalDescription = description.slice(0, 147) + "...";
  }
  return {
    title: finalTitle,
    description: finalDescription
  };
}
function generateUniqueAngle(keyword, competitors) {
  return `Our unique angle combines real-world testing with data-driven analysis, focusing on ${keyword} that offer the best value for money. We include side-by-side comparisons of key features and highlight hidden benefits that other reviews miss.`;
}
function generateEEATRequirements(keyword) {
  return [
    "Include author bio with relevant expertise in the field",
    "Cite specific sources for any claims or statistics",
    "Add last updated date to ensure content freshness",
    "Include real-world examples and case studies",
    "Add clear disclosure statements if applicable"
  ];
}
function generateInternalLinks(keyword) {
  return [
    { anchor: "related products", url: "/related-products" },
    { anchor: "buying guide", url: "/buying-guide" },
    { anchor: "best practices", url: "/best-practices" },
    { anchor: "beginner tips", url: "/beginner-tips" }
  ];
}
async function generateContentBrief(keyword) {
  console.log(`\u{1F50D} Analyzing competitors for "${keyword}"...`);
  const competitors = await analyzeCompetitors(keyword);
  console.log(`\u{1F50D} Identifying content gaps...`);
  const gaps = identifyContentGaps(competitors);
  console.log(`\u{1F50D} Generating outline...`);
  const outline = generateOutline(keyword, competitors, gaps);
  const totalWordCount = outline.reduce((sum, section) => sum + section.wordCount, 0);
  const brief = {
    primaryKeyword: keyword,
    searchIntent: "commercial",
    // Default for product reviews
    targetAudience: "Buyers researching " + keyword + " who want to compare options and make informed decisions",
    competitors,
    contentGaps: gaps,
    outline,
    targetWordCount: totalWordCount,
    recommendedMeta: generateMetaTags(keyword),
    uniqueAngle: generateUniqueAngle(keyword, competitors),
    eeatRequirements: generateEEATRequirements(keyword),
    internalLinking: generateInternalLinks(keyword)
  };
  console.log(`\u2705 Content brief generated: ${totalWordCount} words, ${outline.length} sections`);
  return brief;
}
function saveContentBrief(brief, dir = "content-briefs") {
  const fs16 = __require("fs");
  const path14 = __require("path");
  if (!fs16.existsSync(dir)) {
    fs16.mkdirSync(dir, { recursive: true });
  }
  const slug = brief.primaryKeyword.toLowerCase().replace(/\s+/g, "-");
  const mdPath = path14.join(dir, `${slug}-brief.md`);
  fs16.writeFileSync(mdPath, contentBriefToMarkdown(brief));
  const jsonPath = path14.join(dir, `${slug}-brief.json`);
  fs16.writeFileSync(jsonPath, JSON.stringify(brief, null, 2));
  console.log(`\u2705 Content brief saved to ${dir}`);
}
function contentBriefToMarkdown(brief) {
  let md = `# Content Brief: ${brief.primaryKeyword}

`;
  md += `## Search Intent
${brief.targetAudience}

`;
  md += `## Competitor Analysis
`;
  md += `| # | URL | Key H2 Sections | Est. Words | Score | Main Gap |
`;
  md += `|---|-----|-----------------|------------|-------|----------|
`;
  brief.competitors.forEach((comp, idx) => {
    md += `| ${idx + 1} | ${comp.url} | ${comp.h2Sections.slice(0, 3).join(", ")}${comp.h2Sections.length > 3 ? ", ..." : ""} | ${comp.estimatedWords} | ${comp.score}/40 | ${comp.mainGap} |
`;
  });
  md += `
`;
  md += `## Content Gaps and Opportunities
`;
  brief.contentGaps.forEach((gap) => {
    md += `- **${gap.type} gap**: ${gap.description} (Impact: ${gap.impact}/10, Effort: ${gap.effort}/10, Priority: ${gap.priority.toFixed(1)})
`;
  });
  md += `
`;
  md += `## Winning Outline

`;
  md += `**H1**: ${brief.primaryKeyword.charAt(0).toUpperCase() + brief.primaryKeyword.slice(1)}
`;
  md += `**URL Slug**: /${brief.primaryKeyword.toLowerCase().replace(/\s+/g, "-")}
`;
  md += `**Target Word Count**: ~${brief.targetWordCount} words

`;
  brief.outline.forEach((section) => {
    md += `### ${section.heading}
`;
    md += `- **Word count**: ${section.wordCount} words
`;
    md += `- **Format**: ${section.format}
`;
    md += `- **Keyword guidance**: ${section.keywordGuidance}
`;
    if (section.featuredSnippetTarget) {
      md += `- **Featured Snippet target**: Yes
`;
    }
    md += `
`;
  });
  md += `## Recommended Meta Tags

`;
  md += `**Title**
${brief.recommendedMeta.title}

`;
  md += `**Meta Description**
${brief.recommendedMeta.description}

`;
  md += `## Unique Angle and Information Gain
${brief.uniqueAngle}

`;
  md += `## E-E-A-T Requirements
`;
  brief.eeatRequirements.forEach((req) => {
    md += `- ${req}
`;
  });
  md += `
`;
  md += `## Internal Linking Opportunities
`;
  brief.internalLinking.forEach((link) => {
    md += `- [${link.anchor}](${link.url})
`;
  });
  return md;
}
var init_content_brief = __esm({
  "lib/content-brief.ts"() {
    "use strict";
  }
});

// lib/extensions.ts
var extensions_exports = {};
__export(extensions_exports, {
  formatExtensionStatus: () => formatExtensionStatus,
  getExtensionState: () => getExtensionState,
  getSupportedExtensions: () => getSupportedExtensions,
  installExtension: () => installExtension
});
import fs9 from "fs";
import path7 from "path";
import { fileURLToPath } from "url";
function resolveRootDir(rootDir) {
  const base = rootDir || process.cwd();
  return path7.resolve(base);
}
function getStateFilePath(rootDir) {
  const resolvedRootDir = resolveRootDir(rootDir);
  return path7.join(resolvedRootDir, ".seoflow", "extensions.json");
}
function findExtensionBundleRoot(extensionId, rootDir) {
  const candidates = [
    path7.resolve(resolveRootDir(rootDir), "extensions", extensionId),
    path7.resolve(path7.dirname(fileURLToPath(import.meta.url)), "..", "extensions", extensionId),
    path7.resolve(path7.dirname(fileURLToPath(import.meta.url)), "..", "..", "extensions", extensionId)
  ];
  return candidates.find((candidate) => fs9.existsSync(candidate)) || null;
}
function provisionExtensionBundle(extensionId, rootDir) {
  const resolvedRootDir = resolveRootDir(rootDir);
  const sourceDir = findExtensionBundleRoot(extensionId, resolvedRootDir);
  if (!sourceDir) return;
  const destinationDir = path7.join(resolvedRootDir, ".seoflow", "extensions", extensionId);
  fs9.mkdirSync(path7.dirname(destinationDir), { recursive: true });
  fs9.rmSync(destinationDir, { recursive: true, force: true });
  fs9.cpSync(sourceDir, destinationDir, { recursive: true });
}
function readState(rootDir) {
  const statePath = getStateFilePath(rootDir);
  if (!fs9.existsSync(statePath)) return {};
  try {
    const parsed = JSON.parse(fs9.readFileSync(statePath, "utf8"));
    return parsed;
  } catch {
    return {};
  }
}
function writeState(rootDir, state) {
  const statePath = getStateFilePath(rootDir);
  fs9.mkdirSync(path7.dirname(statePath), { recursive: true });
  fs9.writeFileSync(statePath, JSON.stringify(state, null, 2));
}
function getSupportedExtensions() {
  return SUPPORTED_EXTENSIONS.map((ext) => ({ ...ext }));
}
function getExtensionState(rootDir, extensionId) {
  const resolvedRootDir = resolveRootDir(rootDir);
  const state = readState(resolvedRootDir);
  if (extensionId) {
    const definition = SUPPORTED_EXTENSIONS.find((ext) => ext.id === extensionId);
    if (!definition) {
      return { id: extensionId, status: "unavailable", rootDir: resolvedRootDir };
    }
    return state[extensionId] || { id: extensionId, status: "available", rootDir: resolvedRootDir };
  }
  return state;
}
function installExtension(extensionId, options = {}) {
  const resolvedRootDir = resolveRootDir(options.rootDir);
  const definition = SUPPORTED_EXTENSIONS.find((ext) => ext.id === extensionId);
  if (!definition) {
    const unavailableState = {
      id: extensionId,
      status: "unavailable",
      rootDir: resolvedRootDir
    };
    return { installed: false, extensionId, status: "unavailable", state: unavailableState };
  }
  const state = readState(resolvedRootDir);
  const nextState = {
    id: extensionId,
    status: "installed",
    installedAt: (/* @__PURE__ */ new Date()).toISOString(),
    rootDir: resolvedRootDir
  };
  state[extensionId] = nextState;
  writeState(resolvedRootDir, state);
  provisionExtensionBundle(extensionId, resolvedRootDir);
  return { installed: true, extensionId, status: "installed", state: nextState };
}
function formatExtensionStatus(rootDir) {
  const supported = getSupportedExtensions();
  const state = getExtensionState(rootDir);
  return supported.map((extension) => {
    const current = state[extension.id];
    const status = current?.status || "available";
    const installedLabel = status === "installed" ? "installed" : status;
    return `- ${extension.id}: ${installedLabel} \u2014 ${extension.description}`;
  });
}
var SUPPORTED_EXTENSIONS;
var init_extensions = __esm({
  "lib/extensions.ts"() {
    "use strict";
    SUPPORTED_EXTENSIONS = [
      {
        id: "dataforseo",
        name: "DataForSEO",
        description: "Live SERP, keyword, backlink, and on-page data via DataForSEO.",
        category: "data",
        installHint: "Add your DataForSEO credentials to .env.local or the MCP configuration."
      },
      {
        id: "firecrawl",
        name: "Firecrawl",
        description: "Full-site crawling, sitemap discovery, and content extraction.",
        category: "crawl",
        installHint: "Connect the Firecrawl MCP server or install the optional extension bundle."
      },
      {
        id: "banana",
        name: "Claude Banana",
        description: "AI image generation for OG images, hero images, and schema assets.",
        category: "images",
        installHint: "Install the nanobanana MCP server and configure your image generation endpoint."
      },
      {
        id: "ahrefs",
        name: "Ahrefs",
        description: "Backlink, rank, and competitor visibility data from Ahrefs.",
        category: "data",
        installHint: "Provide your Ahrefs API credentials through the configured environment variables."
      },
      {
        id: "seranking",
        name: "SE Ranking",
        description: "Visibility tracking, keyword rank data, and AI-share-of-voice reports.",
        category: "monitoring",
        installHint: "Enable the SE Ranking integration and add the required API tokens."
      },
      {
        id: "profound",
        name: "Profound",
        description: "LLM citation and brand mention monitoring across AI answer surfaces.",
        category: "monitoring",
        installHint: "Connect the Profound tracker and configure the reporting endpoint."
      },
      {
        id: "bing",
        name: "Bing Webmaster",
        description: "Bing indexing, URL submission, and site ownership verification support.",
        category: "tech",
        installHint: "Add Bing Webmaster credentials and verify ownership for the target domain."
      },
      {
        id: "indexnow",
        name: "IndexNow",
        description: "Ping search engines when new content is published.",
        category: "tech",
        installHint: "Set the publishing index host and key in your site configuration."
      },
      {
        id: "unlighthouse",
        name: "Unlighthouse",
        description: "Bulk Lighthouse auditing for content and technical performance review.",
        category: "monitoring",
        installHint: "Install the Unlighthouse CLI and point it at your site URLs."
      }
    ];
  }
});

// lib/pexels-client.ts
import https3 from "https";
function fetchPexelsImage(query) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
    const req = https3.get(url, { headers: { Authorization: apiKey } }, (res) => {
      let data = "";
      res.on("data", (d) => data += d);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const photo = json.photos?.[0];
          if (!photo) return resolve(null);
          resolve({
            url: photo.src.large2x,
            alt: photo.alt || query,
            photographer: photo.photographer,
            credit: `${photo.photographer} / Pexels`,
            source: "pexels"
          });
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(8e3, () => {
      req.destroy();
      resolve(null);
    });
  });
}
function fetchUnsplashImage(query) {
  const apiKey = process.env.UNSPLASH_API_KEY || process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!apiKey) return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
    const req = https3.get(url, { headers: { Authorization: `Client-ID ${apiKey}` } }, (res) => {
      let data = "";
      res.on("data", (d) => data += d);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const photo = json.results?.[0];
          if (!photo) return resolve(null);
          resolve({
            url: photo.urls.regular,
            alt: photo.alt_description || query,
            photographer: photo.user.name,
            credit: `${photo.user.name} / Unsplash`,
            source: "unsplash"
          });
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(8e3, () => {
      req.destroy();
      resolve(null);
    });
  });
}
async function fetchBestImage(query) {
  const pexels = await fetchPexelsImage(query);
  if (pexels) return pexels;
  return fetchUnsplashImage(query);
}
var init_pexels_client = __esm({
  "lib/pexels-client.ts"() {
    "use strict";
  }
});

// lib/ubersuggest-client.ts
import fs10 from "fs";
import path8 from "path";
function cachePath() {
  return loadConfig().keywordCachePath;
}
function loadCache() {
  try {
    const p = cachePath();
    if (fs10.existsSync(p)) {
      return JSON.parse(fs10.readFileSync(p, "utf8"));
    }
  } catch {
  }
  return [];
}
function findRoot3() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs10.existsSync(path8.join(dir, "seoflow.config.json"))) return dir;
    const p = path8.dirname(dir);
    if (p === dir) break;
    dir = p;
  }
  return process.cwd();
}
async function researchKeywords(seed, slug, context) {
  const cache = loadCache();
  const cached = cache.find((c) => c.slug === slug && c.seed === seed);
  if (cached) {
    console.log(`     \u{1F4CA} Ubersuggest: using cached results for "${seed}" (cached: ${cached.cachedAt})`);
    return cached.result;
  }
  printMcpCommand(seed, slug, context);
  return {
    focusKeyword: seed,
    suggestions: [],
    relatedKeywords: [],
    searchVolume: 0,
    difficulty: 0,
    clusterScore: 0,
    source: "unavailable"
  };
}
function printMcpCommand(seed, slug, context) {
  const divider = "\u2500".repeat(60);
  console.log(`
${divider}`);
  console.log(`     \u{1F511} KEYWORD RESEARCH NEEDED`);
  console.log(`${divider}`);
  console.log(`     Post: ${slug}`);
  console.log(`     Seed: "${seed}"`);
  console.log(`     Context: ${context || "travel blog post"}`);
  console.log(``);
  console.log(`     The Ubersuggest MCP uses OAuth and can only be called`);
  console.log(`     from within a Claude Code session.`);
  console.log(``);
  console.log(`     Step 1: Run this command in this Claude session:`);
  console.log(`     ${"".padEnd(5)}mcp__ubersuggest__keyword_ideas on "${seed}"`);
  console.log(``);
  console.log(`     Step 2: Save the result to data/keyword-research-cache.json:`);
  console.log(`     ${"".padEnd(5)}{"slug":"${slug}","seed":"${seed}","result":<MCP response>,"cachedAt":"$(date +%Y-%m-%d)"}`);
  console.log(`
${divider}
`);
}
var ROOT2;
var init_ubersuggest_client = __esm({
  "lib/ubersuggest-client.ts"() {
    "use strict";
    init_config();
    ROOT2 = findRoot3();
  }
});

// lib/python/python-manager.ts
import { exec, execSync } from "child_process";
import path9 from "path";
import fs11 from "fs";
import { promisify } from "util";
var execPromise, PythonManager;
var init_python_manager = __esm({
  "lib/python/python-manager.ts"() {
    "use strict";
    execPromise = promisify(exec);
    PythonManager = class _PythonManager {
      static pythonPath = "python3";
      static virtualEnvPath = null;
      static initialized = false;
      /**
       * Initialize Python manager with configuration
       */
      static initialize(config) {
        if (config?.pythonPath) {
          _PythonManager.pythonPath = config.pythonPath;
        }
        if (config?.virtualEnvPath) {
          _PythonManager.virtualEnvPath = config.virtualEnvPath;
        }
        _PythonManager.initialized = true;
      }
      /**
       * Get the Python interpreter path (including virtual environment if configured)
       */
      static getPythonPath() {
        if (_PythonManager.virtualEnvPath) {
          if (process.platform === "win32") {
            return path9.join(_PythonManager.virtualEnvPath, "Scripts", "python.exe");
          } else {
            return path9.join(_PythonManager.virtualEnvPath, "bin", "python");
          }
        }
        return _PythonManager.pythonPath;
      }
      /**
       * Check if Python is available
       */
      static isPythonAvailable() {
        try {
          execSync(`${this.getPythonPath()} --version`, { stdio: "ignore" });
          return true;
        } catch (error) {
          return false;
        }
      }
      /**
       * Check if a specific Python package is installed
       */
      static isPackageInstalled(packageName) {
        try {
          execSync(`${this.getPythonPath()} -c "import ${packageName}"`, { stdio: "ignore" });
          return true;
        } catch (error) {
          return false;
        }
      }
      /**
       * Run a Python script with optional arguments
       */
      static run(options) {
        const { scriptName, args = [], timeout = 6e4, workingDir = process.cwd() } = options;
        const scriptPath = path9.resolve(workingDir, "python", `${scriptName}.py`);
        if (!fs11.existsSync(scriptPath)) {
          return {
            stdout: "",
            stderr: `Script not found: ${scriptPath}`,
            code: 1,
            error: new Error(`Script not found: ${scriptPath}`)
          };
        }
        const pythonPath = this.getPythonPath();
        const command = `${pythonPath} "${scriptPath}" ${args.join(" ")}`;
        try {
          const result = execSync(command, {
            encoding: "utf8",
            cwd: workingDir,
            timeout,
            stdio: ["pipe", "pipe", "pipe"]
          });
          return {
            stdout: result,
            stderr: "",
            code: 0
          };
        } catch (error) {
          return {
            stdout: error.stdout || "",
            stderr: error.stderr || error.message,
            code: error.status || 1,
            error
          };
        }
      }
      /**
       * Run a Python script asynchronously
       */
      static async runAsync(options) {
        const { scriptName, args = [], timeout = 6e4, workingDir = process.cwd() } = options;
        const scriptPath = path9.resolve(workingDir, "python", `${scriptName}.py`);
        if (!fs11.existsSync(scriptPath)) {
          return Promise.resolve({
            stdout: "",
            stderr: `Script not found: ${scriptPath}`,
            code: 1,
            error: new Error(`Script not found: ${scriptPath}`)
          });
        }
        const pythonPath = this.getPythonPath();
        const command = `${pythonPath} "${scriptPath}" ${args.join(" ")}`;
        try {
          const result = await execPromise(command, {
            cwd: workingDir,
            timeout
          });
          return {
            stdout: result.stdout,
            stderr: result.stderr,
            code: 0
          };
        } catch (error) {
          return {
            stdout: error.stdout || "",
            stderr: error.stderr || error.message,
            code: error.code || 1,
            error
          };
        }
      }
      /**
       * Run pip commands
       */
      static runPip(command) {
        const pipCommand = `${this.getPythonPath()} -m pip ${command}`;
        try {
          const result = execSync(pipCommand, { encoding: "utf8" });
          return {
            stdout: result,
            stderr: "",
            code: 0
          };
        } catch (error) {
          return {
            stdout: error.stdout || "",
            stderr: error.stderr || error.message,
            code: error.status || 1,
            error
          };
        }
      }
      /**
       * Install dependencies from requirements.txt
       */
      static installDependencies(requirementsPath = "python/requirements.txt") {
        if (!fs11.existsSync(requirementsPath)) {
          return {
            stdout: "",
            stderr: `Requirements file not found: ${requirementsPath}`,
            code: 1,
            error: new Error(`Requirements file not found: ${requirementsPath}`)
          };
        }
        return this.runPip(`install -r "${requirementsPath}"`);
      }
      /**
       * Check if all required dependencies are installed
       */
      static checkDependencies() {
        const requirementsPath = "python/requirements.txt";
        if (!fs11.existsSync(requirementsPath)) {
          return { missing: ["requirements.txt file not found"], installed: [] };
        }
        const requirements = fs11.readFileSync(requirementsPath, "utf8").split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line) => line.split(/[<>=]/)[0].trim());
        const missing = [];
        const installed = [];
        requirements.forEach((packageName) => {
          if (this.isPackageInstalled(packageName)) {
            installed.push(packageName);
          } else {
            missing.push(packageName);
          }
        });
        return { missing, installed };
      }
    };
    PythonManager.initialize();
  }
});

// lib/semrush-client.ts
async function researchKeywords2(seed, context = "") {
  return SEMrushClient.researchKeywords(seed, context);
}
var SEMrushClient;
var init_semrush_client = __esm({
  "lib/semrush-client.ts"() {
    "use strict";
    init_python_manager();
    SEMrushClient = class {
      /**
       * Check if SEMrush API key is available
       */
      static hasKey() {
        return !!process.env.SEMRUSH_API_KEY;
      }
      /**
       * Research keywords using SEMrush
       */
      static async researchKeywords(seed, context = "") {
        try {
          if (!this.hasKey()) {
            return this.fallbackResearch(seed);
          }
          if (!PythonManager.isPythonAvailable()) {
            return this.fallbackResearch(seed);
          }
          const result = PythonManager.run({
            scriptName: "semrush_keywords",
            args: [
              `--seed "${this.escapeQuotes(seed)}"`,
              `--context "${this.escapeQuotes(context)}"`,
              `--api-key "${process.env.SEMRUSH_API_KEY}"`,
              "--json"
            ],
            timeout: 6e4
          });
          if (result.code === 0) {
            const data = JSON.parse(result.stdout);
            return {
              focusKeyword: data.focusKeyword || seed,
              searchVolume: data.searchVolume || 0,
              difficulty: data.difficulty || 0,
              relatedKeywords: data.relatedKeywords || [],
              source: "semrush"
            };
          } else {
            console.error("SEMrush research failed:", result.stderr);
            return this.fallbackResearch(seed);
          }
        } catch (error) {
          console.error("SEMrush research error:", error.message);
          return this.fallbackResearch(seed);
        }
      }
      /**
       * Fallback research using basic keyword extraction
       */
      static fallbackResearch(seed) {
        return {
          focusKeyword: seed,
          searchVolume: 0,
          difficulty: 0,
          relatedKeywords: [],
          source: "fallback"
        };
      }
      /**
       * Escape quotes for shell command
       */
      static escapeQuotes(text) {
        return text.replace(/"/g, '\\"').replace(/\n/g, "\\n");
      }
    };
  }
});

// lib/ahrefs-client.ts
async function researchKeywords3(seed, context = "") {
  return AhrefsClient.researchKeywords(seed, context);
}
var AhrefsClient;
var init_ahrefs_client = __esm({
  "lib/ahrefs-client.ts"() {
    "use strict";
    init_python_manager();
    AhrefsClient = class {
      /**
       * Check if Ahrefs API key is available
       */
      static hasKey() {
        return !!process.env.AHREFS_API_KEY;
      }
      /**
       * Research keywords using Ahrefs
       */
      static async researchKeywords(seed, context = "") {
        try {
          if (!this.hasKey()) {
            return this.fallbackResearch(seed);
          }
          if (!PythonManager.isPythonAvailable()) {
            return this.fallbackResearch(seed);
          }
          const result = PythonManager.run({
            scriptName: "ahrefs_keywords",
            args: [
              `--seed "${this.escapeQuotes(seed)}"`,
              `--context "${this.escapeQuotes(context)}"`,
              `--api-key "${process.env.AHREFS_API_KEY}"`,
              "--json"
            ],
            timeout: 6e4
          });
          if (result.code === 0) {
            const data = JSON.parse(result.stdout);
            return {
              focusKeyword: data.focusKeyword || seed,
              searchVolume: data.searchVolume || 0,
              difficulty: data.difficulty || 0,
              relatedKeywords: data.relatedKeywords || [],
              source: "ahrefs"
            };
          } else {
            console.error("Ahrefs research failed:", result.stderr);
            return this.fallbackResearch(seed);
          }
        } catch (error) {
          console.error("Ahrefs research error:", error.message);
          return this.fallbackResearch(seed);
        }
      }
      /**
       * Fallback research using basic keyword extraction
       */
      static fallbackResearch(seed) {
        return {
          focusKeyword: seed,
          searchVolume: 0,
          difficulty: 0,
          relatedKeywords: [],
          source: "fallback"
        };
      }
      /**
       * Escape quotes for shell command
       */
      static escapeQuotes(text) {
        return text.replace(/"/g, '\\"').replace(/\n/g, "\\n");
      }
    };
  }
});

// lib/schema.ts
function detectSchemaType(fm, content) {
  if (fm.schema) {
    const schema = fm.schema.toLowerCase();
    if (schema.includes("faq")) return "FAQPage";
    if (schema.includes("product")) return "Product";
    if (schema.includes("local")) return "LocalBusiness";
    if (schema.includes("travel") || schema.includes("guide")) return "TravelGuide";
    if (schema.includes("review")) return "Review";
    if (schema.includes("blog")) return "BlogPosting";
    if (schema.includes("news")) return "NewsArticle";
    if (schema.includes("service")) return "Service";
    if (schema.includes("event")) return "Event";
    if (schema.includes("job")) return "JobPosting";
    if (schema.includes("course")) return "Course";
    if (schema.includes("forum")) return "DiscussionForumPosting";
    if (schema.includes("organization")) return "Organization";
    if (schema.includes("website")) return "WebSite";
    if (schema.includes("webpage")) return "WebPage";
    if (schema.includes("article")) return "Article";
  }
  const title = (fm.title || "").toLowerCase();
  const tags = (fm.tags || []).join(" ").toLowerCase();
  const contentLower = content.toLowerCase();
  if (title.includes("review") || tags.includes("review") || contentLower.includes("review")) {
    return "Review";
  }
  if (title.includes("faq") || title.includes("questions") || contentLower.includes("faq")) {
    return "FAQPage";
  }
  if (title.includes("guide") || title.includes("things to do") || title.includes("tips")) {
    return "TravelGuide";
  }
  if (title.includes("blog") || contentLower.includes("blog")) {
    return "BlogPosting";
  }
  if (title.includes("news") || contentLower.includes("breaking") || contentLower.includes("news")) {
    return "NewsArticle";
  }
  return "Article";
}
function generateArticleSchema(fm) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fm.title || "",
    description: fm.description || "",
    author: {
      "@type": "Person",
      name: fm.author || "Unknown"
    },
    datePublished: fm.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    dateModified: fm.lastModified || fm.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fm.slug || ""
    }
  };
  if (fm.category) {
    schema.articleSection = fm.category;
  }
  if (fm.tags && fm.tags.length > 0) {
    schema.keywords = fm.tags.join(", ");
  }
  return schema;
}
function generateFAQSchema(fm, content) {
  const faqSections = extractFAQSections(content);
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqSections.map((section) => ({
      "@type": "Question",
      name: section.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: section.answer
      }
    }))
  };
  return schema;
}
function generateProductSchema(fm) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: fm.title || "",
    description: fm.description || ""
  };
  if (fm.price) {
    schema.offers = {
      "@type": "Offer",
      price: fm.price,
      priceCurrency: "USD",
      // Default
      availability: "https://schema.org/InStock"
    };
  }
  if (fm.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: fm.rating,
      reviewCount: fm.reviewCount || 0
    };
  }
  return schema;
}
function generateLocalBusinessSchema(fm) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: fm.title || "",
    description: fm.description || ""
  };
  if (fm.address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: fm.address.street || "",
      addressLocality: fm.address.city || "",
      addressRegion: fm.address.state || "",
      postalCode: fm.address.zip || "",
      addressCountry: fm.address.country || "US"
    };
  }
  if (fm.phone) {
    schema.telephone = fm.phone;
  }
  if (fm.geo) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: fm.geo.latitude,
      longitude: fm.geo.longitude
    };
  }
  return schema;
}
function generateTravelGuideSchema(fm) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "TravelGuide",
    name: fm.title || "",
    description: fm.description || "",
    destination: fm.category || fm.tags?.[0] || ""
  };
  return schema;
}
function generateReviewSchema(fm) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "Product",
      name: fm.title || ""
    },
    author: {
      "@type": "Person",
      name: fm.author || "Unknown"
    },
    datePublished: fm.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
  if (fm.rating) {
    schema.reviewRating = {
      "@type": "Rating",
      ratingValue: fm.rating,
      bestRating: 5
    };
  }
  return schema;
}
function extractFAQSections(content) {
  const faqs = [];
  const faqPattern = /###?\s*Q:?\s*(.*?)(?:\n|$)([\s\S]*?)(?=###?\s*Q:|$)/g;
  let match;
  while ((match = faqPattern.exec(content)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    if (question && answer) {
      faqs.push({ question, answer });
    }
  }
  return faqs;
}
function generateWebSiteSchema(fm) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: fm.siteName || "",
    url: fm.siteUrl || "",
    potentialAction: {
      "@type": "SearchAction",
      target: `${fm.siteUrl || ""}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}
function generateWebPageSchema(fm) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: fm.title || "",
    description: fm.description || "",
    url: fm.slug || ""
  };
}
function generateOrganizationSchema(fm) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: fm.organization || "",
    url: fm.siteUrl || ""
  };
  if (fm.logo) {
    schema.logo = fm.logo;
  }
  if (fm.contactEmail || fm.phone) {
    schema.contactPoint = {
      "@type": "ContactPoint",
      telephone: fm.phone || "",
      email: fm.contactEmail || "",
      contactType: "customer service"
    };
  }
  if (fm.socialLinks) {
    schema.sameAs = Object.values(fm.socialLinks);
  }
  return schema;
}
function generateBlogPostingSchema(fm) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: fm.title || "",
    description: fm.description || "",
    author: {
      "@type": "Person",
      name: fm.author || "Unknown"
    },
    datePublished: fm.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    dateModified: fm.lastModified || fm.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fm.slug || ""
    }
  };
  if (fm.category) {
    schema.articleSection = fm.category;
  }
  if (fm.tags && fm.tags.length > 0) {
    schema.keywords = fm.tags.join(", ");
  }
  return schema;
}
function generateNewsArticleSchema(fm) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: fm.title || "",
    description: fm.description || "",
    author: {
      "@type": "Person",
      name: fm.author || "Unknown"
    },
    datePublished: fm.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    dateModified: fm.lastModified || fm.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fm.slug || ""
    },
    publisher: {
      "@type": "Organization",
      name: fm.organization || "",
      logo: {
        "@type": "ImageObject",
        url: fm.logo || ""
      }
    }
  };
  if (fm.category) {
    schema.articleSection = fm.category;
  }
  if (fm.tags && fm.tags.length > 0) {
    schema.keywords = fm.tags.join(", ");
  }
  return schema;
}
function generateServiceSchema(fm) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: fm.title || "",
    description: fm.description || "",
    provider: {
      "@type": "Organization",
      name: fm.organization || ""
    }
  };
}
function generateEventSchema(fm) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: fm.title || "",
    description: fm.description || "",
    startDate: fm.startDate || "",
    endDate: fm.endDate || ""
  };
  if (fm.location) {
    schema.location = {
      "@type": "Place",
      name: fm.location.name || "",
      address: {
        "@type": "PostalAddress",
        streetAddress: fm.location.street || "",
        addressLocality: fm.location.city || "",
        addressRegion: fm.location.state || "",
        postalCode: fm.location.zip || "",
        addressCountry: fm.location.country || "US"
      }
    };
  }
  return schema;
}
function generateJobPostingSchema(fm) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: fm.title || "",
    description: fm.description || "",
    datePosted: fm.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    employmentType: fm.employmentType || "FULL_TIME"
  };
  if (fm.location) {
    schema.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: fm.location.street || "",
        addressLocality: fm.location.city || "",
        addressRegion: fm.location.state || "",
        postalCode: fm.location.zip || "",
        addressCountry: fm.location.country || "US"
      }
    };
  }
  if (fm.salary) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: fm.salary.currency || "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: fm.salary.min || 0,
        maxValue: fm.salary.max || 0,
        unitText: "YEAR"
      }
    };
  }
  return schema;
}
function generateCourseSchema(fm) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: fm.title || "",
    description: fm.description || "",
    provider: {
      "@type": "Organization",
      name: fm.organization || ""
    }
  };
}
function generateDiscussionForumPostingSchema(fm) {
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: fm.title || "",
    description: fm.description || "",
    author: {
      "@type": "Person",
      name: fm.author || "Unknown"
    },
    datePublished: fm.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    dateModified: fm.lastModified || fm.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
}
function generateSchema(fm, content) {
  const type = detectSchemaType(fm, content);
  switch (type) {
    case "FAQPage":
      return generateFAQSchema(fm, content);
    case "Product":
      return generateProductSchema(fm);
    case "LocalBusiness":
      return generateLocalBusinessSchema(fm);
    case "TravelGuide":
      return generateTravelGuideSchema(fm);
    case "Review":
      return generateReviewSchema(fm);
    case "BlogPosting":
      return generateBlogPostingSchema(fm);
    case "NewsArticle":
      return generateNewsArticleSchema(fm);
    case "Service":
      return generateServiceSchema(fm);
    case "Event":
      return generateEventSchema(fm);
    case "JobPosting":
      return generateJobPostingSchema(fm);
    case "Course":
      return generateCourseSchema(fm);
    case "DiscussionForumPosting":
      return generateDiscussionForumPostingSchema(fm);
    case "Organization":
      return generateOrganizationSchema(fm);
    case "WebSite":
      return generateWebSiteSchema(fm);
    case "WebPage":
      return generateWebPageSchema(fm);
    case "Article":
    default:
      return generateArticleSchema(fm);
  }
}
function validateSchema(schema) {
  const errors = [];
  const warnings = [];
  if (!schema["@context"] || schema["@context"] !== "https://schema.org") {
    errors.push("Missing or invalid @context");
  }
  if (!schema["@type"]) {
    errors.push("Missing @type");
  }
  const deprecatedTypes = ["HowTo", "SpecialAnnouncement", "CourseInfo", "EstimatedSalary", "LearningVideo", "ClaimReview", "VehicleListing", "PracticeProblem", "Dataset"];
  if (deprecatedTypes.includes(schema["@type"])) {
    errors.push(`${schema["@type"]} is a deprecated schema type and should not be used`);
  }
  if (schema["@type"] === "FAQPage") {
    warnings.push("FAQPage no longer appears as a rich result (Google May 2026 update), but still aids AI entity resolution");
  }
  switch (schema["@type"]) {
    case "Article":
    case "BlogPosting":
    case "NewsArticle":
      if (!schema.headline || schema.headline.length < 5) {
        errors.push(`${schema["@type"]} must have a valid headline`);
      }
      if (!schema.description || schema.description.length < 20) {
        errors.push(`${schema["@type"]} must have a valid description`);
      }
      if (!schema.author) {
        errors.push(`${schema["@type"]} must have an author`);
      }
      if (!schema.datePublished) {
        errors.push(`${schema["@type"]} must have a publication date`);
      }
      break;
    case "FAQPage":
      if (!schema.mainEntity || !Array.isArray(schema.mainEntity) || schema.mainEntity.length === 0) {
        errors.push("FAQPage must have at least one question");
      } else {
        schema.mainEntity.forEach((faq, idx) => {
          if (!faq["@type"] || faq["@type"] !== "Question") {
            errors.push(`FAQ ${idx + 1}: Must be a Question type`);
          }
          if (!faq.name || faq.name.length < 5) {
            errors.push(`FAQ ${idx + 1}: Question must be at least 5 characters`);
          }
          if (!faq.acceptedAnswer || !faq.acceptedAnswer.text) {
            errors.push(`FAQ ${idx + 1}: Must have an accepted answer`);
          }
        });
      }
      break;
    case "Product":
      if (!schema.name || schema.name.length < 2) {
        errors.push("Product must have a name");
      }
      if (!schema.description || schema.description.length < 20) {
        errors.push("Product must have a valid description");
      }
      if (schema.offers) {
        if (!schema.offers.price) {
          warnings.push("Product should have an offers.price for merchant listings");
        }
        if (!schema.offers.priceCurrency) {
          warnings.push("Product should have an offers.priceCurrency for merchant listings");
        }
      }
      break;
    case "Review":
      if (!schema.itemReviewed) {
        errors.push("Review must have an itemReviewed");
      }
      if (!schema.author) {
        errors.push("Review must have an author");
      }
      if (!schema.datePublished) {
        errors.push("Review must have a publication date");
      }
      if (!schema.reviewRating || !schema.reviewRating.ratingValue) {
        errors.push("Review must have a reviewRating with ratingValue");
      }
      break;
    case "LocalBusiness":
      if (!schema.name || schema.name.length < 2) {
        errors.push("LocalBusiness must have a name");
      }
      if (!schema.description || schema.description.length < 20) {
        errors.push("LocalBusiness must have a valid description");
      }
      if (!schema.address) {
        warnings.push("LocalBusiness should have an address");
      }
      if (!schema.telephone) {
        warnings.push("LocalBusiness should have a telephone");
      }
      break;
    case "WebSite":
      if (!schema.name || schema.name.length < 2) {
        errors.push("WebSite must have a name");
      }
      if (!schema.url || !schema.url.startsWith("http")) {
        errors.push("WebSite must have a valid URL");
      }
      break;
    case "WebPage":
      if (!schema.name || schema.name.length < 2) {
        errors.push("WebPage must have a name");
      }
      if (!schema.url || !schema.url.startsWith("http")) {
        errors.push("WebPage must have a valid URL");
      }
      break;
  }
  Object.entries(schema).forEach(([key, value]) => {
    if (typeof value === "string" && value.includes("[")) {
      warnings.push(`Property ${key} contains placeholder text`);
    }
    if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
      warnings.push(`Property ${key} should use absolute URL instead of relative path`);
    }
    if (key.includes("date") && typeof value === "string") {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(value) && key !== "description") {
        warnings.push(`Property ${key} should be in ISO 8601 format (YYYY-MM-DD)`);
      }
    }
  });
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
function formatSchema(schema) {
  return `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;
}
function extractSchema(content) {
  const schemaPattern = /<script type="application\/ld\+json">(.*?)<\/script>/s;
  const match = content.match(schemaPattern);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  return null;
}
function processSchema(fm, content) {
  const existingSchema = extractSchema(content);
  const schema = existingSchema || generateSchema(fm, content);
  const validation = validateSchema(schema);
  let updatedContent = content;
  const schemaTag = formatSchema(schema);
  if (existingSchema) {
    updatedContent = content.replace(/<script type="application\/ld\+json">.*?<\/script>/s, schemaTag);
  } else {
    if (content.includes("<head>")) {
      updatedContent = content.replace("<head>", `<head>
${schemaTag}`);
    } else {
      updatedContent = schemaTag + "\n" + content;
    }
  }
  return {
    schema,
    isValid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    updatedContent
  };
}
var init_schema = __esm({
  "lib/schema.ts"() {
    "use strict";
  }
});

// lib/technical/psi.ts
import { execSync as execSync2 } from "child_process";
import path10 from "path";
function getPSIInstance(apiKey) {
  if (!psiInstance) {
    psiInstance = new PageSpeedInsights(apiKey);
  }
  return psiInstance;
}
function validateUrl(url) {
  try {
    const scriptPath = path10.join(process.cwd(), "python", "url_safety.py");
    const cmd = `python3 ${scriptPath} --url "${url}"`;
    execSync2(cmd, { encoding: "utf8", stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
var PageSpeedInsights, psiInstance;
var init_psi = __esm({
  "lib/technical/psi.ts"() {
    "use strict";
    init_python_manager();
    PageSpeedInsights = class {
      apiKey;
      constructor(apiKey) {
        this.apiKey = apiKey;
      }
      /**
       * Runs PageSpeed Insights for a URL
       */
      async run(url, strategy = "mobile") {
        try {
          if (!PythonManager.isPythonAvailable()) {
            return this.mockResult(url, strategy);
          }
          const args = [
            `--url "${url}"`,
            `--strategy ${strategy}`
          ];
          if (this.apiKey) {
            args.push(`--api-key "${this.apiKey}"`);
          }
          args.push("--json");
          const result = PythonManager.run({
            scriptName: "pagespeed_check",
            args,
            timeout: 6e4
          });
          if (result.code === 0) {
            return JSON.parse(result.stdout);
          } else {
            console.error("PSI check failed:", result.stderr);
            return this.mockResult(url, strategy);
          }
        } catch (error) {
          console.error("PSI check failed:", error.message);
          return this.mockResult(url, strategy);
        }
      }
      /**
       * Gets CrUX (Chrome User Experience Report) data for a URL
       */
      async getCrUX(url) {
        try {
          if (!PythonManager.isPythonAvailable()) {
            return this.mockCrUXResult(url);
          }
          const args = [
            `--url "${url}"`,
            "--crux-only"
          ];
          if (this.apiKey) {
            args.push(`--api-key "${this.apiKey}"`);
          }
          args.push("--json");
          const result = PythonManager.run({
            scriptName: "pagespeed_check",
            args,
            timeout: 6e4
          });
          if (result.code === 0) {
            return JSON.parse(result.stdout);
          } else {
            console.error("CrUX check failed:", result.stderr);
            return this.mockCrUXResult(url);
          }
        } catch (error) {
          console.error("CrUX check failed:", error.message);
          return this.mockCrUXResult(url);
        }
      }
      /**
       * Gets LCP subparts breakdown
       */
      async getLCPBreakdown(url, strategy = "mobile") {
        try {
          if (!PythonManager.isPythonAvailable()) {
            return this.mockLCPBreakdown();
          }
          const args = [
            `--url "${url}"`,
            `--strategy ${strategy}`
          ];
          if (this.apiKey) {
            args.push(`--api-key "${this.apiKey}"`);
          }
          args.push("--json");
          const result = PythonManager.run({
            scriptName: "lcp_subparts",
            args,
            timeout: 6e4
          });
          if (result.code === 0) {
            return JSON.parse(result.stdout);
          } else {
            console.error("LCP breakdown failed:", result.stderr);
            return this.mockLCPBreakdown();
          }
        } catch (error) {
          console.error("LCP breakdown failed:", error.message);
          return this.mockLCPBreakdown();
        }
      }
      /**
       * Mocks PSI result for development/testing
       */
      mockResult(url, strategy) {
        return {
          lcp: 1.8,
          inp: 150,
          cls: 0.05,
          fcp: 0.9,
          tbt: 120,
          score: 92,
          url,
          device: strategy,
          strategy
        };
      }
      /**
       * Mocks CrUX result
       */
      mockCrUXResult(url) {
        return {
          lcp: 2.1,
          inp: 180,
          cls: 0.08,
          origin: new URL(url).origin,
          effectiveConnectionType: "4G",
          formFactor: "PHONE"
        };
      }
      /**
       * Mocks LCP breakdown
       */
      mockLCPBreakdown() {
        return {
          ttfb: 300,
          loadDelay: 400,
          loadDuration: 800,
          renderDelay: 300,
          total: 1800
        };
      }
    };
    psiInstance = null;
  }
});

// lib/technical/broken-links.ts
import fetch2 from "node-fetch";
async function checkBrokenLinks(url) {
  return BrokenLinksChecker.checkBrokenLinks(url);
}
async function checkRedirectChains(url) {
  return BrokenLinksChecker.checkRedirectChains(url);
}
var BrokenLinksChecker;
var init_broken_links = __esm({
  "lib/technical/broken-links.ts"() {
    "use strict";
    BrokenLinksChecker = class {
      /**
       * Check for broken links on a page
       */
      static async checkBrokenLinks(url) {
        try {
          const response = await fetch2(url);
          const html = await response.text();
          const links = this.extractLinks(html, url);
          return await this.runConcurrent(links, (link) => this.checkLink(link), 10);
        } catch (error) {
          console.error(`Failed to check broken links for ${url}:`, error.message);
          return [];
        }
      }
      /**
       * Check a single link
       */
      static async checkLink(url) {
        try {
          const response = await fetch2(url, {
            method: "HEAD",
            redirect: "follow"
          });
          return {
            url,
            status: response.status,
            statusText: response.statusText,
            isBroken: response.status >= 400
          };
        } catch (error) {
          return {
            url,
            status: 0,
            statusText: error.message,
            isBroken: true
          };
        }
      }
      /**
       * Check for redirect chains
       */
      static async checkRedirectChains(url) {
        try {
          const response = await fetch2(url);
          const html = await response.text();
          const links = this.extractLinks(html, url);
          return await this.runConcurrent(links, (link) => this.checkRedirectChain(link), 10);
        } catch (error) {
          console.error(`Failed to check redirect chains for ${url}:`, error.message);
          return [];
        }
      }
      /**
       * Check a single link's redirect chain
       */
      static async checkRedirectChain(url) {
        const chain = [];
        const seen = /* @__PURE__ */ new Set();
        try {
          let current = url;
          while (current) {
            if (seen.has(current)) {
              return {
                url,
                chain,
                isRedirectLoop: true,
                finalStatus: 0
              };
            }
            seen.add(current);
            chain.push(current);
            const response = await fetch2(current, {
              method: "HEAD",
              redirect: "manual"
            });
            if (response.status >= 300 && response.status < 400) {
              const location = response.headers.get("location");
              if (location) {
                current = this.resolveUrl(location, url);
              } else {
                break;
              }
            } else {
              break;
            }
          }
          return {
            url,
            chain,
            isRedirectLoop: false,
            finalStatus: chain.length > 1 ? 301 : 200
          };
        } catch (error) {
          return {
            url,
            chain,
            isRedirectLoop: false,
            finalStatus: 0
          };
        }
      }
      /**
       * Run tasks with a concurrency limit
       */
      static async runConcurrent(items, fn, concurrency) {
        const results = [];
        for (let i = 0; i < items.length; i += concurrency) {
          const batch = items.slice(i, i + concurrency);
          results.push(...await Promise.all(batch.map(fn)));
        }
        return results;
      }
      /**
       * Extract links from HTML
       */
      static extractLinks(html, baseUrl) {
        const linkPattern = /<a[^>]+href=["']([^"']+)["']/g;
        const links = [];
        let match;
        while ((match = linkPattern.exec(html)) !== null) {
          const href = match[1].trim();
          if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
            const absoluteUrl = this.resolveUrl(href, baseUrl);
            if (absoluteUrl) {
              links.push(absoluteUrl);
            }
          }
        }
        return [...new Set(links)];
      }
      /**
       * Resolve relative URL to absolute
       */
      static resolveUrl(relative, base) {
        try {
          return new URL(relative, base).toString();
        } catch {
          return null;
        }
      }
      /**
       * Check canonical tag on a page
       */
      static async checkCanonicalTag(url) {
        try {
          const response = await fetch2(url);
          const html = await response.text();
          const canonicalPattern = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i;
          const match = html.match(canonicalPattern);
          if (match) {
            const canonicalUrl = match[1].trim();
            return this.resolveUrl(canonicalUrl, url);
          }
          return null;
        } catch (error) {
          console.error(`Failed to check canonical tag for ${url}:`, error.message);
          return null;
        }
      }
      /**
       * Check hreflang tags on a page
       */
      static async checkHreflangTags(url) {
        try {
          const response = await fetch2(url);
          const html = await response.text();
          const hreflangPattern = /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["']/gi;
          const hreflangTags = [];
          let match;
          while ((match = hreflangPattern.exec(html)) !== null) {
            const lang = match[1].trim();
            const href = match[2].trim();
            const absoluteUrl = this.resolveUrl(href, url);
            if (absoluteUrl) {
              hreflangTags.push(`${lang}: ${absoluteUrl}`);
            }
          }
          return hreflangTags;
        } catch (error) {
          console.error(`Failed to check hreflang tags for ${url}:`, error.message);
          return [];
        }
      }
      /**
       * Check sitemap for errors
       */
      static async checkSitemap(url) {
        try {
          const sitemapUrl = new URL("/sitemap.xml", url).toString();
          const response = await fetch2(sitemapUrl);
          if (!response.ok) {
            return {
              valid: false,
              errors: [`Sitemap not found (${response.status} ${response.statusText})`],
              urls: []
            };
          }
          const xml = await response.text();
          if (!xml.startsWith("<?xml") && !xml.includes("<urlset")) {
            return {
              valid: false,
              errors: ["Not a valid sitemap XML"],
              urls: []
            };
          }
          const urlPattern = /<loc>([^<]+)<\/loc>/g;
          const urls = [];
          let match;
          while ((match = urlPattern.exec(xml)) !== null) {
            urls.push(match[1].trim());
          }
          return {
            valid: true,
            errors: [],
            urls
          };
        } catch (error) {
          return {
            valid: false,
            errors: [error.message],
            urls: []
          };
        }
      }
      /**
       * Check robots.txt for errors
       */
      static async checkRobotsTxt(url) {
        try {
          const robotsUrl = new URL("/robots.txt", url).toString();
          const response = await fetch2(robotsUrl);
          if (!response.ok) {
            return {
              valid: false,
              errors: [`Robots.txt not found (${response.status} ${response.statusText})`],
              rules: {}
            };
          }
          const content = await response.text();
          return {
            valid: true,
            errors: [],
            rules: this.parseRobotsTxt(content)
          };
        } catch (error) {
          return {
            valid: false,
            errors: [error.message],
            rules: {}
          };
        }
      }
      /**
       * Check if a page is mobile-friendly using Google's Mobile-Friendly Test API
       */
      static async checkMobileFriendly(url) {
        try {
          const response = await fetch2(url);
          const html = await response.text();
          const viewportPattern = /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i;
          const viewportMatch = html.match(viewportPattern);
          if (!viewportMatch) {
            return {
              isMobileFriendly: false,
              errors: ["Missing viewport meta tag"]
            };
          }
          const viewportContent = viewportMatch[1].toLowerCase();
          if (!viewportContent.includes("width=device-width") || !viewportContent.includes("initial-scale=1")) {
            return {
              isMobileFriendly: false,
              errors: ["Viewport meta tag is not properly configured for mobile devices"]
            };
          }
          return {
            isMobileFriendly: true,
            errors: []
          };
        } catch (error) {
          console.error(`Failed to check mobile-friendliness for ${url}:`, error.message);
          return {
            isMobileFriendly: false,
            errors: [error.message]
          };
        }
      }
      /**
       * Parse robots.txt content
       */
      static parseRobotsTxt(content) {
        const lines = content.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
        const rules = {};
        let currentUserAgent = "*";
        rules[currentUserAgent] = { allow: [], disallow: [] };
        for (const line of lines) {
          const [key, value] = line.split(":").map((s) => s.trim());
          if (key.toLowerCase() === "user-agent") {
            currentUserAgent = value;
            if (!rules[currentUserAgent]) {
              rules[currentUserAgent] = { allow: [], disallow: [] };
            }
          } else if (key.toLowerCase() === "allow") {
            rules[currentUserAgent].allow.push(value);
          } else if (key.toLowerCase() === "disallow") {
            rules[currentUserAgent].disallow.push(value);
          } else if (key.toLowerCase() === "sitemap") {
            if (!rules.sitemaps) rules.sitemaps = [];
            rules.sitemaps.push(value);
          }
        }
        return rules;
      }
    };
  }
});

// pipeline/technical.ts
async function stepTechnicalAudit(input) {
  const changes = [];
  if (!validateUrl(input.slug)) {
    changes.push("\u26A0\uFE0F  URL validation failed");
    return { content: input.content, frontmatter: input.frontmatter, changes };
  }
  const psi = getPSIInstance(process.env.GOOGLE_API_KEY);
  try {
    console.log(`     \u{1F4CA} Running technical SEO audit for ${input.slug}`);
    const [psiResult, cruxResult, lcpBreakdown, brokenLinks, redirectChains, canonicalTag, hreflangTags, sitemapResult, robotsResult, mobileResult] = await Promise.all([
      psi.run(input.slug),
      psi.getCrUX(input.slug),
      psi.getLCPBreakdown(input.slug),
      checkBrokenLinks(input.slug),
      checkRedirectChains(input.slug),
      checkCanonicalTag(input.slug),
      checkHreflangTags(input.slug),
      checkSitemap(input.slug),
      checkRobotsTxt(input.slug),
      checkMobileFriendly(input.slug)
    ]);
    const auditResult = analyzeTechnicalData(psiResult, cruxResult, lcpBreakdown, brokenLinks, redirectChains, canonicalTag, hreflangTags, sitemapResult, robotsResult);
    if (auditResult.issues.length > 0) {
      changes.push(`\u{1F534} Technical issues found: ${auditResult.issues.length}`);
      auditResult.issues.forEach((issue) => changes.push(`   \u2022 ${issue}`));
    }
    if (auditResult.warnings.length > 0) {
      changes.push(`\u26A0\uFE0F  Technical warnings: ${auditResult.warnings.length}`);
      auditResult.warnings.forEach((warning) => changes.push(`   \u2022 ${warning}`));
    }
    if (auditResult.quickWins.length > 0) {
      changes.push(`\u2705 Quick wins: ${auditResult.quickWins.length}`);
      auditResult.quickWins.forEach((win) => changes.push(`   \u2022 ${win}`));
    }
    changes.push(`\u{1F4C8} PSI score: ${auditResult.psi.score}/100 (LCP: ${auditResult.psi.lcp}s, INP: ${auditResult.psi.inp}ms, CLS: ${auditResult.psi.cls})`);
    if (auditResult.crux) {
      changes.push(`\u{1F310} CrUX: LCP ${auditResult.crux.lcp}s, INP ${auditResult.crux.inp}ms, CLS ${auditResult.crux.cls}`);
    }
    return {
      content: input.content,
      frontmatter: input.frontmatter,
      changes,
      data: auditResult
    };
  } catch (error) {
    console.error(`     \u274C Technical audit failed: ${error.message}`);
    changes.push(`\u26A0\uFE0F  Technical audit failed: ${error.message}`);
    return { content: input.content, frontmatter: input.frontmatter, changes };
  }
}
function analyzeTechnicalData(psi, crux, lcpBreakdown, brokenLinks, redirectChains, canonicalTag, hreflangTags, sitemapResult, robotsResult, mobileResult) {
  const issues = [];
  const warnings = [];
  const quickWins = [];
  if (sitemapResult) {
    if (!sitemapResult.valid) {
      issues.push(`Sitemap errors: ${sitemapResult.errors.join(", ")}`);
    } else {
      quickWins.push(`Sitemap valid (${sitemapResult.urls.length} URLs)`);
    }
  }
  if (robotsResult) {
    if (!robotsResult.valid) {
      issues.push(`Robots.txt errors: ${robotsResult.errors.join(", ")}`);
    } else {
      quickWins.push("Robots.txt valid");
    }
  }
  if (mobileResult) {
    if (!mobileResult.isMobileFriendly) {
      issues.push(`Mobile-friendliness errors: ${mobileResult.errors.join(", ")}`);
    } else {
      quickWins.push("Page is mobile-friendly");
    }
  }
  if (canonicalTag) {
    const expectedCanonical = psi.url;
    if (canonicalTag !== expectedCanonical) {
      warnings.push(`Canonical tag mismatch: ${canonicalTag} (expected: ${expectedCanonical})`);
    } else {
      quickWins.push("Canonical tag is correct");
    }
  } else {
    warnings.push("No canonical tag found");
  }
  if (hreflangTags && hreflangTags.length > 0) {
    quickWins.push(`Found ${hreflangTags.length} hreflang tags`);
  }
  if (brokenLinks && brokenLinks.length > 0) {
    const broken = brokenLinks.filter((link) => link.isBroken);
    if (broken.length > 0) {
      issues.push(`Found ${broken.length} broken links`);
      broken.forEach((link) => {
        issues.push(`  \u2022 ${link.url} (${link.status} ${link.statusText})`);
      });
    }
  }
  if (redirectChains && redirectChains.length > 0) {
    const longChains = redirectChains.filter((chain) => chain.chain.length > 2);
    if (longChains.length > 0) {
      warnings.push(`Found ${longChains.length} long redirect chains`);
      longChains.forEach((chain) => {
        warnings.push(`  \u2022 ${chain.url} (${chain.chain.length} redirects)`);
      });
    }
    const loops = redirectChains.filter((chain) => chain.isRedirectLoop);
    if (loops.length > 0) {
      issues.push(`Found ${loops.length} redirect loops`);
      loops.forEach((loop) => {
        issues.push(`  \u2022 ${loop.url} (redirect loop)`);
      });
    }
  }
  const CWV_THRESHOLDS = {
    lcp: { good: 2.5, poor: 4 },
    inp: { good: 200, poor: 500 },
    cls: { good: 0.1, poor: 0.25 }
  };
  if (psi.lcp > CWV_THRESHOLDS.lcp.poor) {
    issues.push(`LCP is poor (${psi.lcp}s)`);
  } else if (psi.lcp > CWV_THRESHOLDS.lcp.good) {
    warnings.push(`LCP needs improvement (${psi.lcp}s)`);
  }
  if (psi.inp > CWV_THRESHOLDS.inp.poor) {
    issues.push(`INP is poor (${psi.inp}ms)`);
  } else if (psi.inp > CWV_THRESHOLDS.inp.good) {
    warnings.push(`INP needs improvement (${psi.inp}ms)`);
  }
  if (psi.cls > CWV_THRESHOLDS.cls.poor) {
    issues.push(`CLS is poor (${psi.cls})`);
  } else if (psi.cls > CWV_THRESHOLDS.cls.good) {
    warnings.push(`CLS needs improvement (${psi.cls})`);
  }
  if (crux) {
    if (crux.lcp > CWV_THRESHOLDS.lcp.poor) {
      issues.push(`Field LCP is poor (${crux.lcp}s)`);
    } else if (crux.lcp > CWV_THRESHOLDS.lcp.good) {
      warnings.push(`Field LCP needs improvement (${crux.lcp}s)`);
    }
    if (crux.inp > CWV_THRESHOLDS.inp.poor) {
      issues.push(`Field INP is poor (${crux.inp}ms)`);
    } else if (crux.inp > CWV_THRESHOLDS.inp.good) {
      warnings.push(`Field INP needs improvement (${crux.inp}ms)`);
    }
    if (crux.cls > CWV_THRESHOLDS.cls.poor) {
      issues.push(`Field CLS is poor (${crux.cls})`);
    } else if (crux.cls > CWV_THRESHOLDS.cls.good) {
      warnings.push(`Field CLS needs improvement (${crux.cls})`);
    }
  }
  if (lcpBreakdown) {
    if (lcpBreakdown.ttfb > 800) {
      warnings.push(`TTFB is high (${lcpBreakdown.ttfb}ms)`);
      quickWins.push("Optimize server response time");
    }
    if (lcpBreakdown.loadDuration > 1e3) {
      warnings.push(`LCP load duration is high (${lcpBreakdown.loadDuration}ms)`);
      quickWins.push("Optimize LCP image/video");
    }
  }
  if (psi.score < 50) {
    issues.push(`Overall PSI score is poor (${psi.score}/100)`);
  } else if (psi.score < 85) {
    warnings.push(`Overall PSI score needs improvement (${psi.score}/100)`);
  } else {
    quickWins.push("PSI score is excellent!");
  }
  return {
    psi,
    crux,
    lcpBreakdown,
    brokenLinks,
    redirectChains,
    sitemap: sitemapResult,
    robots: robotsResult,
    mobile: mobileResult,
    issues,
    warnings,
    quickWins
  };
}
var init_technical = __esm({
  "pipeline/technical.ts"() {
    "use strict";
    init_psi();
    init_broken_links();
  }
});

// lib/content-quality/content-quality.ts
var ContentQualityAnalyzer;
var init_content_quality = __esm({
  "lib/content-quality/content-quality.ts"() {
    "use strict";
    init_python_manager();
    ContentQualityAnalyzer = class {
      /**
       * Analyzes content quality and E-E-A-T
       */
      static analyze(text, title, category) {
        try {
          if (!PythonManager.isPythonAvailable()) {
            return this.mockQualityResult(text);
          }
          const args = [
            `--text "${this.escapeQuotes(text)}"`
          ];
          if (title) {
            args.push(`--title "${this.escapeQuotes(title)}"`);
          }
          if (category) {
            args.push(`--category "${this.escapeQuotes(category)}"`);
          }
          args.push("--json");
          const result = PythonManager.run({
            scriptName: "content_quality",
            args,
            timeout: 6e4
          });
          if (result.code === 0) {
            return JSON.parse(result.stdout);
          } else {
            console.error("Content quality analysis failed:", result.stderr);
            return this.mockQualityResult(text);
          }
        } catch (error) {
          console.error("Content quality analysis failed:", error.message);
          return this.mockQualityResult(text);
        }
      }
      /**
       * Humanizes AI-generated content
       */
      static humanize(text) {
        try {
          if (!PythonManager.isPythonAvailable()) {
            return {
              originalText: text,
              humanizedText: text,
              changesMade: 0,
              aiPatternsRemoved: []
            };
          }
          const result = PythonManager.run({
            scriptName: "content_humanize",
            args: [
              `--text "${this.escapeQuotes(text)}"`,
              "--json"
            ],
            timeout: 6e4
          });
          if (result.code === 0) {
            return JSON.parse(result.stdout);
          } else {
            console.error("Content humanization failed:", result.stderr);
            return {
              originalText: text,
              humanizedText: text,
              changesMade: 0,
              aiPatternsRemoved: []
            };
          }
        } catch (error) {
          console.error("Content humanization failed:", error.message);
          return {
            originalText: text,
            humanizedText: text,
            changesMade: 0,
            aiPatternsRemoved: []
          };
        }
      }
      /**
       * Verifies content claims
       */
      static verify(text, title) {
        try {
          if (!PythonManager.isPythonAvailable()) {
            return {
              claims: [],
              verifiedClaims: 0,
              claimsNeedingCitation: 0,
              factCheckResults: []
            };
          }
          const args = [
            `--text "${this.escapeQuotes(text)}"`
          ];
          if (title) {
            args.push(`--title "${this.escapeQuotes(title)}"`);
          }
          args.push("--json");
          const result = PythonManager.run({
            scriptName: "content_verify",
            args,
            timeout: 6e4
          });
          if (result.code === 0) {
            return JSON.parse(result.stdout);
          } else {
            console.error("Content verification failed:", result.stderr);
            return {
              claims: [],
              verifiedClaims: 0,
              claimsNeedingCitation: 0,
              factCheckResults: []
            };
          }
        } catch (error) {
          console.error("Content verification failed:", error.message);
          return {
            claims: [],
            verifiedClaims: 0,
            claimsNeedingCitation: 0,
            factCheckResults: []
          };
        }
      }
      /**
       * Escapes quotes for shell command
       */
      static escapeQuotes(text) {
        return text.replace(/"/g, '\\"').replace(/\n/g, "\\n");
      }
      /**
       * Mocks content quality result
       */
      static mockQualityResult(text) {
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        const hasPersonalExperience = /I\s+(have|had|went|visited|experienced)/i.test(text);
        const hasSpecificDetails = /\d+(\.\d+)?\s*(€|\$|£|km|miles|hours|days)/i.test(text);
        return {
          score: wordCount > 800 ? 85 : 65,
          eeatScore: hasPersonalExperience && hasSpecificDetails ? 90 : 70,
          readabilityScore: 75,
          fleschKincaidScore: 70,
          // Easy to read
          gunningFogScore: 10,
          // Easy to read
          colemanLiauScore: 10,
          // Easy to read
          issues: wordCount < 400 ? ["Content is too short"] : [],
          warnings: !hasPersonalExperience ? ["Lacks personal experience signals"] : [],
          improvements: wordCount > 1e3 ? ["Consider breaking into shorter sections"] : [],
          aiPatternCount: 0,
          fillerWords: [],
          claimsNeedingCitation: []
        };
      }
    };
  }
});

// pipeline/content-quality.ts
async function stepContentQualityAudit(input) {
  const changes = [];
  let modifiedContent = input.content;
  console.log(`     \u{1F4CA} Running content quality audit`);
  const qualityResult = ContentQualityAnalyzer.analyze(
    input.content,
    input.frontmatter.title,
    input.frontmatter.category
  );
  if (qualityResult.issues.length > 0) {
    changes.push(`\u{1F534} Content quality issues: ${qualityResult.issues.length}`);
    qualityResult.issues.forEach((issue) => changes.push(`   \u2022 ${issue}`));
  }
  if (qualityResult.warnings.length > 0) {
    changes.push(`\u26A0\uFE0F  Content quality warnings: ${qualityResult.warnings.length}`);
    qualityResult.warnings.forEach((warning) => changes.push(`   \u2022 ${warning}`));
  }
  if (qualityResult.improvements.length > 0) {
    changes.push(`\u2705 Content quality improvements: ${qualityResult.improvements.length}`);
    qualityResult.improvements.forEach((improvement) => changes.push(`   \u2022 ${improvement}`));
  }
  if (qualityResult.aiPatternCount > 0) {
    changes.push(`\u{1F916} Found ${qualityResult.aiPatternCount} AI patterns`);
  }
  if (qualityResult.claimsNeedingCitation.length > 0) {
    changes.push(`\u{1F4DA} ${qualityResult.claimsNeedingCitation.length} claims need citation`);
  }
  changes.push(`\u{1F4C8} Quality score: ${qualityResult.score}/100, E-E-A-T: ${qualityResult.eeatScore}/100, Readability: ${qualityResult.readabilityScore}/100`);
  changes.push(`\u{1F4CA} Flesch-Kincaid: ${qualityResult.fleschKincaidScore}, Gunning Fog: ${qualityResult.gunningFogScore}, Coleman-Liau: ${qualityResult.colemanLiauScore}`);
  if (qualityResult.aiPatternCount > 0) {
    const humanizeResult = ContentQualityAnalyzer.humanize(modifiedContent);
    if (humanizeResult.changesMade > 0) {
      modifiedContent = humanizeResult.humanizedText;
      changes.push(`\u2705 Humanized content: ${humanizeResult.changesMade} changes`);
      humanizeResult.aiPatternsRemoved.forEach((pattern) => changes.push(`   \u2022 Removed: ${pattern}`));
    }
  }
  if (qualityResult.claimsNeedingCitation.length > 0) {
    const verifyResult = ContentQualityAnalyzer.verify(
      modifiedContent,
      input.frontmatter.title
    );
    if (verifyResult.verifiedClaims > 0) {
      changes.push(`\u2705 Verified ${verifyResult.verifiedClaims} claims`);
    }
    if (verifyResult.claimsNeedingCitation > 0) {
      changes.push(`\u26A0\uFE0F  Still need citation for ${verifyResult.claimsNeedingCitation} claims`);
    }
  }
  return {
    content: modifiedContent,
    frontmatter: input.frontmatter,
    changes,
    data: {
      quality: qualityResult,
      changesMade: qualityResult.aiPatternCount > 0 ? 1 : 0
    }
  };
}
var init_content_quality2 = __esm({
  "pipeline/content-quality.ts"() {
    "use strict";
    init_content_quality();
  }
});

// lib/reports/pdf-generator.ts
import path11 from "path";
import fs12 from "fs";
var PDFGenerator;
var init_pdf_generator = __esm({
  "lib/reports/pdf-generator.ts"() {
    "use strict";
    init_python_manager();
    PDFGenerator = class {
      /**
       * Generates a PDF report using the Claude SEO report generator
       */
      static generate(data, outputPath) {
        const outputDir = path11.dirname(outputPath);
        if (!fs12.existsSync(outputDir)) {
          fs12.mkdirSync(outputDir, { recursive: true });
        }
        const tempDataPath = path11.join(outputDir, `temp-report-data-${Date.now()}.json`);
        fs12.writeFileSync(tempDataPath, JSON.stringify(data.data, null, 2));
        try {
          if (!PythonManager.isPythonAvailable()) {
            throw new Error("Python not available - install Python 3.10+");
          }
          const { missing } = PythonManager.checkDependencies();
          if (missing.length > 0) {
            console.warn(`Missing Python dependencies: ${missing.join(", ")}`);
            console.warn("Attempting to install dependencies...");
            const installResult = PythonManager.installDependencies();
            if (installResult.code !== 0) {
              throw new Error(`Failed to install dependencies: ${installResult.stderr}`);
            }
            console.log("Dependencies installed successfully");
          }
          const result = PythonManager.run({
            scriptName: "google_report",
            args: [
              `--type ${data.type}`,
              `--data "${tempDataPath}"`,
              `--domain ${data.domain}`,
              `--output "${outputPath}"`
            ],
            timeout: 12e4
            // 2 minutes
          });
          if (result.code === 0 && fs12.existsSync(outputPath)) {
            console.log(`PDF report generated successfully: ${outputPath}`);
            return outputPath;
          } else {
            const errorMsg = result.stderr || "PDF report generation failed - no file created";
            throw new Error(errorMsg);
          }
        } catch (error) {
          console.error("PDF generation error:", error);
          throw new Error(`PDF generation failed: ${error}`);
        } finally {
          if (fs12.existsSync(tempDataPath)) {
            fs12.unlinkSync(tempDataPath);
          }
        }
      }
      /**
       * Generates a simple PDF report with audit results
       */
      static generateSimpleReport(data, domain, outputPath) {
        const reportData = {
          type: "full",
          domain,
          data: {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            domain,
            ...data
          }
        };
        return this.generate(reportData, outputPath);
      }
      /**
       * Generates an audit report PDF
       */
      static generateAuditReport(results, domain, outputPath) {
        const reportData = {
          type: "full",
          domain,
          data: {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            domain,
            ...results
          }
        };
        return this.generate(reportData, outputPath);
      }
    };
  }
});

// lib/reports/reports.ts
import { execSync as execSync3 } from "child_process";
import path12 from "path";
import fs13 from "fs";
var ReportGenerator;
var init_reports = __esm({
  "lib/reports/reports.ts"() {
    "use strict";
    init_pdf_generator();
    ReportGenerator = class {
      /**
       * Generates an SEO report
       */
      static generate(data, options = {}) {
        const {
          format = "pdf",
          includeTechnical = true,
          includeContent = true,
          includeSchema = true,
          includeBacklinks = false,
          outputDir = "reports",
          filename = `seoflow-report-${Date.now()}.${format}`
        } = options;
        if (!fs13.existsSync(outputDir)) {
          fs13.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = path12.join(outputDir, filename);
        try {
          if (format === "pdf") {
            return PDFGenerator.generateSimpleReport(data, new URL(data.url).hostname, outputPath);
          } else {
            const scriptPath = path12.join(process.cwd(), "python", "google_report.py");
            const cmd = this.buildCommand(data, format, includeTechnical, includeContent, includeSchema, includeBacklinks, outputPath);
            execSync3(cmd, { encoding: "utf8", stdio: "ignore" });
            if (fs13.existsSync(outputPath)) {
              console.log(`\u2705 Report generated: ${outputPath}`);
              return outputPath;
            } else {
              throw new Error(`Report file not generated at: ${outputPath}`);
            }
          }
        } catch (error) {
          console.error("Report generation failed:", error.message);
          if (format === "pdf") {
            return this.generateFallbackJSONReport(data, outputPath.replace(".pdf", ".json"));
          }
          throw error;
        }
      }
      /**
       * Builds the Python command
       */
      static buildCommand(data, format, includeTechnical, includeContent, includeSchema, includeBacklinks, outputPath) {
        const args = [
          "python3",
          path12.join(process.cwd(), "python", "google_report.py"),
          "--url",
          `"${data.url}"`,
          "--score",
          data.score.toString(),
          "--output",
          `"${outputPath}"`,
          "--format",
          format
        ];
        if (includeTechnical && data.technical) {
          args.push("--technical", `"${JSON.stringify(data.technical)}"`);
        }
        if (includeContent && data.content) {
          args.push("--content", `"${JSON.stringify(data.content)}"`);
        }
        if (includeSchema && data.schema) {
          args.push("--schema", `"${JSON.stringify(data.schema)}"`);
        }
        if (includeBacklinks && data.backlinks) {
          args.push("--backlinks", `"${JSON.stringify(data.backlinks)}"`);
        }
        if (data.issues.length > 0) {
          args.push("--issues", `"${JSON.stringify(data.issues)}"`);
        }
        if (data.warnings.length > 0) {
          args.push("--warnings", `"${JSON.stringify(data.warnings)}"`);
        }
        if (data.quickWins.length > 0) {
          args.push("--quick-wins", `"${JSON.stringify(data.quickWins)}"`);
        }
        return args.join(" ");
      }
      /**
       * Generates a fallback JSON report if PDF fails
       */
      static generateFallbackJSONReport(data, outputPath) {
        const report = {
          generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          version: "1.0",
          data
        };
        fs13.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`\u2705 Fallback report generated: ${outputPath}`);
        return outputPath;
      }
      /**
       * Generates a report from a list of posts
       */
      static generateBatchReport(posts, options = {}) {
        const batchData = {
          url: "Batch Report",
          score: Math.round(posts.reduce((sum, post) => sum + post.score, 0) / posts.length),
          issues: posts.flatMap((post) => post.issues.map((issue) => `${post.slug}: ${issue}`)),
          warnings: posts.flatMap((post) => post.warnings.map((warning) => `${post.slug}: ${warning}`)),
          quickWins: posts.flatMap((post) => post.quickWins.map((win) => `${post.slug}: ${win}`)),
          content: posts.map((post) => ({
            slug: post.slug,
            score: post.score,
            issues: post.issues.length,
            warnings: post.warnings.length,
            quickWins: post.quickWins.length
          }))
        };
        return this.generate(batchData, options);
      }
    };
  }
});

// pipeline/report-export.ts
function stepExportReport(input, options = {}) {
  const {
    format = "pdf",
    outputDir = "reports",
    filename = `report-${input.slug}-${Date.now()}.${format}`,
    includeTechnical = true,
    includeContent = true,
    includeSchema = true,
    includeBacklinks = false
  } = options;
  const changes = [];
  try {
    const reportData = {
      url: input.slug,
      score: 85,
      // This would come from actual analysis
      issues: input.frontmatter.issues || [],
      warnings: input.frontmatter.warnings || [],
      quickWins: input.frontmatter.quickWins || []
    };
    const outputPath = ReportGenerator.generate(reportData, {
      format,
      outputDir,
      filename,
      includeTechnical,
      includeContent,
      includeSchema,
      includeBacklinks
    });
    changes.push(`Generated ${format.toUpperCase()} report: ${outputPath}`);
  } catch (error) {
    console.error(`Failed to generate report: ${error}`);
    changes.push(`\u26A0\uFE0F  Failed to generate report: ${error}`);
  }
  return {
    ...input,
    changes
  };
}
var init_report_export = __esm({
  "pipeline/report-export.ts"() {
    "use strict";
    init_reports();
  }
});

// pipeline/steps.ts
var steps_exports = {};
__export(steps_exports, {
  processPost: () => processPost,
  stepClaudeSeoReview: () => stepClaudeSeoReview,
  stepFactCheck: () => stepFactCheck,
  stepFixFrontmatter: () => stepFixFrontmatter,
  stepGeminiContent: () => stepGeminiContent,
  stepInjectImages: () => stepInjectImages,
  stepInjectLinks: () => stepInjectLinks,
  stepKeywordResearch: () => stepKeywordResearch,
  stepNeuronWriter: () => stepNeuronWriter
});
import fs14 from "fs";
function sanitizeLog(s) {
  return String(s ?? "").replace(/[\r\n]/g, " ");
}
function toolTriggers() {
  if (!_toolTriggers) _toolTriggers = getToolTriggers();
  return _toolTriggers;
}
function bookingTriggers() {
  if (!_bookingTriggers) _bookingTriggers = getBookingTriggers();
  return _bookingTriggers;
}
async function stepKeywordResearch(input) {
  const changes = [];
  const fm = { ...input.frontmatter };
  const seed = fm.focusKeyword || fm.title || input.slug;
  const context = `${fm.category || getDefaultCategory()} ${(fm.tags || []).join(" ")}`;
  let kwResult;
  if (process.env.AHREFS_API_KEY) {
    kwResult = await researchKeywords3(seed, context);
  } else if (process.env.SEMRUSH_API_KEY) {
    kwResult = await researchKeywords2(seed, context);
  } else {
    kwResult = await researchKeywords(seed, input.slug, context);
  }
  if (kwResult.source === "ubersuggest" && kwResult.focusKeyword !== seed) {
    const oldKw = fm.focusKeyword || seed;
    fm.focusKeyword = kwResult.focusKeyword;
    changes.push(`Keyword research: "${oldKw}" \u2192 "${kwResult.focusKeyword}" (vol: ${kwResult.searchVolume}, diff: ${kwResult.difficulty})`);
  } else if (kwResult.source === "ubersuggest") {
    changes.push(`Keyword research: "${seed}" confirmed (vol: ${kwResult.searchVolume}, diff: ${kwResult.difficulty})`);
  } else if (kwResult.source === "fallback") {
    changes.push(`Keyword research: SERP analysis for "${seed}" (fallback mode)`);
  }
  if (kwResult.relatedKeywords.length > 0) {
    const existing = fm.keywords || [];
    if (Array.isArray(existing)) {
      fm.keywords = [.../* @__PURE__ */ new Set([...existing, ...kwResult.relatedKeywords])];
    }
    changes.push(`Added ${kwResult.relatedKeywords.length} related keywords from research`);
  }
  return { content: input.content, frontmatter: fm, changes };
}
function stepFixFrontmatter(input) {
  const changes = [];
  const fm = { ...input.frontmatter };
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  if (!fm.schema) {
    const title = (fm.title || "").toLowerCase();
    const tags = (fm.tags || []).join(" ").toLowerCase();
    if (title.includes("review") || tags.includes("review")) fm.schema = "Review";
    else if (fm.focusKeyword && fm.focusKeyword.match(/\bfaq\b|\bwhat is\b|\bhow to\b/i)) fm.schema = "FAQPage";
    else if (title.includes("guide") || title.includes("things to do") || title.includes("tips")) fm.schema = "TravelGuide";
    else fm.schema = "Article";
    changes.push(`Added schema: ${fm.schema}`);
  }
  const desc = fm.description || fm.excerpt || "";
  if (desc.length < 100 || desc.length > 165) {
    if (desc.length > 165) {
      fm.description = desc.slice(0, 158) + "...";
      changes.push("Trimmed description to 158 chars");
    }
    if (desc.length < 100) changes.push("FLAG: description too short \u2014 needs manual improvement");
  }
  if (!fm.focusKeyword && fm.title) {
    fm.focusKeyword = fm.title.split(" ").slice(0, 5).join(" ");
    changes.push(`Added focusKeyword from title`);
  }
  if (changes.length > 0) {
    fm.lastModified = today;
    changes.push(`Updated lastModified to ${today}`);
  }
  return { content: input.content, frontmatter: fm, changes };
}
function stepInjectLinks(input) {
  const changes = [];
  let modified = input.content;
  const existingLinks = extractExistingLinks(modified);
  let linksAdded = 0;
  const tryInsertLink = (trigger) => {
    if (linksAdded >= 3) return;
    if (existingLinks.has(trigger.path)) return;
    for (const kw of trigger.keywords) {
      const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(?<!\\[.*?)\\b(${safeKw})\\b(?![^[]*?\\])(?![^(]*?\\))`, "i");
      const match = modified.match(pattern);
      if (match) {
        modified = modified.replace(pattern, `[$1](${trigger.path})`);
        existingLinks.add(trigger.path);
        changes.push(`Added internal link to ${trigger.path} (anchor: "${match[1]}")`);
        linksAdded++;
        return;
      }
    }
  };
  for (const trigger of toolTriggers()) tryInsertLink(trigger);
  for (const trigger of bookingTriggers()) tryInsertLink(trigger);
  return { content: modified, frontmatter: input.frontmatter, changes };
}
async function stepInjectImages(input) {
  const changes = [];
  const sections = getH2Sections(input.content);
  const destination = (input.frontmatter.tags || [])[0] || input.frontmatter.category || getImageSearchFallback();
  const contentDomain = getContentDomain();
  let modified = input.content;
  let imagesAdded = 0;
  const MAX_NEW_IMAGES = 2;
  for (const section of sections) {
    if (imagesAdded >= MAX_NEW_IMAGES) break;
    if (!sectionNeedsImage(section.lines)) continue;
    const searchQuery = `${section.heading} ${destination}`.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
    console.log(`    \u{1F50D} Fetching image for: "${sanitizeLog(searchQuery)}"`);
    const img = await fetchBestImage(searchQuery);
    if (!img) {
      console.log(`    \u26A0\uFE0F  No image found for: "${sanitizeLog(searchQuery)}"`);
      continue;
    }
    const altText = `${section.heading} - ${destination} ${contentDomain}`;
    const imgMdx = `

![${altText}](${img.url})
*Photo: ${img.credit}*
`;
    const headingLine = `## ${section.heading}`;
    const idx = modified.indexOf(headingLine);
    if (idx !== -1) {
      const afterHeading = modified.indexOf("\n", idx) + 1;
      modified = modified.slice(0, afterHeading) + imgMdx + modified.slice(afterHeading);
      changes.push(`Added image from ${img.source} for section "${section.heading}" (${img.photographer})`);
      imagesAdded++;
    }
  }
  return { content: modified, frontmatter: input.frontmatter, changes };
}
async function stepNeuronWriter(input) {
  if (!hasNeuronKey()) {
    return { content: input.content, frontmatter: input.frontmatter, changes: [], neuronData: null };
  }
  const keyword = input.frontmatter.focusKeyword || input.frontmatter.title || input.slug;
  console.log(`     NW: fetching data for "${sanitizeLog(keyword)}"`);
  const neuronData = await fetchNeuronData(keyword);
  if (neuronData?.missingTerms?.length) {
    console.log(`     NW missing terms: ${sanitizeLog(neuronData.missingTerms.slice(0, 5).join(", "))}`);
  }
  if (neuronData?.targetWordCount) {
    console.log(`     NW target word count: ${neuronData.targetWordCount} (current: ${countWords(input.content)})`);
  }
  if (neuronData?.notes) {
    console.log(`     NW: ${sanitizeLog(neuronData.notes)}`);
  }
  return { content: input.content, frontmatter: input.frontmatter, changes: [], neuronData };
}
async function stepGeminiContent(input, neuronData) {
  const changes = [];
  if (!process.env.GEMINI_API_KEY) {
    console.log(`     \u26A0\uFE0F  GEMINI_API_KEY not set \u2014 skipping AI content audit`);
    return { content: input.content, frontmatter: input.frontmatter, changes };
  }
  const gsc = input.gsc;
  const content = input.content;
  const fm = input.frontmatter;
  const hasFaq = /##\s*(FAQ|Frequently Asked|Common Questions)/i.test(content);
  const sections = getH2Sections(content);
  const thinSections = sections.filter((s) => countWords(s.lines.join("\n")) < 100 && !s.heading.match(/FAQ|conclusion|final|wrap/i));
  const wordCount = countWords(content);
  const needsFaq = !hasFaq && ((gsc?.impressions || 0) > 500 || wordCount > 800);
  const needsExpansion = thinSections.length > 0;
  const needsNlpTerms = !!neuronData?.missingTerms?.length;
  if (!needsFaq && !needsExpansion && !needsNlpTerms) {
    return { content, frontmatter: fm, changes };
  }
  const ai = getAiContext();
  const contentType = fm.schema?.toLowerCase().includes("review") ? "review" : fm.schema?.toLowerCase().includes("itinerary") ? "itinerary" : fm.category || "guide";
  const writingSample = getWritingSample(contentType);
  const contentDomain = getContentDomain();
  const tasks = [];
  if (needsFaq) tasks.push(`- Add a "## Frequently Asked Questions" section at the end with 4 Q&As based on search intent for "${fm.focusKeyword || fm.title}". Format each as: **Q: question?** then the answer paragraph.`);
  if (needsExpansion) tasks.push(`- Expand these thin sections (under 100 words each) with 1-2 more practical paragraphs in ${ai.author}'s first-person voice: ${thinSections.map((s) => `"${s.heading}"`).join(", ")}`);
  if (needsNlpTerms) tasks.push(`- Naturally weave in these missing NLP terms where relevant (do not keyword-stuff): ${neuronData.missingTerms.slice(0, 8).join(", ")}`);
  const gscContext = [
    `Impressions: ${gsc?.impressions || 0} | Clicks: ${gsc?.clicks || 0} | Position: ${gsc?.position?.toFixed(1) || "n/a"} | CTR: ${gsc?.ctr?.toFixed(2) || 0}%`,
    gsc?.position && gsc.position > 5 && gsc.position < 20 ? "\u2192 Striking distance \u2014 small content improvements can push to page 1" : "",
    gsc?.impressions && gsc.impressions > 1e3 && gsc?.ctr && gsc.ctr < 3 ? "\u2192 High impressions + low CTR \u2014 title/meta and FAQ schema could improve clicks" : ""
  ].filter(Boolean).join("\n");
  const nwContext = neuronData ? [
    neuronData.targetWordCount ? `Target word count: ${neuronData.targetWordCount} (current: ${wordCount})` : "",
    neuronData.missingTerms?.length ? `Missing NLP terms: ${neuronData.missingTerms.slice(0, 10).join(", ")}` : "",
    neuronData.h2Terms?.length ? `Suggested headings: ${neuronData.h2Terms.slice(0, 5).join(" | ")}` : "",
    neuronData.peopleAlsoAsk?.length ? `People Also Ask: ${neuronData.peopleAlsoAsk.slice(0, 5).join(" | ")}` : "",
    neuronData.contentQuestions?.length ? `Content questions: ${neuronData.contentQuestions.slice(0, 5).join(" | ")}` : ""
  ].filter(Boolean).join("\n") : "NeuronWriter data unavailable";
  const contentSnippet = content.length > 3e3 ? content.slice(0, 1500) + "\n\n...[middle of post]...\n\n" + content.slice(-800) : content;
  const voiceSection = writingSample ? `Here is a sample of ${ai.author}'s actual writing voice \u2014 match this tone exactly:
"${writingSample}"
` : "";
  const prompt = `You are editing a ${contentDomain} post for ${ai.siteUrl} written by ${ai.author}${ai.authorLocation ? `, based in ${ai.authorLocation}` : ""}.
Voice: first-person, practical, authentic, specific. Never generic. Never AI-sounding. Never start a section with "I".

${voiceSection}
Style rules:
- Short, punchy sentences. Vary length.
- Specific, grounded observations (not vague praise)
- Practical details: prices, transit, timing
- Direct address to the reader
- Never use: nestled, delve, vibrant, treasure trove, bustling, hidden gem, breathtaking, truly unique, picturesque, enchanting, captivating, magical, whimsical, wanderlust

POST TITLE: ${fm.title}
FOCUS KEYWORD: ${fm.focusKeyword || fm.title}

GOOGLE SEARCH CONSOLE DATA:
${gscContext}

NEURONWRITER ANALYSIS:
${nwContext}

CURRENT CONTENT EXCERPT:
${contentSnippet}

YOUR TASKS (only what's needed \u2014 do not invent work):
${tasks.join("\n")}

OUTPUT RULES:
- Respond with ONLY a raw JSON object \u2014 no explanation, no markdown, no code fences
- Start your response with { and end with }
- Use \\n for newlines inside string values
- Only include keys you have content for

JSON FORMAT:
{"faq_section":"## Frequently Asked Questions\\n\\n**Q: question?**\\nAnswer in 2-3 sentences.\\n\\n**Q: ...**\\n...","expanded_sections":{"Exact Section Heading":"## Exact Section Heading\\n\\nExpanded content here."},"nlp_insertions":["sentence using missing term naturally"]}

FAQ must have exactly 4 Q&As drawn from People Also Ask data above.`;
  console.log(`     \u{1F916} AI content audit (FAQ: ${needsFaq}, thin sections: ${thinSections.length}, NLP terms: ${needsNlpTerms})`);
  const response = await aiChatWithRetry(prompt, "content-audit");
  if (!response) {
    console.log(`     \u26A0\uFE0F  AI content audit failed after 3 attempts`);
    return { content, frontmatter: fm, changes };
  }
  return applyGeminiResponse(response, content, fm, sections, changes, needsFaq, needsExpansion, needsNlpTerms);
}
function applyGeminiResponse(response, content, fm, sections, changes, needsFaq, needsExpansion, _needsNlpTerms) {
  let faqSection = null;
  let expanded = null;
  try {
    let raw = response.trim();
    raw = raw.replace(/^```(?:json)?\s*/im, "").replace(/```\s*$/m, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      raw = raw.slice(start, end + 1);
      const parsed = JSON.parse(raw);
      faqSection = parsed.faq_section || null;
      expanded = parsed.expanded_sections || null;
    }
  } catch {
    const faqKeyMatch = response.match(/"faq_section"\s*:\s*"([\s\S]+?)(?=",\s*"|"\s*\}|$)/);
    if (faqKeyMatch && needsFaq) {
      faqSection = faqKeyMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
    }
  }
  let modified = content;
  if (faqSection && needsFaq) {
    modified = modified.trimEnd() + "\n\n" + faqSection.trim() + "\n";
    changes.push("AI: Added FAQ section (4 Q&As)");
    fm.schema = "FAQPage";
  }
  function qualityCheck(text) {
    const wordCount = text.replace(/[#*_\[\]()>]/g, "").split(/\s+/).filter(Boolean).length;
    if (wordCount < 80) return { pass: false, reason: `too short (${wordCount} words, need \u226580)` };
    const lower = text.toLowerCase();
    const hits = AI_PHRASES.filter((p) => lower.includes(p));
    if (hits.length >= 2) return { pass: false, reason: `AI phrases detected: ${hits.join(", ")}` };
    return { pass: true, reason: null };
  }
  if (expanded && needsExpansion) {
    for (const [heading, newSection] of Object.entries(expanded)) {
      const oldSection = sections.find((s) => s.heading === heading);
      if (oldSection) {
        const oldText = `## ${oldSection.heading}
${oldSection.lines.join("\n")}`;
        if (modified.includes(oldText)) {
          const qc = qualityCheck(newSection);
          if (qc.pass) {
            modified = modified.replace(oldText, newSection.trim());
            changes.push(`AI: Expanded thin section "${heading}"`);
          } else {
            changes.push(`\u23ED\uFE0F  Skipped AI expansion for "${heading}" (quality: ${qc.reason})`);
            console.log(`     \u23ED\uFE0F  Skipped "${heading}" \u2014 ${qc.reason}`);
          }
        }
      }
    }
  }
  return { content: modified, frontmatter: fm, changes };
}
async function stepClaudeSeoReview(input) {
  const changes = [];
  const { content, frontmatter, slug, gsc } = input;
  if (!process.env.GEMINI_API_KEY) {
    return { content, frontmatter, changes };
  }
  const wordCount = countWords(content);
  const sections = getH2Sections(content);
  const existingLinks = [...extractExistingLinks(content)];
  const imageCount = countImages(content);
  const desc = frontmatter.description || "";
  const title = frontmatter.title || slug;
  const contentDomain = getContentDomain();
  const prompt = `You are an SEO quality reviewer. Analyze this ${contentDomain} post and return a JSON report.

POST: "${title}"
SLUG: ${slug}
FOCUS KEYWORD: "${frontmatter.focusKeyword || ""}"
WORD COUNT: ${wordCount}
META DESCRIPTION: "${desc}"
SCHEMA: ${frontmatter.schema || "none"}

GSC DATA:
- Impressions: ${gsc?.impressions || 0}
- Clicks: ${gsc?.clicks || 0}
- Avg Position: ${gsc?.position?.toFixed(1) || "n/a"}
- CTR: ${gsc?.ctr?.toFixed(2) || 0}%

CONTENT STRUCTURE:
${sections.map((s) => `## ${s.heading} (${countWords(s.lines.join("\n"))} words)`).join("\n")}

IMAGES: ${imageCount}
INTERNAL LINKS: ${existingLinks.length}
HEADINGS: ${sections.length}

Review checklist:
1. TITLE: Is the focus keyword near the start? Is it compelling and under 60 chars?
2. META: Does it include the keyword and a CTA? Is it 140-160 chars?
3. H1\u2192H2 HIERARCHY: Do H2s cover all relevant subtopics for this keyword?
4. FIRST 100 WORDS: Does the keyword appear naturally near the top?
5. E-E-A-T: Does the content show personal experience, specific details, practical tips?
6. COMPREHENSIVENESS: Are there obvious subtopics missing for this keyword?
7. READABILITY: Is the language natural and conversational (not AI-sounding)?
8. INTERNAL LINKS: Are there enough relevant internal links? Missing obvious link opportunities?
9. IMAGES: Do images have descriptive alt text?

OUTPUT FORMAT (raw JSON, no markdown):
{
  "score": 7,
  "key_issues": ["Issue 1", "Issue 2"],
  "quick_wins": ["Quick fix 1", "Quick fix 2"],
  "title_recommendation": "Suggested title or 'OK'",
  "meta_recommendation": "Suggested meta or 'OK'",
  "missing_subtopics": ["Subtopic 1", "Subtopic 2"],
  "eeat_signals": "Good: details about personal visit. Missing: specific price mentions.",
  "readability_note": "One or two concise sentences about the flow and voice.",
  "link_opportunities": "e.g. Could link to budget calculator when discussing costs",
  "overall_assessment": "Brief 1-2 sentence summary of the biggest issue to fix"
}`;
  console.log(`     \u{1F916} Claude SEO review...`);
  const response = await aiChatWithRetry(prompt, "seo-review");
  if (!response) {
    return { content, frontmatter, changes };
  }
  try {
    let raw = response.trim();
    raw = raw.replace(/^```(?:json)?\s*/im, "").replace(/```\s*$/m, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      const review = JSON.parse(raw.slice(start, end + 1));
      const issues = review.key_issues || [];
      const quickWins = review.quick_wins || [];
      const score = review.score || "?";
      const titleRec = review.title_recommendation || "";
      const metaRec = review.meta_recommendation || "";
      if (issues.length > 0) {
        changes.push(`\u26A1 Claude SEO review score: ${score}/10`);
        for (const issue of issues) {
          changes.push(`   \u2022 Issue: ${issue}`);
        }
        for (const win of quickWins) {
          changes.push(`   \u2713 Quick win: ${win}`);
        }
      }
      if (titleRec && titleRec !== "OK" && titleRec !== frontmatter.title && titleRec.length < 90) {
        const oldTitle = frontmatter.title;
        frontmatter.title = titleRec;
        changes.push(`\u{1F527} Auto-fixed title: "${oldTitle?.slice(0, 50)}..." \u2192 "${titleRec.slice(0, 50)}..."`);
      }
      if (metaRec && metaRec !== "OK" && metaRec !== (frontmatter.description || "") && metaRec.length < 180) {
        const oldMeta = frontmatter.description;
        frontmatter.description = metaRec;
        changes.push(`\u{1F527} Auto-fixed meta description`);
      }
    }
  } catch {
    changes.push(`\u26A0\uFE0F  SEO review JSON parse failed \u2014 check raw output`);
  }
  return { content, frontmatter, changes };
}
async function stepFactCheck(input) {
  const changes = [];
  const { content, frontmatter, slug } = input;
  if (!process.env.GEMINI_API_KEY) {
    return { content, frontmatter, changes };
  }
  const pricePattern = /[€$£]\s*\d+(?:[.,]\d+)?(?:\s*(?:€|euro|EUR|USD|GBP|dollars?|pounds?))?/g;
  const prices = [...new Set(content.match(pricePattern) || [])];
  const parsedPrices = prices.map((price) => {
    const match = price.match(/([€$£])(\d+(?:[.,]\d+)?)/);
    if (match) {
      const currency = match[1];
      const value = parseFloat(match[2].replace(",", "."));
      return {
        original: price,
        currency,
        value,
        formatted: `${currency}${value.toFixed(2)}`
      };
    }
    return null;
  }).filter(Boolean);
  const hoursPattern = /(?:open|closed|hours?)\s*(?:[:=]?\s*)?(?:\d{1,2}(?::\d{0,2})?\s*(?:am|pm|AM|PM|hrs?)?\s*(?:-|to|–)\s*\d{1,2}(?::\d{0,2})?\s*(?:am|pm|AM|PM|hrs?)?|24\s*hrs?|24\s*hours?)/gi;
  const openingHours = [...new Set(content.match(hoursPattern) || [])];
  const addressPattern = /\d{1,4}\s*[a-zA-Z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl|square|sq|terrace|ter|circle|cir|way)\b/i;
  const addresses = [...new Set(content.match(addressPattern) || [])];
  const datePattern = /(?:\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(?:\d{4})?|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4})/g;
  const eventDates = [...new Set(content.match(datePattern) || [])];
  const postTitle = frontmatter.title || slug;
  const category = frontmatter.category || getDefaultCategory();
  const destination = (frontmatter.tags || [])[0] || "";
  const domain = getContentDomain();
  let prompt = `You are verifying claims in a ${domain} post.

POST TITLE: "${postTitle}"
CATEGORY: ${category}
DESTINATION: ${destination}

`;
  const hasPrices = prices.length > 0;
  const hasHours = openingHours.length > 0;
  const hasAddresses = addresses.length > 0;
  const hasEventDates = eventDates.length > 0;
  if (hasPrices) {
    prompt += `PRICES FOUND IN THE POST:
${parsedPrices.slice(0, 5).map((p, i) => `${i + 1}. ${p.original} (${p.currency}${p.value.toFixed(2)})`).join("\n")}

`;
  }
  if (hasHours) {
    prompt += `OPENING HOURS FOUND IN THE POST:
${openingHours.map((h, i) => `${i + 1}. ${h}`).join("\n")}

`;
  }
  if (hasAddresses) {
    prompt += `ADDRESSES FOUND IN THE POST:
${addresses.map((a, i) => `${i + 1}. ${a}`).join("\n")}

`;
  }
  if (hasEventDates) {
    prompt += `EVENT DATES FOUND IN THE POST:
${eventDates.map((d, i) => `${i + 1}. ${d}`).join("\n")}

`;
  }
  prompt += `For each claim, tell me:
1. Is this claim still realistic/current? (yes/no/uncertain)
2. What's the current information if it has changed?
3. What's your confidence level? (high/medium/low)

OUTPUT: Raw JSON object only, no markdown.
{"prices":[{"claim":"\u20AC30","still_accurate":"yes","current_price":"\u20AC30","confidence":"high","note":"Still accurate"}],"openingHours":[{"claim":"9am-5pm","still_accurate":"yes","current_hours":"9am-6pm","confidence":"medium","note":"Hours extended"}],"addresses":[{"claim":"123 Main Street","still_accurate":"yes","current_address":"123 Main Street","confidence":"high","note":"Address verified"}],"eventDates":[{"claim":"January 1, 2024","still_accurate":"no","current_date":"January 1, 2025","confidence":"high","note":"Event date updated"}]}
`;
  const itemsToCheck = prices.length + openingHours.length + addresses.length + eventDates.length;
  console.log(`     \u{1F50D} Fact check: ${itemsToCheck} items found`);
  const response = await aiChatWithRetry(prompt, "fact-check");
  if (!response) {
    console.log(`     \u26A0\uFE0F  Fact check failed after 3 attempts`);
    return { content, frontmatter, changes };
  }
  try {
    let raw = response.trim();
    raw = raw.replace(/^```(?:json)?\s*/im, "").replace(/```\s*$/m, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      const report = JSON.parse(raw.slice(start, end + 1));
      if (report.prices && report.prices.length > 0) {
        const priceReports = report.prices;
        const flaggedPrices = priceReports.filter((p) => p.still_accurate === "no");
        if (flaggedPrices.length > 0) {
          for (const p of flaggedPrices) {
            changes.push(`\u{1F534} Price may be outdated: claimed "${p.claim}", current ~"${p.current_price}" (confidence: ${p.confidence})`);
          }
        } else {
          changes.push(`\u2705 All ${priceReports.length} prices verified (via Google Search grounding)`);
        }
      }
      if (report.openingHours && report.openingHours.length > 0) {
        const hoursReports = report.openingHours;
        const flaggedHours = hoursReports.filter((h) => h.still_accurate === "no");
        if (flaggedHours.length > 0) {
          for (const h of flaggedHours) {
            changes.push(`\u{1F534} Opening hours may be outdated: claimed "${h.claim}", current ~"${h.current_hours}" (confidence: ${h.confidence})`);
          }
        } else {
          changes.push(`\u2705 All ${hoursReports.length} opening hours verified (via Google Search grounding)`);
        }
      }
      if (report.addresses && report.addresses.length > 0) {
        const addressReports = report.addresses;
        const flaggedAddresses = addressReports.filter((a) => a.still_accurate === "no");
        if (flaggedAddresses.length > 0) {
          for (const a of flaggedAddresses) {
            changes.push(`\u{1F534} Address may be outdated: claimed "${a.claim}", current ~"${a.current_address}" (confidence: ${a.confidence})`);
          }
        } else {
          changes.push(`\u2705 All ${addressReports.length} addresses verified (via Google Search grounding)`);
        }
      }
      if (report.eventDates && report.eventDates.length > 0) {
        const eventDateReports = report.eventDates;
        const flaggedEventDates = eventDateReports.filter((d) => d.still_accurate === "no");
        if (flaggedEventDates.length > 0) {
          for (const d of flaggedEventDates) {
            changes.push(`\u{1F534} Event date may be outdated: claimed "${d.claim}", current ~"${d.current_date}" (confidence: ${d.confidence})`);
          }
        } else {
          changes.push(`\u2705 All ${eventDateReports.length} event dates verified (via Google Search grounding)`);
        }
      }
    }
  } catch {
    changes.push(`\u26A0\uFE0F  Fact check JSON parse failed`);
  }
  return { content, frontmatter, changes };
}
async function processPost(slug, filePath, gscPages, auditLog, opts) {
  const { mode, dryRun } = opts;
  const callsBefore = getAiCallCount();
  const maxCallsPerPost = (() => {
    try {
      return loadConfig().aiLimits?.maxCallsPerPost ?? Infinity;
    } catch {
      return Infinity;
    }
  })();
  function canCallAi() {
    const used = getAiCallCount() - callsBefore;
    if (used >= maxCallsPerPost) {
      console.log(`     \u26A0\uFE0F  Per-post AI limit (${maxCallsPerPost}) reached \u2014 skipping remaining AI steps`);
      return false;
    }
    return true;
  }
  if (opts.skipAlreadyDone && isAlreadyDone(auditLog, slug)) {
    return { slug, changes: 0, before: {}, after: {}, neuronData: null };
  }
  console.log(`
  \u{1F4C4} ${sanitizeLog(slug)}`);
  const raw = fs14.readFileSync(filePath, "utf8");
  const parsed = parseMdx(raw);
  const gsc = gscPages[slug] || {};
  const input = { slug, filePath, content: parsed.content, frontmatter: parsed.frontmatter, gsc };
  const before = {
    word_count: countWords(parsed.content),
    internal_links: countInternalLinks(parsed.content),
    images: countImages(parsed.content),
    meta_description_length: (parsed.frontmatter.description || "").length,
    neuronwriter_score: null
  };
  console.log(`     Words: ${before.word_count} | Links: ${before.internal_links} | Images: ${before.images} | GSC pos: ${gsc.position?.toFixed(1) ?? "n/a"}`);
  const category = parsed.frontmatter.category || parsed.frontmatter.tags?.[0] || "unknown";
  if (gsc?.impressions && gsc.impressions > 0) {
    const delta = checkGscDelta(slug, mode, category, gsc);
    if (delta) {
      const dir = delta.positionChange < 0 ? "improved" : "declined";
      console.log(`     \u{1F4C8} GSC since last audit: pos ${delta.positionChange > 0 ? "+" : ""}${delta.positionChange.toFixed(1)} (${sanitizeLog(dir)}), ${delta.clicksChange > 0 ? "+" : ""}${delta.clicksChange} clicks`);
    }
  }
  let state = { content: input.content, frontmatter: input.frontmatter };
  const allChanges = [];
  let neuronData = null;
  if (mode === "all" || mode === "keywords") {
    const result = await stepKeywordResearch({ ...input, content: state.content, frontmatter: state.frontmatter });
    state = { content: result.content, frontmatter: result.frontmatter };
    allChanges.push(...result.changes);
    recordStep(slug, "keywords", category, result.changes.length, gsc);
  }
  if (mode === "all" || mode === "meta") {
    const result = stepFixFrontmatter({ ...input, content: state.content, frontmatter: state.frontmatter });
    state = { content: result.content, frontmatter: result.frontmatter };
    allChanges.push(...result.changes);
    recordStep(slug, "meta", category, result.changes.length, gsc);
  }
  if (mode === "all" || mode === "links") {
    const result = stepInjectLinks({ ...input, content: state.content, frontmatter: state.frontmatter });
    state = { content: result.content, frontmatter: result.frontmatter };
    allChanges.push(...result.changes);
    recordStep(slug, "links", category, result.changes.length, gsc);
  }
  if (mode === "all" || mode === "images") {
    if (before.images < 2 || before.word_count > 800 && before.images < 3) {
      const result = await stepInjectImages({ ...input, content: state.content, frontmatter: state.frontmatter });
      state = { content: result.content, frontmatter: result.frontmatter };
      allChanges.push(...result.changes);
      recordStep(slug, "images", category, result.changes.length, gsc);
    } else {
      console.log(`     \u2713 Images sufficient (${before.images})`);
    }
  }
  if (mode === "all" || mode === "neuron" || mode === "content") {
    const result = await stepNeuronWriter({ ...input, content: state.content, frontmatter: state.frontmatter });
    neuronData = result.neuronData;
    recordStep(slug, "neuron", category, 0, gsc);
  }
  if ((mode === "all" || mode === "content") && canCallAi()) {
    const result = await stepGeminiContent(
      { ...input, content: state.content, frontmatter: state.frontmatter },
      neuronData
    );
    state = { content: result.content, frontmatter: result.frontmatter };
    allChanges.push(...result.changes);
    recordStep(slug, "content", category, result.changes.length, gsc);
  }
  if ((mode === "all" || mode === "review") && canCallAi()) {
    const result = await stepClaudeSeoReview({ ...input, content: state.content, frontmatter: state.frontmatter });
    state = { content: result.content, frontmatter: result.frontmatter };
    allChanges.push(...result.changes);
    recordStep(slug, "review", category, result.changes.length, gsc);
  }
  if (mode === "all" || mode === "schema") {
    const schemaResult = processSchema(state.frontmatter, state.content);
    if (!schemaResult.isValid) {
      console.log(`     \u26A0\uFE0F  Schema validation errors:`);
      schemaResult.errors.forEach((error) => console.log(`        \u2022 ${error}`));
    }
    if (schemaResult.warnings.length > 0) {
      console.log(`     \u2139\uFE0F  Schema warnings:`);
      schemaResult.warnings.forEach((warning) => console.log(`        \u2022 ${warning}`));
    }
    state.content = schemaResult.updatedContent;
    allChanges.push(`Updated schema: ${schemaResult.schema["@type"]}`);
    recordStep(slug, "schema", category, 1, gsc);
  }
  if (mode === "all" || mode === "quality") {
    const result = await stepContentQualityAudit({ ...input, content: state.content, frontmatter: state.frontmatter });
    state.content = result.content;
    allChanges.push(...result.changes);
    recordStep(slug, "quality", category, result.changes.length, gsc);
  }
  if (mode === "all" || mode === "technical") {
    const result = await stepTechnicalAudit({ ...input, content: state.content, frontmatter: state.frontmatter });
    allChanges.push(...result.changes);
    recordStep(slug, "technical", category, result.changes.length, gsc);
  }
  if ((mode === "all" || mode === "factcheck") && canCallAi()) {
    const result = await stepFactCheck({ ...input, content: state.content, frontmatter: state.frontmatter });
    allChanges.push(...result.changes);
    recordStep(slug, "factcheck", category, result.changes.length, gsc);
  }
  if (mode === "all" || mode === "report") {
    const reportResult = stepExportReport({
      ...input,
      content: state.content,
      frontmatter: state.frontmatter
    }, {
      format: "pdf",
      outputDir: "reports"
    });
    allChanges.push(...reportResult.changes);
    recordStep(slug, "report", category, reportResult.changes.length, gsc);
  }
  const after = {
    word_count: countWords(state.content),
    internal_links: countInternalLinks(state.content),
    images: countImages(state.content),
    meta_description_length: (state.frontmatter.description || "").length
  };
  if (allChanges.length > 0) {
    if (!dryRun) {
      const newRaw = buildFrontmatterBlock(state.frontmatter) + state.content;
      fs14.writeFileSync(filePath, newRaw, "utf8");
    }
    console.log(`     ${dryRun ? "[DRY RUN] Would apply" : "\u2705 Written"} (${allChanges.length} changes)`);
    for (const c of allChanges) console.log(`       \u2022 ${c}`);
  } else {
    console.log(`     \u2713 No changes needed`);
  }
  if (!dryRun && gsc?.impressions) {
    logRun({ slug, step: mode, category, changesApplied: allChanges.length, gscBefore: null, gscAfter: { date: "", ...gsc }, gscDelta: null });
  }
  const reviewDate = /* @__PURE__ */ new Date();
  reviewDate.setDate(reviewDate.getDate() + 90);
  logEntry(auditLog, slug, {
    status: allChanges.length > 0 ? "completed" : "skipped",
    changes_made: allChanges,
    before,
    after,
    gsc_data: {
      impressions: gsc.impressions || 0,
      clicks: gsc.clicks || 0,
      position: gsc.position || null,
      ctr: gsc.ctr ? `${gsc.ctr.toFixed(2)}%` : null
    },
    neuronwriter_query_id: neuronData?.queryId || null,
    neuronwriter_notes: neuronData?.notes || null,
    neuronwriter_missing_terms: neuronData?.missingTerms || [],
    neuronwriter_suggested_h2s: neuronData?.h2Terms || [],
    next_review: allChanges.length > 0 ? reviewDate.toISOString().split("T")[0] : null,
    notes: gsc.impressions && gsc.impressions > 1e3 && gsc.ctr && gsc.ctr < 3 ? `High impressions (${gsc.impressions}) + low CTR (${gsc.ctr.toFixed(2)}%) \u2014 consider title rewrite` : "",
    flagged_for_manual: !!(before.word_count < 400 || neuronData?.targetWordCount && before.word_count < neuronData.targetWordCount * 0.5)
  });
  return { slug, changes: allChanges.length, before, after, neuronData };
}
var AI_PHRASES, _toolTriggers, _bookingTriggers;
var init_steps = __esm({
  "pipeline/steps.ts"() {
    "use strict";
    init_mdx_parser();
    init_pexels_client();
    init_neuronwriter();
    init_ai_provider();
    init_audit_log();
    init_ubersuggest_client();
    init_semrush_client();
    init_ahrefs_client();
    init_config();
    init_ai_provider();
    init_learning();
    init_schema();
    init_technical();
    init_content_quality2();
    init_report_export();
    AI_PHRASES = ["nestled", "delve", "vibrant", "treasure trove", "bustling", "hidden gem", "breathtaking", "truly unique", "picturesque", "enchanting", "captivating", "metropolis", "testament to", "rich tapestry", "magical", "whimsical", "wanderlust", "a must-visit"];
    _toolTriggers = null;
    _bookingTriggers = null;
  }
});

// run.ts
import fs15 from "fs";
import path13 from "path";

// lib/env-loader.ts
import fs from "fs";
import path from "path";
function findRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "seoflow.config.json"))) return dir;
    if (fs.existsSync(path.join(dir, ".env.local"))) return dir;
    const p = path.dirname(dir);
    if (p === dir) break;
    dir = p;
  }
  return process.cwd();
}
var ROOT = findRoot();
var ENV_FILE = path.join(ROOT, ".env.local");
function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return;
  for (const line of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith("#")) continue;
    const eq = l.indexOf("=");
    if (eq === -1) continue;
    const key = l.slice(0, eq).trim();
    if (process.env[key] !== void 0) continue;
    let val = l.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

// run.ts
init_config();

// lib/gsc-parser.ts
init_config();
import fs3 from "fs";

// lib/gsc-client.ts
init_config();
import https from "https";
var _pagesCache = null;
var _queriesCache = null;
var _available = null;
async function getAccessToken() {
  try {
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse?.token ?? tokenResponse?.access_token;
    if (!token) return null;
    let projectId;
    try {
      projectId = await auth.getProjectId() ?? void 0;
    } catch {
    }
    return { token, projectId };
  } catch {
    return null;
  }
}
function gscPost(path14, body, token, quotaProject) {
  const BASE = "searchconsole.googleapis.com";
  const API = "/webmasters/v3";
  const payload = JSON.stringify(body);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload)
  };
  if (quotaProject) {
    headers["x-goog-user-project"] = quotaProject;
  }
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: BASE,
        path: API + path14,
        method: "POST",
        headers
      },
      (res) => {
        let data = "";
        res.on("data", (d) => data += d);
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(2e4, () => {
      req.destroy();
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}
function dateStr(daysAgo) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
function getSiteProperty() {
  const envOverride = process.env.GSC_SITE_URL;
  if (envOverride) return envOverride.endsWith("/") ? envOverride : envOverride + "/";
  const cfg = loadConfig();
  const url = cfg.siteUrl.startsWith("http") ? cfg.siteUrl : `https://${cfg.siteUrl}`;
  return url.endsWith("/") ? url : url + "/";
}
function urlToSlug(url) {
  const cfg = loadConfig();
  const path14 = url.replace(/^https?:\/\/[^/]+/, "");
  const blogPrefix = cfg.blogPrefix || "/blog/";
  return path14.replace(new RegExp(`^${blogPrefix}`), "").replace(/\/$/, "");
}
async function isGscApiAvailable() {
  if (_available !== null) return _available;
  try {
    const result = await getAccessToken();
    _available = !!result?.token;
  } catch {
    _available = false;
  }
  return _available;
}
async function fetchGscPages(days = 28, rows = 2e3) {
  if (_pagesCache) return _pagesCache;
  const auth = await getAccessToken();
  if (!auth) return {};
  const siteProperty = getSiteProperty();
  const siteEncoded = encodeURIComponent(siteProperty);
  const body = {
    startDate: dateStr(days + 3),
    endDate: dateStr(3),
    dimensions: ["page"],
    rowLimit: rows,
    startRow: 0
  };
  const res = await gscPost(`/sites/${siteEncoded}/searchAnalytics/query`, body, auth.token, auth.projectId);
  if (!res || res.error) {
    if (res?.error) console.error(`     GSC API error: ${res.error.message}`);
    return {};
  }
  const map = {};
  for (const row of res.rows || []) {
    const url = row.keys[0];
    const slug = urlToSlug(url);
    map[slug] = {
      url,
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: (row.ctr || 0) * 100,
      // GSC returns 0–1, we store 0–100
      position: row.position || 99
    };
  }
  _pagesCache = map;
  return map;
}
async function fetchGscQueries(days = 28, rows = 2e3) {
  if (_queriesCache) return _queriesCache;
  const auth = await getAccessToken();
  if (!auth) return {};
  const siteProperty = getSiteProperty();
  const siteEncoded = encodeURIComponent(siteProperty);
  const body = {
    startDate: dateStr(days + 3),
    endDate: dateStr(3),
    dimensions: ["query"],
    rowLimit: rows,
    startRow: 0
  };
  const res = await gscPost(`/sites/${siteEncoded}/searchAnalytics/query`, body, auth.token, auth.projectId);
  if (!res || res.error) {
    if (res?.error) console.error(`     GSC API error: ${res.error.message}`);
    return {};
  }
  const map = {};
  for (const row of res.rows || []) {
    const query = row.keys[0];
    map[query] = {
      clicks: row.clicks || 0,
      impressions: row.impressions || 0
    };
  }
  _queriesCache = map;
  return map;
}

// lib/gsc-parser.ts
var _sourceChecked = false;
var _usingApi = false;
async function detectGscSource() {
  if (_sourceChecked) return _usingApi ? "api" : "csv";
  _usingApi = await isGscApiAvailable();
  _sourceChecked = true;
  return _usingApi ? "api" : "csv";
}
function gscSourceLabel() {
  if (!_sourceChecked) return "unknown (not checked yet)";
  return _usingApi ? "Google Search Console API (live)" : "CSV export (gsc_data/)";
}
function detectColumns(header) {
  const cols = header.split(",").map((c) => c.trim().toLowerCase().replace(/"/g, ""));
  const englishMap = {
    url: ["top pages", "page", "url", "landing page", "top urls"],
    clicks: ["clicks"],
    impressions: ["impressions"],
    ctr: ["ctr"],
    position: ["position", "average position"]
  };
  const germanMap = {
    url: ["h\xE4ufigste seiten", "h\xE4ufigsten seiten", "seite", "url", "landingpage"],
    clicks: ["klicks"],
    impressions: ["impressionen"],
    ctr: ["ctr"],
    position: ["position", "durchschnittliche position"]
  };
  function findCol(maps, key) {
    for (const map of maps) {
      for (const alias of map[key] || []) {
        const idx = cols.findIndex((c) => c.startsWith(alias));
        if (idx !== -1) return idx;
      }
    }
    return -1;
  }
  const urlIdx = findCol([englishMap, germanMap], "url");
  const clicksIdx = findCol([englishMap, germanMap], "clicks");
  const impressionsIdx = findCol([englishMap, germanMap], "impressions");
  const ctrIdx = findCol([englishMap, germanMap], "ctr");
  const positionIdx = findCol([englishMap, germanMap], "position");
  if (urlIdx === -1) return null;
  return {
    url: urlIdx,
    clicks: clicksIdx !== -1 ? clicksIdx : 1,
    impressions: impressionsIdx !== -1 ? impressionsIdx : 2,
    ctr: ctrIdx !== -1 ? ctrIdx : 3,
    position: positionIdx !== -1 ? positionIdx : 4
  };
}
function parseCtrValue(raw) {
  const s = raw.trim().replace("%", "");
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return n <= 1 && !raw.includes("%") ? n * 100 : n;
}
function parseGscPagesFromCsv() {
  const map = {};
  const cfg = loadConfig();
  const p = cfg.gscPagesCsv;
  if (!fs3.existsSync(p)) return map;
  const lines = fs3.readFileSync(p, "utf8").trim().split("\n");
  if (lines.length < 2) return map;
  const cols = detectColumns(lines[0]);
  if (!cols) {
    console.error(`     \u26A0\uFE0F  GSC CSV: could not detect columns in ${p}`);
    return map;
  }
  const blogPrefix = cfg.blogPrefix || "/blog/";
  for (const line of lines.slice(1)) {
    const parts = line.split(",");
    if (parts.length < 4) continue;
    const url = parts[cols.url].trim().replace(/"/g, "");
    const path14 = url.replace(/^https?:\/\/[^/]+/, "");
    const slug = path14.replace(new RegExp(`^${blogPrefix}`), "").replace(/\/$/, "");
    map[slug] = {
      url,
      clicks: parseInt(parts[cols.clicks]) || 0,
      impressions: parseInt(parts[cols.impressions]) || 0,
      ctr: parseCtrValue(parts[cols.ctr] || "0"),
      position: parseFloat(parts[cols.position]) || 99
    };
  }
  return map;
}
function parseGscQueriesFromCsv() {
  const map = {};
  const p = loadConfig().gscQueriesCsv;
  if (!fs3.existsSync(p)) return map;
  const lines = fs3.readFileSync(p, "utf8").trim().split("\n");
  if (lines.length < 2) return map;
  for (const line of lines.slice(1)) {
    const parts = line.split(",");
    if (parts.length < 3) continue;
    const query = parts[0].trim().replace(/"/g, "");
    map[query] = {
      clicks: parseInt(parts[1]) || 0,
      impressions: parseInt(parts[2]) || 0
    };
  }
  return map;
}
async function parseGscPages(days = 28) {
  const source = await detectGscSource();
  if (source === "api") {
    const data = await fetchGscPages(days);
    if (Object.keys(data).length > 0) return data;
    console.log("     \u26A0\uFE0F  GSC API returned no data, falling back to CSV");
  }
  return parseGscPagesFromCsv();
}
async function parseGscQueries(days = 28) {
  const source = await detectGscSource();
  if (source === "api") {
    const data = await fetchGscQueries(days);
    if (Object.keys(data).length > 0) return data;
    console.log("     \u26A0\uFE0F  GSC API returned no data, falling back to CSV");
  }
  return parseGscQueriesFromCsv();
}

// run.ts
init_audit_log();
init_ai_provider();
init_neuronwriter();
init_learning();

// lib/generator.ts
init_config();
init_ai_provider();
import fs6 from "fs";
import path5 from "path";
async function generatePost(gap) {
  const cfg = loadConfig();
  const ai = getAiContext();
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const contentTypes = getContentTypes();
  const typeConfig = contentTypes[gap.type] || contentTypes["article"] || { schema: "Article", instructions: "Write an informative article." };
  const slug = gap.slug || generateSlug(gap.keyword, gap.destination);
  const postsDir = getPostsDir();
  if (fs6.existsSync(path5.join(postsDir, `${slug}.mdx`))) {
    console.log(`     \u23ED\uFE0F  "${slug}" already exists, skipping`);
    return null;
  }
  const domain = getContentDomain();
  const prompt = `You are ${ai.author}, a ${domain} writer for ${ai.siteUrl}. You live in ${ai.authorLocation} and write honest, practical, first-person ${domain} content.

Generate a complete MDX blog post for the following topic. Follow the instructions strictly.

TOPIC: ${gap.keyword} in ${gap.destination}, ${gap.country}
TYPE: ${gap.type}
TARGET WORD COUNT: ${cfg.generation?.wordCountMin || 1500}\u2013${cfg.generation?.wordCountMax || 2500} words

CONTENT INSTRUCTIONS:
${typeConfig.instructions}

VOICE RULES:
- First-person, practical, specific. Never generic or AI-sounding.
- Never start a paragraph with "I" \u2014 vary your sentence openings.
- Include specific prices, transit times, and real details you've experienced.
- Short, punchy sentences. Vary length.
- Never use: nestled, delve, vibrant, treasure trove, hidden gem, breathtaking, truly unique.

OUTPUT FORMAT (YAML frontmatter + MDX body):
---
title: "Compelling SEO title under 55 chars"
date: "${today}"
lastModified: "${today}"
category: ${getDefaultCategory()}
excerpt: "150-160 char meta description with keyword naturally included"
coverImage: ""
published: false
author: ${ai.author}
tags:
  - "${gap.destination}"
  - "${gap.country}"
  - "${getContentDomain()} guide"
schema: ${typeConfig.schema}
focusKeyword: "${gap.keyword}"
description: "Same as excerpt"
visitedDate: "${today.slice(0, 7)}"
---

[Your content here with ## H2 headings]

Internal link format: [anchor text](/related-page) \u2014 use / and not full URLs.
Include a "Quick Summary" section near the top if it's a guide or itinerary.
Do NOT include markdown code fences around the YAML frontmatter.`;
  console.log(`     \u{1F916} Generating "${slug}" (${gap.type}, ${gap.country})...`);
  const response = await aiChatWithRetry(prompt, "content-audit");
  if (!response) {
    console.log(`     \u274C Generation failed for "${slug}"`);
    return null;
  }
  let content = response.trim();
  if (!content.startsWith("---")) {
    content = `---
title: "${gap.keyword} - ${gap.destination} Guide"
date: "${today}"
lastModified: "${today}"
category: ${getDefaultCategory()}
excerpt: "A practical guide to ${gap.keyword.toLowerCase()} in ${gap.destination}."
coverImage: ""
published: false
author: ${ai.author}
tags:
  - "${gap.destination}"
  - "${gap.country}"
schema: ${typeConfig.schema}
focusKeyword: "${gap.keyword}"
description: "A practical guide to ${gap.keyword.toLowerCase()} in ${gap.destination}."
---

${content}`;
  }
  const filePath = path5.join(postsDir, `${slug}.mdx`);
  fs6.writeFileSync(filePath, content, "utf8");
  console.log(`     \u2705 Generated: ${slug}.mdx`);
  return { slug, filePath, content, frontmatter: {} };
}
function generateSlug(keyword, destination) {
  const kw = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${kw}-${destination.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
async function generateBatch(gaps, limit = 5) {
  const results = [];
  const toProcess = gaps.slice(0, limit);
  for (let i = 0; i < toProcess.length; i++) {
    const gap = toProcess[i];
    console.log(`
  [${i + 1}/${toProcess.length}] ${gap.keyword} (${gap.destination})`);
    const post = await generatePost(gap);
    if (post) results.push(post);
  }
  console.log(`
\u{1F4CB} Generated ${results.length}/${toProcess.length} posts`);
  if (results.length > 0) {
    console.log(`   Files: ${results.map((p) => p.slug).join(", ")}`);
    console.log(`   Review and set published: true when ready.`);
  }
  return results;
}

// lib/publisher.ts
init_config();
init_mdx_parser();
import fs7 from "fs";
import path6 from "path";
import { execFileSync } from "child_process";
function scorePriority2(slug, majorCities, cfg) {
  const s = slug.toLowerCase();
  if (cfg.publishPriority && cfg.publishPriority.length > 0) {
    for (const rule of cfg.publishPriority) {
      try {
        if (new RegExp(rule.pattern, "i").test(s)) return rule.score;
      } catch {
        if (s.includes(rule.pattern.toLowerCase())) return rule.score;
      }
    }
    return 40;
  }
  if (s.includes("pass-review")) {
    const hasMajorCity = majorCities.some((c) => s.includes(c.toLowerCase().replace(/\s+/g, "-")));
    return hasMajorCity ? 100 : 90;
  }
  if (/3-days?-(?:in|itinerary)/.test(s)) return 80;
  if (/3-days?/.test(s)) return 75;
  if (/1-week|one-week|7-days?/.test(s)) return 75;
  if (/weekend/.test(s)) return 70;
  if (s.includes("things-to-do") || s.includes("top-things")) return 68;
  if (s.includes("guide") || s.includes("travel-guide")) return 60;
  return 40;
}
function scanCandidates(options) {
  const cfg = loadConfig();
  const postsDir = getPostsDir();
  const files = fs7.readdirSync(postsDir).filter((f) => f.endsWith(".mdx"));
  const majorCities = cfg.publishing?.majorCities || [];
  let candidates = [];
  for (const file of files) {
    const raw = fs7.readFileSync(path6.join(postsDir, file), "utf8");
    const { frontmatter } = parseMdx(raw);
    if (frontmatter.published === true) continue;
    const slug = file.replace(".mdx", "");
    if (options.slug && slug !== options.slug) continue;
    if (options.type) {
      const typeMatch = {
        "pass": slug.includes("pass-review"),
        "guide": slug.includes("guide"),
        "itinerary": slug.includes("itinerary") || slug.includes("days-in"),
        "things-to-do": slug.includes("things-to-do") || slug.includes("top-things")
      }[options.type];
      if (!typeMatch) continue;
    }
    if (options.country && !slug.toLowerCase().includes(options.country.toLowerCase())) continue;
    const priority = scorePriority2(slug, majorCities, cfg);
    candidates.push({
      slug,
      filePath: path6.join(postsDir, file),
      title: frontmatter.title || slug,
      priority
    });
  }
  candidates.sort((a, b) => b.priority - a.priority || a.slug.localeCompare(b.slug));
  if (options.limit) candidates = candidates.slice(0, options.limit);
  return candidates;
}
function publishBatch(candidates, dryRun = false) {
  const cfg = loadConfig();
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const errors = [];
  let published = 0;
  const publishedCandidates = [];
  for (const c of candidates) {
    try {
      const raw = fs7.readFileSync(c.filePath, "utf8");
      const { frontmatter, content } = parseMdx(raw);
      if (frontmatter.published === true) {
        console.log(`     \u23ED\uFE0F  "${c.slug}" already published`);
        continue;
      }
      frontmatter.published = true;
      frontmatter.lastModified = today;
      if (!frontmatter.date) frontmatter.date = today;
      const newRaw = buildFrontmatterBlock(frontmatter) + content;
      if (!dryRun) {
        fs7.writeFileSync(c.filePath, newRaw, "utf8");
        console.log(`     \u2705 Published: ${c.slug}`);
      } else {
        console.log(`     [DRY RUN] Would publish: ${c.slug}`);
      }
      published++;
      publishedCandidates.push(c);
      if (!dryRun && cfg.publishing?.indexnowHost) {
        pingIndexNow(cfg.publishing.baseUrl, c.slug, cfg.publishing.indexnowHost);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push(`${c.slug}: ${msg}`);
      console.error(`     \u274C ${c.slug}: ${msg}`);
    }
  }
  if (published > 0 && !dryRun) {
    try {
      gitCommit(published, publishedCandidates, cfg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      errors.push(`git: ${msg}`);
      console.error(`     \u274C Git error: ${msg}`);
    }
  }
  return { published, errors };
}
function gitCommit(count, candidates, cfg) {
  const files = candidates.map((c) => c.filePath);
  const msg = count === 1 ? `content: publish 1 post` : `content: publish ${count} posts (${candidates[0].slug}${count > 1 ? `, +${count - 1} more` : ""})`;
  const email = cfg.publishing?.gitEmail || "noreply@seoflow.dev";
  const name = cfg.publishing?.gitName || "SeoFlow Publisher";
  const branch = cfg.publishing?.branch || "main";
  try {
    execFileSync("git", ["config", "user.email", email], { stdio: "ignore" });
  } catch {
  }
  try {
    execFileSync("git", ["config", "user.name", name], { stdio: "ignore" });
  } catch {
  }
  execFileSync("git", ["add", ...files], { stdio: "inherit" });
  execFileSync("git", ["commit", "-m", msg], { stdio: "inherit" });
  execFileSync("git", ["push", "origin", branch], { stdio: "inherit" });
  console.log(`     \u{1F4E4} Pushed to ${branch}`);
}
function pingIndexNow(baseUrl, slug, key) {
  const blogPrefix = loadConfig().blogPrefix || "/blog/";
  const url = `${baseUrl.replace(/\/$/, "")}${blogPrefix}${slug}/`;
  const body = JSON.stringify({
    host: baseUrl.replace(/^https?:\/\//, ""),
    key,
    keyLocation: `${baseUrl}/${key}.txt`,
    urlList: [url]
  });
  try {
    execFileSync("curl", [
      "-s",
      "-X",
      "POST",
      "https://api.indexnow.org/indexnow",
      "-H",
      "Content-Type: application/json",
      "-d",
      body
    ], { stdio: "ignore", timeout: 1e4 });
    console.log(`     \u{1F4E1} IndexNow pinged: ${url}`);
  } catch {
    console.log(`     \u26A0\uFE0F  IndexNow ping failed (non-critical)`);
  }
}

// lib/validator.ts
import fs8 from "fs";
function validateConfig(cfg) {
  const checks = [];
  const requiredStrings = ["siteName", "siteUrl", "author", "authorLocation", "postsDir"];
  for (const field of requiredStrings) {
    const val = cfg[field];
    if (!val || typeof val === "string" && val.trim() === "") {
      checks.push({ field, status: "error", message: `Missing required field: ${field}` });
    } else {
      checks.push({ field, status: "ok", message: `${field}: ${String(val).slice(0, 50)}` });
    }
  }
  if (!cfg.writingSample && !cfg.writingSamples) {
    checks.push({ field: "writingSample", status: "warn", message: "No writingSample set \u2014 AI content audit will use generic voice (add writingSample or writingSamples to config)" });
  } else if (cfg.writingSamples) {
    const count = Object.keys(cfg.writingSamples).length;
    checks.push({ field: "writingSamples", status: "ok", message: `writingSamples: ${count} voice sample(s) configured` });
  } else {
    checks.push({ field: "writingSample", status: "ok", message: `writingSample: ${String(cfg.writingSample).slice(0, 50)}...` });
  }
  const dirPaths = [
    ["postsDir", cfg.postsDir],
    ["gscPagesCsv", cfg.gscPagesCsv],
    ["gscQueriesCsv", cfg.gscQueriesCsv]
  ];
  for (const [name, p] of dirPaths) {
    if (fs8.existsSync(p)) {
      checks.push({ field: name, status: "ok", message: `Found: ${p}` });
    } else {
      checks.push({ field: name, status: "warn", message: `Not found: ${p} (may be intentional)` });
    }
  }
  if (!cfg.tools || cfg.tools.length === 0) {
    checks.push({ field: "tools", status: "warn", message: "No tool triggers configured \u2014 link injection disabled" });
  } else {
    checks.push({ field: "tools", status: "ok", message: `${cfg.tools.length} tool triggers` });
  }
  if (!cfg.bookings || cfg.bookings.length === 0) {
    checks.push({ field: "bookings", status: "warn", message: "No booking triggers configured" });
  } else {
    checks.push({ field: "bookings", status: "ok", message: `${cfg.bookings.length} booking triggers` });
  }
  if (cfg.contentFormat && cfg.contentFormat !== "mdx" && cfg.contentFormat !== "markdown" && cfg.contentFormat !== "wordpress") {
    checks.push({ field: "contentFormat", status: "warn", message: `Unknown contentFormat "${cfg.contentFormat}" \u2014 defaulting to "mdx"` });
  } else if (cfg.contentFormat) {
    checks.push({ field: "contentFormat", status: "ok", message: `contentFormat: ${cfg.contentFormat}` });
  }
  if (cfg.aiLimits?.maxCallsPerRun) {
    checks.push({ field: "aiLimits", status: "ok", message: `AI budget: max ${cfg.aiLimits.maxCallsPerRun} calls/run, ${cfg.aiLimits.maxCallsPerPost || "\u221E"} calls/post` });
  }
  const valid = checks.every((c) => c.status !== "error");
  return { valid, checks };
}
function validateEnv() {
  const checks = [];
  const providers = [
    { key: "GEMINI_API_KEY", label: "Gemini", required: false },
    { key: "OPENROUTER_API_KEY", label: "OpenRouter", required: false },
    { key: "NEURONWRITER_API_KEY", label: "NeuronWriter", required: false },
    { key: "PEXELS_API_KEY", label: "Pexels", required: false }
  ];
  let hasAi = false;
  for (const p of providers) {
    const val = process.env[p.key];
    if (val) {
      checks.push({ field: p.key, status: "ok", message: `${p.label}: configured` });
      if (p.key === "GEMINI_API_KEY" || p.key === "OPENROUTER_API_KEY") hasAi = true;
    } else {
      checks.push({ field: p.key, status: "warn", message: `${p.label}: not set (${p.label === "GEMINI_API_KEY" || p.label === "OPENROUTER_API_KEY" ? "optional but recommended" : "optional"})` });
    }
  }
  if (!hasAi) {
    checks.push({ field: "AI_PROVIDER", status: "error", message: "No AI provider configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY." });
  }
  const provider = process.env.AI_PROVIDER;
  if (provider && !["gemini", "openrouter", "claude"].includes(provider.toLowerCase())) {
    checks.push({ field: "AI_PROVIDER", status: "warn", message: `Invalid value "${provider}". Use "gemini", "openrouter", or "claude".` });
  }
  const valid = checks.every((c) => c.status !== "error");
  return { valid, checks };
}
function printValidation(cfg) {
  const configCheck = validateConfig(cfg);
  const envCheck = validateEnv();
  console.log("\n\u{1F50E} Configuration Check");
  console.log("\u2500".repeat(60));
  for (const c of configCheck.checks) {
    const icon = c.status === "ok" ? "\u2705" : c.status === "warn" ? "\u26A0\uFE0F" : "\u274C";
    console.log(`  ${icon} ${c.message}`);
  }
  console.log("\n\u{1F50E} Environment Check");
  console.log("\u2500".repeat(60));
  for (const c of envCheck.checks) {
    const icon = c.status === "ok" ? "\u2705" : c.status === "warn" ? "\u26A0\uFE0F" : "\u274C";
    console.log(`  ${icon} ${c.message}`);
  }
  if (!configCheck.valid || !envCheck.valid) {
    console.log("\n\u26A0\uFE0F  Some checks failed. Pipeline may not work correctly.");
    console.log("   Fix the errors above and re-run.");
  }
  console.log("");
}

// run.ts
var rawArgs = process.argv.slice(2);
var VERB = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs[0] : null;
var VERB_ARG = rawArgs[1] && !rawArgs[1].startsWith("--") ? rawArgs[1] : null;
var DRY_RUN = rawArgs.includes("--dry-run");
var LIMIT = (() => {
  const i = rawArgs.indexOf("--limit");
  return i !== -1 ? parseInt(rawArgs[i + 1]) || 10 : 10;
})();
var SLUG_FILTER = (() => {
  if (VERB === "audit" && VERB_ARG) return VERB_ARG;
  const i = rawArgs.indexOf("--slug");
  return i !== -1 ? rawArgs[i + 1] : null;
})();
var RESET_SLUG = (() => {
  const i = rawArgs.indexOf("--reset-slug");
  return i !== -1 ? rawArgs[i + 1] : null;
})();
var MODE = (() => {
  if (VERB === "audit") return "all";
  if (VERB === "generate") return "generate";
  if (VERB === "publish") return "publish";
  if (VERB === "cluster") return "cluster";
  if (VERB === "brief") return "brief";
  const i = rawArgs.indexOf("--mode");
  const modeArg = i !== -1 ? rawArgs[i + 1] : "all";
  const validModes = ["all", "meta", "links", "images", "keywords", "neuron", "content", "review", "factcheck", "schema", "technical", "quality", "report"];
  return validModes.includes(modeArg) ? modeArg : "all";
})();
async function cmdCluster() {
  loadEnv();
  loadConfig();
  const seed = VERB_ARG || rawArgs.find((arg) => !arg.startsWith("--"));
  if (!seed) {
    console.log("\n\u274C No seed keyword provided");
    console.log("Usage: seoflow cluster <seed-keyword>\n");
    process.exit(1);
  }
  console.log(`
\u{1F3AF} Semantic Clustering: "${seed}"`);
  const { generateClusterPlan: generateClusterPlan2, saveClusterPlan: saveClusterPlan2 } = await Promise.resolve().then(() => (init_cluster(), cluster_exports));
  const plan = await generateClusterPlan2(seed);
  const outputDir = "cluster-plan";
  saveClusterPlan2(plan, outputDir);
  console.log(`
\u2705 Cluster plan generated!`);
  console.log(`   View: cat ${outputDir}/cluster-plan.md`);
  console.log(`   File: ${outputDir}/cluster-plan.json`);
  console.log(`   Total posts: ${plan.meta.totalPosts}`);
  console.log(`   Estimated words: ${plan.meta.estimatedWords.toLocaleString()}`);
  console.log("");
}
async function cmdBrief() {
  loadEnv();
  loadConfig();
  const keyword = VERB_ARG || rawArgs.find((arg) => !arg.startsWith("--"));
  if (!keyword) {
    console.log("\n\u274C No keyword provided");
    console.log("Usage: seoflow brief <keyword>\n");
    process.exit(1);
  }
  console.log(`
\u{1F4DD} Generating Content Brief: "${keyword}"`);
  const { generateContentBrief: generateContentBrief2, saveContentBrief: saveContentBrief2 } = await Promise.resolve().then(() => (init_content_brief(), content_brief_exports));
  const brief = await generateContentBrief2(keyword);
  saveContentBrief2(brief);
  console.log(`
\u2705 Content brief generated!`);
  const slug = keyword.toLowerCase().replace(/\s+/g, "-");
  console.log(`   View: cat content-briefs/${slug}-brief.md`);
  console.log(`   File: content-briefs/${slug}-brief.json`);
  console.log(`   Target word count: ${brief.targetWordCount.toLocaleString()} words`);
  console.log(`   Sections: ${brief.outline.length}`);
  console.log("");
}
async function cmdExtensions() {
  const { formatExtensionStatus: formatExtensionStatus2, getSupportedExtensions: getSupportedExtensions2, installExtension: installExtension2, getExtensionState: getExtensionState2 } = await Promise.resolve().then(() => (init_extensions(), extensions_exports));
  const subcommand = rawArgs[1];
  const extensionId = rawArgs[2];
  if (subcommand === "install") {
    const result = installExtension2(extensionId || "", { rootDir: process.cwd() });
    if (result.status === "unavailable") {
      console.error(`Unknown extension: ${extensionId}`);
      process.exit(1);
    }
    console.log(`Installed extension: ${result.extensionId}`);
    return;
  }
  if (subcommand === "status") {
    const state = getExtensionState2(process.cwd());
    if (Object.keys(state).length === 0) {
      console.log("No extensions installed yet.");
      return;
    }
    for (const [id, extState] of Object.entries(state)) {
      console.log(`${id}: ${extState.status}`);
    }
    return;
  }
  console.log("Supported optional extensions:");
  for (const ext of getSupportedExtensions2()) {
    console.log(`- ${ext.id}: ${ext.name} \u2014 ${ext.description}`);
  }
  console.log("\nInstalled state:");
  for (const line of formatExtensionStatus2(process.cwd())) {
    console.log(line);
  }
}
async function cmdInit() {
  const configPath = path13.join(process.cwd(), "seoflow.config.json");
  if (fs15.existsSync(configPath)) {
    console.log("\u2713 seoflow.config.json already exists");
    console.log("  Delete it and re-run to reconfigure, or edit it directly.");
    return;
  }
  console.log("\n  Run the interactive installer:\n");
  console.log("  bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)\n");
  console.log("  Or copy the template and fill it in:");
  const templatePath = path13.join(process.cwd(), ".seoflow", "seoflow.config.template.json");
  if (fs15.existsSync(templatePath)) {
    console.log(`  cp ${templatePath} seoflow.config.json
`);
  }
}
async function cmdStatus() {
  loadEnv();
  const cfg = loadConfig();
  const auditLog = loadAuditLog();
  await detectGscSource();
  const postsDir = getPostsDir();
  const allFiles = fs15.existsSync(postsDir) ? fs15.readdirSync(postsDir).filter((f) => f.endsWith(".mdx")) : [];
  const posts = auditLog.posts || {};
  const completed = Object.values(posts).filter((p) => p.status === "completed").length;
  const pending = allFiles.length - completed;
  const flagged = Object.entries(posts).filter(([, p]) => p.flagged_for_manual);
  const gscPages = await parseGscPages(cfg.gscDays || 28);
  const lines = [
    `
\u{1F4CA} SeoFlow Status \u2014 ${cfg.siteName}`,
    "\u2500".repeat(50),
    `  Posts total:    ${allFiles.length}`,
    `  Completed:      ${completed}`,
    `  Pending:        ${pending}`,
    `  Flagged:        ${flagged.length}`,
    `  GSC pages:      ${Object.keys(gscPages).length}`,
    `  GSC source:     ${gscSourceLabel()}`,
    `  Last run:       ${auditLog.last_run || "never"}`
  ];
  if (cfg.aiLimits?.maxCallsPerRun) {
    lines.push(`  AI budget:      ${cfg.aiLimits.maxCallsPerRun} calls/run, ${cfg.aiLimits.maxCallsPerPost || "\u221E"} calls/post`);
  }
  if (cfg.aiLimits?.enabledSteps) {
    lines.push(`  AI steps:       ${cfg.aiLimits.enabledSteps.join(", ")}`);
  }
  console.log(lines.join("\n"));
  if (flagged.length > 0) {
    console.log("\n\u26A0\uFE0F  Flagged for manual review:");
    for (const [slug] of flagged.slice(0, 10)) console.log(`    \u2022 ${slug}`);
  }
  const lessons = getLearningSummary();
  if (lessons.length > 0) {
    console.log("\n\u{1F9E0} Learning summary:");
    for (const l of lessons) console.log(l);
  }
  console.log("");
}
function cmdLearn() {
  loadEnv();
  loadConfig();
  const learningPath = path13.join(
    path13.dirname(getAuditLogPath()),
    "learning.json"
  );
  if (!fs15.existsSync(learningPath)) {
    console.log("\n\u26A0\uFE0F  No learning data yet. Run the pipeline on some posts first.\n");
    return;
  }
  const db = JSON.parse(fs15.readFileSync(learningPath, "utf8"));
  console.log("\n\u{1F9E0} SeoFlow Learning Insights");
  console.log("\u2500".repeat(60));
  const steps = Object.entries(db.steps || {});
  if (steps.length > 0) {
    console.log("\nStep Effectiveness:");
    console.log("  Step          Runs  Success  Avg Pos Change  Best Categories");
    console.log("  " + "\u2500".repeat(70));
    for (const [name, s] of steps) {
      if (s.runs < 1) continue;
      const pct = s.runs > 0 ? Math.round(s.improved / s.runs * 100) : 0;
      const pos = s.avgPositionChange?.toFixed(1) ?? "0.0";
      const dir = (s.avgPositionChange ?? 0) < 0 ? "\u2191" : "\u2193";
      const cats = (s.bestForCategories || []).slice(0, 3).join(", ") || "\u2014";
      console.log(`  ${name.padEnd(14)}${String(s.runs).padEnd(6)}${String(pct + "%").padEnd(9)}${(dir + Math.abs(parseFloat(pos))).padEnd(16)}${cats}`);
    }
  }
  const patterns = Object.entries(db.patterns || {});
  if (patterns.length > 0) {
    console.log("\nContent Patterns (what correlates with higher CTR):");
    console.log("  " + "\u2500".repeat(60));
    for (const [dim, insights] of patterns) {
      const best = insights?.[0];
      if (!best || best.sampleSize < 3) continue;
      console.log(`  ${dim.padEnd(18)} best range: ${best.range.padEnd(12)} \u2192 ${best.avgCtr.toFixed(1)}% CTR, pos ${best.avgPosition.toFixed(1)} (n=${best.sampleSize})`);
    }
  }
  console.log(`
  Data file: ${learningPath}`);
  console.log("  Tip: seoflow learning export  \u2192  share with teammates or other sites\n");
}
function cmdLearningExport(outFile) {
  loadEnv();
  loadConfig();
  const dataDir = path13.dirname(getAuditLogPath());
  const learningPath = path13.join(dataDir, "learning.json");
  const baselinesPath = path13.join(dataDir, "gsc-baselines.json");
  const bundle = {
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    version: "2.0"
  };
  if (fs15.existsSync(learningPath)) {
    bundle.learning = JSON.parse(fs15.readFileSync(learningPath, "utf8"));
  }
  if (fs15.existsSync(baselinesPath)) {
    bundle.gscBaselines = JSON.parse(fs15.readFileSync(baselinesPath, "utf8"));
  }
  const dest = outFile || `seoflow-learning-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
  fs15.writeFileSync(dest, JSON.stringify(bundle, null, 2));
  console.log(`
\u2705 Learning data exported to: ${dest}`);
  console.log("   Import on another machine: seoflow learning import " + dest + "\n");
}
function cmdLearningImport(inFile) {
  loadEnv();
  loadConfig();
  if (!inFile || !fs15.existsSync(inFile)) {
    console.error(`
\u274C File not found: ${inFile || "(no file specified)"}`);
    console.error("   Usage: seoflow learning import <file.json>\n");
    process.exit(1);
  }
  const bundle = JSON.parse(fs15.readFileSync(inFile, "utf8"));
  const dataDir = path13.dirname(getAuditLogPath());
  if (!fs15.existsSync(dataDir)) fs15.mkdirSync(dataDir, { recursive: true });
  if (bundle.learning) {
    fs15.writeFileSync(path13.join(dataDir, "learning.json"), JSON.stringify(bundle.learning, null, 2));
    console.log("  \u2705 Imported learning.json");
  }
  if (bundle.gscBaselines) {
    fs15.writeFileSync(path13.join(dataDir, "gsc-baselines.json"), JSON.stringify(bundle.gscBaselines, null, 2));
    console.log("  \u2705 Imported gsc-baselines.json");
  }
  console.log(`
\u2705 Learning data imported from: ${inFile}
`);
}
async function runPipeline() {
  if (VERB === "init") {
    await cmdInit();
    return;
  }
  if (VERB === "extensions") {
    await cmdExtensions();
    return;
  }
  loadEnv();
  if (VERB === "status") {
    await cmdStatus();
    return;
  }
  if (VERB === "learn") {
    cmdLearn();
    return;
  }
  if (VERB === "learning") {
    const sub = rawArgs[1];
    if (sub === "export") {
      cmdLearningExport(rawArgs[2]);
      return;
    }
    if (sub === "import") {
      cmdLearningImport(rawArgs[2]);
      return;
    }
    console.error("Usage: seoflow learning export [file]  |  seoflow learning import <file>");
    process.exit(1);
  }
  if (VERB === "cluster") {
    await cmdCluster();
    return;
  }
  if (VERB === "brief") {
    await cmdBrief();
    return;
  }
  const cfg = loadConfig();
  console.log(`
\u{1F50D} ${cfg.siteName} \u2014 SeoFlow Pipeline`);
  console.log(`   Mode: ${MODE} | Limit: ${SLUG_FILTER ? 1 : LIMIT} | Dry run: ${DRY_RUN}`);
  if (cfg.aiLimits?.maxCallsPerRun) {
    const limit = cfg.aiLimits.maxCallsPerRun;
    const perPost = cfg.aiLimits.maxCallsPerPost || 3;
    const estPosts = Math.min(SLUG_FILTER ? 1 : LIMIT, Math.floor(limit / perPost));
    console.log(`   AI budget: max ${limit} calls/run (~${estPosts} posts with AI, ${perPost} calls each)`);
  }
  console.log("");
  resetAiCallCounter();
  const auditLog = loadAuditLog();
  await detectGscSource();
  console.log(`\u{1F4CA} GSC source: ${gscSourceLabel()}`);
  const gscPages = await parseGscPages(cfg.gscDays || 28);
  const gscQueries = await parseGscQueries(cfg.gscDays || 28);
  const postsDir = getPostsDir();
  const auditLogPath = getAuditLogPath();
  console.log(`\u{1F4CA} GSC data: ${Object.keys(gscPages).length} pages, ${Object.keys(gscQueries).length} queries`);
  if (RESET_SLUG) {
    if (auditLog.posts[RESET_SLUG]) {
      auditLog.posts[RESET_SLUG].status = "pending";
      auditLog.posts[RESET_SLUG].next_review = null;
      saveAuditLog(auditLog, DRY_RUN);
      console.log(`\u2705 Reset ${RESET_SLUG}`);
    } else {
      console.log(`\u26A0\uFE0F  "${RESET_SLUG}" not found in audit log`);
    }
    return;
  }
  printValidation(cfg);
  if (hasNeuronKey()) console.log(`\u{1F4E1} NeuronWriter: ${getNeuronProjectId()}`);
  else console.log("\u26A0\uFE0F  NEURONWRITER_API_KEY not set");
  logAiStatus();
  if (MODE === "generate") {
    const country = (() => {
      const i = rawArgs.indexOf("--country");
      return i !== -1 ? rawArgs[i + 1] : null;
    })();
    if (!SLUG_FILTER && !country) {
      console.log("   Provide --slug <keyword> or --country <name> to generate content");
      console.log('   Example: seoflow generate --slug "best restaurants in prague" --country "Czech Republic"');
      console.log("");
      return;
    }
    const gaps = [
      { keyword: SLUG_FILTER || "top things to do", type: "things-to-do", destination: country || "", country: country || "" }
    ];
    const results2 = await generateBatch(gaps, LIMIT);
    console.log(`
\u2705 Generated ${results2.length} posts in ${postsDir}`);
    console.log(`   Run \`seoflow audit <slug>\` to optimize them.`);
    return;
  }
  if (MODE === "publish") {
    const goFlag = rawArgs.includes("--go");
    if (!goFlag) {
      console.log("\u26A0\uFE0F  Dry run mode. Use --go to actually publish.");
      console.log("");
    }
    const candidates2 = scanCandidates({ slug: SLUG_FILTER || void 0, limit: LIMIT });
    if (candidates2.length === 0) {
      console.log("\u{1F4ED} No unpublished posts found");
      console.log("");
      return;
    }
    console.log(`\u{1F4CB} ${candidates2.length} unpublished posts found:
`);
    for (const c of candidates2) console.log(`   ${c.priority} ${c.slug}`);
    console.log("");
    const result = publishBatch(candidates2, !goFlag);
    console.log(`
\u2705 Published ${result.published} posts (${result.errors.length} errors)`);
    if (result.errors.length > 0) {
      console.log(`
\u274C Errors:`);
      for (const e of result.errors) console.log(`   \u2022 ${e}`);
    }
    return;
  }
  const files = fs15.readdirSync(postsDir).filter((f) => f.endsWith(".mdx"));
  console.log(`\u{1F4C1} ${files.length} posts
`);
  let candidates = files.map((f) => {
    const slug = f.replace(".mdx", "");
    const gsc = gscPages[slug] || {};
    const prediction = predictPriority(slug, gsc);
    return {
      slug,
      filePath: path13.join(postsDir, f),
      priority: prediction.totalScore || 0,
      gsc,
      patterns: prediction.patterns
    };
  });
  if (SLUG_FILTER) {
    candidates = candidates.filter((c) => c.slug === SLUG_FILTER);
    if (!candidates.length) {
      console.error(`\u274C No post: ${SLUG_FILTER}`);
      process.exit(1);
    }
  } else {
    candidates = candidates.filter((c) => MODE === "review" || MODE === "factcheck" || !isAlreadyDone(auditLog, c.slug)).sort((a, b) => b.priority - a.priority).slice(0, LIMIT);
  }
  console.log(`\u{1F3AF} ${candidates.length} posts
${"\u2500".repeat(60)}`);
  const withPatterns = candidates.filter((c) => c.patterns && c.patterns.length > 0);
  if (withPatterns.length > 0 && MODE === "all") {
    console.log("\n\u{1F9E0} Predictive insights:");
    for (const c of withPatterns.slice(0, 3)) {
      for (const p of c.patterns) console.log(`   ${c.slug}: ${p}`);
    }
    console.log("");
  }
  const results = [];
  const { processPost: processPost2 } = await Promise.resolve().then(() => (init_steps(), steps_exports));
  for (const c of candidates) {
    const r = await processPost2(c.slug, c.filePath, gscPages, auditLog, { mode: MODE, skipAlreadyDone: !SLUG_FILTER && MODE === "all", dryRun: DRY_RUN });
    results.push(r);
    if (!DRY_RUN && r.after) {
      try {
        const raw = fs15.readFileSync(c.filePath, "utf8");
        const parsed = await Promise.resolve().then(() => (init_mdx_parser(), mdx_parser_exports));
        const fm = parsed.parseMdx(raw).frontmatter;
        recordContentSnapshot(c.slug, {
          title: fm.title || c.slug,
          titleLength: (fm.title || "").length,
          descLength: (fm.description || "").length,
          wordCount: r.after.word_count || 0,
          imageCount: r.after.images || 0,
          imageDensity: r.after.word_count > 0 ? (r.after.images || 0) / (r.after.word_count / 1e3) : 0,
          linkCount: r.after.internal_links || 0,
          schema: fm.schema || "",
          category: fm.category || ""
        });
      } catch {
      }
    }
    saveAuditLog(auditLog, DRY_RUN);
  }
  let total = 0;
  let completed = 0;
  let improved = 0;
  try {
    total = results.reduce((s, r) => s + (r?.changes || 0), 0);
    improved = results.filter((r) => r.changes > 0).length;
    completed = auditLog?.posts ? Object.values(auditLog.posts).filter((e) => e?.status === "completed").length : 0;
  } catch {
  }
  console.log(`
${"\u2550".repeat(60)}
\u{1F4CB} SUMMARY
${"\u2550".repeat(60)}`);
  console.log(`  Processed: ${results.length} | Improved: ${improved} | Changes: ${total}`);
  console.log(`  Pending: ${files.length - completed}`);
  const aiCalls = getAiCallCount();
  if (aiCalls > 0) {
    const budget = cfg.aiLimits?.maxCallsPerRun;
    console.log(`  AI calls: ${aiCalls}${budget ? `/${budget}` : ""}`);
  }
  const flagged = auditLog?.posts ? Object.entries(auditLog.posts).filter(([, v]) => v.flagged_for_manual) : [];
  if (flagged.length) {
    console.log(`
\u26A0\uFE0F  Manual review (${flagged.length}):`);
    for (const [s] of flagged.slice(0, 10)) console.log(`    \u2022 ${s}`);
  }
  const lessons = getLearningSummary();
  if (lessons.length > 0) {
    console.log(`
\u{1F9E0} Learning (step effectiveness):`);
    for (const l of lessons) console.log(l);
  }
  const lowCtr = Object.entries(gscPages).filter(([, d]) => d.impressions > 2e3 && d.ctr < 3).sort((a, b) => b[1].impressions - a[1].impressions).slice(0, 5);
  if (lowCtr.length) {
    console.log(`
\u{1F3AF} CTR opportunities:`);
    for (const [s, d] of lowCtr) console.log(`    ${auditLog.posts[s]?.status === "completed" ? "\u2705" : "\u23F3"} ${s} \u2014 ${d.impressions.toLocaleString()} impressions, ${d.ctr.toFixed(2)}% CTR`);
  }
  console.log();
  if (!DRY_RUN) console.log(`\u2705 Log: ${auditLogPath}`);
}
runPipeline().catch((e) => {
  console.error("Fatal:", e?.message || e, e?.stack?.split("\n").slice(0, 3).join("\n") || "");
  process.exit(1);
});
export {
  runPipeline
};
//# sourceMappingURL=run.js.map
