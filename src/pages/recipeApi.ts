const API_BASE_URL = "https://<api-id>.execute-api.us-east-1.amazonaws.com";

export async function generateRecipe(profile: {
  userId: string;
  diet: string;
  allergens: string[];
  conditions: string[];
  mealType: string;
}) {
  const response = await fetch(`${API_BASE_URL}/generate-recipe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(profile)
  });

  if (!response.ok) {
    throw new Error("Failed to generate recipe");
  }

  return response.json();
}
