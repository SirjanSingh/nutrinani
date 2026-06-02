/**
 * Standalone Vertex AI key checker — does NOT touch the app.
 *
 * Reads credentials from nutrinani/.env and makes one real call to the
 * Vertex AI `:generateContent` endpoint, then prints whether it worked.
 *
 * Run from the nutrinani/ folder:
 *   node scripts/test-vertex-key.mjs
 *
 * Required in .env:
 *   VERTEX_ACCESS_TOKEN   your AQ.Ab8RN... token (expires ~1h — refresh with
 *                         `gcloud auth print-access-token` when it dies)
 *   GOOGLE_CLOUD_PROJECT  your GCP project ID (e.g. project-c22b7a3a-10c5-...)
 * Optional in .env:
 *   GOOGLE_CLOUD_LOCATION region, default "us-central1" (use "global" for global)
 *   VERTEX_MODEL          model id, default "gemini-2.5-flash"
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", ".env");

/* ---- tiny .env parser (no dependency) ---- */
function loadEnv(path) {
  const out = {};
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    console.error(`✗ Could not read ${path}. Create it and add your token.`);
    process.exit(1);
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // strip surrounding single or double quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadEnv(ENV_PATH);

// process.env wins over .env so a fresh token can be piped in without storing it.
const TOKEN =
  process.env.VERTEX_ACCESS_TOKEN || env.VERTEX_ACCESS_TOKEN || env.GOOGLE_ACCESS_TOKEN || "";
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT || "";
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || env.GOOGLE_CLOUD_LOCATION || "us-central1";
const MODEL = process.env.VERTEX_MODEL || env.VERTEX_MODEL || "gemini-2.5-flash";

/* ---- validate inputs before spending a network call ---- */
const problems = [];
if (!TOKEN) problems.push("VERTEX_ACCESS_TOKEN is missing in .env");
if (!PROJECT) problems.push("GOOGLE_CLOUD_PROJECT is missing in .env");
if (problems.length) {
  console.error("✗ Cannot run the check:\n  - " + problems.join("\n  - "));
  process.exit(1);
}

if (!TOKEN.startsWith("AQ.") && !TOKEN.startsWith("ya29.")) {
  console.warn(
    `! Heads up: your token starts with "${TOKEN.slice(0, 6)}…". Vertex Bearer ` +
      `tokens normally start with "AQ." or "ya29.". If this is an "AIzaSy…" key ` +
      `it's an AI Studio key, not a Vertex token — this script won't match it.\n`
  );
}

/* ---- build the endpoint (global region has no region prefix) ---- */
const host =
  LOCATION === "global"
    ? "aiplatform.googleapis.com"
    : `${LOCATION}-aiplatform.googleapis.com`;
const url = `https://${host}/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

const body = {
  contents: [{ role: "user", parts: [{ text: "Reply with exactly: credits working" }] }],
  generationConfig: { temperature: 0, maxOutputTokens: 20 },
};

console.log("→ Project :", PROJECT);
console.log("→ Location:", LOCATION);
console.log("→ Model   :", MODEL);
console.log("→ Token   :", TOKEN.slice(0, 8) + "…" + TOKEN.slice(-4));
console.log("→ POST    :", url, "\n");

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await res.text();

if (res.ok) {
  let reply = "";
  try {
    const data = JSON.parse(text);
    reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    /* fall through to raw */
  }
  console.log("✓ SUCCESS — the key works against Vertex AI.");
  console.log("  Model replied:", JSON.stringify(reply || text.slice(0, 200)));
  process.exitCode = 0;
} else {
  /* ---- failure: explain the most common causes ---- */
  console.error(`✗ FAILED — HTTP ${res.status}`);
  console.error("  Response:", text.slice(0, 600));

  const hints = {
    401: "Token is invalid or expired (AQ./ya29. tokens last ~1h). Get a fresh one:\n      gcloud auth print-access-token",
    403: "Token is valid but lacks access. Enable the Vertex AI API in the project\n      and ensure the identity has the 'Vertex AI User' role. Also confirm the\n      project ID is correct and billing/credits are active.",
    404: "Endpoint not found — usually a wrong model id or region. Try VERTEX_MODEL=\n      gemini-2.0-flash, or GOOGLE_CLOUD_LOCATION=us-central1.",
  };
  if (hints[res.status]) console.error("\n  → Likely fix: " + hints[res.status]);
  process.exitCode = 1;
}
