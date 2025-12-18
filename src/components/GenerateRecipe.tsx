import { generateRecipe } from "@/services/recipeApi";

export default function GenerateRecipe() {
  const handleClick = async () => {
    try {
      const profile = {
        userId: "123",
        diet: "veg",
        allergens: ["peanuts"],
        conditions: ["diabetes"],
        mealType: "dinner"
      };

      const result = await generateRecipe(profile);
      console.log(result); // 👈 recipe comes here
      alert("Recipe generated! Check console.");

    } catch (err) {
      console.error(err);
      alert("Error generating recipe");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 bg-green-600 text-white rounded"
    >
      Generate Recipe
    </button>
  );
}
