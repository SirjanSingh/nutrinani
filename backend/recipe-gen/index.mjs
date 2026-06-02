// index.mjs — NutriNani /generate-recipe
// Gemini (text) + Imagen (images) on Vertex AI. Keyless auth via Workload
// Identity Federation: this Lambda's AWS role is exchanged for a Google token
// that impersonates the Vertex service account. Draws on the project's credits.
//
// Routes (all POST /generate-recipe, switched by body.mode):
//   (no mode)         -> generate recipe TEXT only (fast, < 30s)
//   mode "main-image" -> generate the hero image for a recipe
//   mode "step-image" -> generate one cooking-step image
//
// Required env: GCP_PROJECT_ID. Optional: GCP_REGION, GEMINI_MODEL, IMAGEN_MODEL,
//   GOOGLE_APPLICATION_CREDENTIALS (path to the bundled WIF config).

import { GoogleAuth } from "google-auth-library";

const GCP_PROJECT = process.env.GCP_PROJECT_ID;
const GCP_LOCATION = process.env.GCP_REGION || "us-central1";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const IMAGEN_MODEL = process.env.IMAGEN_MODEL || "imagen-3.0-fast-generate-001";
const IMAGE_NEGATIVE_PROMPT =
  process.env.IMAGE_NEGATIVE_PROMPT ||
  "text, words, letters, captions, watermark, logo, blurry, low quality, distorted, " +
    "deformed hands, extra fingers, extra limbs, cartoon, illustration, cluttered";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Content-Type": "application/json",
};

const auth = new GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" });
let _client; // reused across warm invocations (caches tokens)

async function vertex(modelPath, data) {
  if (!_client) _client = await auth.getClient();
  const url = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${GCP_LOCATION}/publishers/google/models/${modelPath}`;
  const res = await _client.request({ url, method: "POST", data });
  return res.data;
}

const ok = (body) => ({ statusCode: 200, headers: CORS, body: JSON.stringify(body) });
const bad = (msg) => ({ statusCode: 400, headers: CORS, body: JSON.stringify({ error: msg }) });

export const handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod;
    if (method === "OPTIONS") return { statusCode: 204, headers: CORS };
    if (!GCP_PROJECT) throw new Error("GCP_PROJECT_ID is not set");

    const body = JSON.parse(event.body || "{}");

    // ---------- Hero image (the finished plated dish) ----------
    if (body.mode === "main-image") {
      const subject = body.imagePrompt || `${body.recipeName || "a finished dish"}`;
      const prompt =
        `Appetizing food photography of the finished dish: ${subject}. ` +
        `Beautifully plated and garnished on a clean plate, soft natural lighting, ` +
        `shallow depth of field, 45-degree angle, clean background, photorealistic, magazine quality.`;
      const image = await generateImage(prompt);
      return ok({ image });
    }

    // ---------- Single cooking-step image (an action in progress, NOT plated food) ----------
    if (body.mode === "step-image") {
      if (!body.step) return bad("step text required");
      const dish = body.recipeName || "the dish";
      const prompt =
        `Realistic instructional cooking photo showing this preparation step for ${dish}: ${body.step}. ` +
        `Top-down view of the ingredients and cookware on a counter in a clean modern kitchen, ` +
        `bright natural lighting, photographic, simple and uncluttered.`;
      const image = await generateImage(prompt);
      return ok({ image });
    }

    // ---------- Main recipe TEXT (images are fetched separately by the frontend) ----------
    const { baseIngredient, mealType, profile } = body;
    if (!baseIngredient || !mealType) return bad("Missing baseIngredient or mealType");

    const diet = (profile?.diet || "vegetarian").toLowerCase();
    const allergens = Array.isArray(profile?.allergens) ? profile.allergens : [];
    const conditions = Array.isArray(profile?.conditions)
      ? profile.conditions
      : (typeof profile?.conditions === "string" && profile.conditions.trim())
        ? [profile.conditions.trim()]
        : [];

    const recipe = await generateRecipeText({ baseIngredient, mealType, diet, allergens, conditions });
    return ok({ recipe });
  } catch (err) {
    console.error("LAMBDA ERROR:", err?.response?.data || err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};

// ---------- Gemini text (JSON mode) ----------
async function generateRecipeText({ baseIngredient, mealType, diet, allergens, conditions }) {
  const prompt = `
You are a nutrition-aware recipe generator.

Diet rules:
- vegetarian: no meat, no egg
- eggetarian: egg allowed, no meat
- vegan: no dairy, no egg, no meat
- non-vegetarian: all allowed

User diet: ${diet}
Base ingredient: ${baseIngredient}
Meal type: ${mealType}
Allergens to avoid: ${allergens.join(", ") || "none"}
Health conditions: ${conditions.join(", ") || "none"}

Return ONLY a valid JSON object in this EXACT shape:

{
  "recipeName": "",
  "ingredients": [ { "item": "", "quantity": "" } ],
  "steps": [ "" ],
  "healthScores": { },
  "imagePrompt": ""
}

Rules for healthScores (0-100) — include only keys relevant to the user's conditions/diet:
- diabetes           -> "diabeticSafe"
- hypertension / BP  -> "lowSodium"
- heart disease      -> "heartHealthy"
- sugar restriction  -> "lowSugar"
- gluten-free/celiac -> "glutenFree"
- lactose intolerance-> "dairyFree"
- keto / low-carb    -> "lowCarb"
- kidney disease     -> "kidneyFriendly"
- specific allergens -> "allergenFree"
- diet compatibility -> "veganFriendly" OR "vegetarianFriendly"

Rules:
- Ingredients ONLY in "ingredients"
- "steps": between 4 and 7 steps. NEVER more than 7. Combine minor actions into one step; do not over-split.
- Each step is ONE short, clear sentence describing a single cooking action (no quantities inside steps)
- Use "to taste" for salt/pepper/spices, "as needed" for oil/butter/ghee
- Be specific for main ingredients (e.g. "2 cups", "500g")
- imagePrompt: one vivid sentence describing the finished plated dish — colors, plating, garnish, lighting, angle
`;

  const data = await vertex(`${GEMINI_MODEL}:generateContent`, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
  });

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini text response");
  return JSON.parse(extractJson(text));
}

// ---------- Imagen image generation -> data URL ----------
async function generateImage(prompt) {
  const data = await vertex(`${IMAGEN_MODEL}:predict`, {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1",
      negativePrompt: IMAGE_NEGATIVE_PROMPT,
    },
  });

  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("Imagen returned no image");
  return `data:image/png;base64,${b64}`;
}

// ---------- Bulletproof JSON extractor ----------
function extractJson(text) {
  let t = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  if (!t.startsWith("{")) {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  }
  return t;
}
