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
  const res = await fetch(`${API_BASE_URL}/generate-recipe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  // 🔴 If backend explicitly sent error
  if (!res.ok || data.error) {
    throw new Error(data.error || "Failed to generate recipe");
  }

  // ✅ ALWAYS return recipe object
  return data.recipe;
}
