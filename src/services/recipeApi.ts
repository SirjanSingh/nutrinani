// src/services/recipeApi.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type GenerateRecipePayload = {
  baseIngredient: string;
  mealType: string;
  profile: {
    diet: string;
    allergens: string[];
    conditions: string;
  };
};

export async function generateRecipe(payload: GenerateRecipePayload) {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/generate-recipe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
    } catch (networkErr) {
      // Network blip — retry if attempts remain
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 1200 * attempt));
        continue;
      }
      throw networkErr;
    }

    // 🔁 Transient AWS throttle / cold-start (502/503/504) — retry silently
    if ([502, 503, 504].includes(res.status) && attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, 1200 * attempt));
      continue;
    }

    const data = await res.json().catch(() => ({}));

    // 🔴 If backend explicitly sent error
    if (!res.ok || data.error) {
      throw new Error(data.error || "Failed to generate recipe");
    }

    // ✅ ALWAYS return recipe object
    return data.recipe;
  }

  throw new Error("Failed to generate recipe after multiple attempts");
}
