import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { generateRecipe } from "@/services/recipeApi";
import { useProfile } from "@/contexts/ProfileContext";

type Ingredient = {
  item: string;
  quantity: string;
};

type Recipe = {
  recipeName: string;
  steps: string[];
  ingredients: Ingredient[];
};

export default function Recipes() {
  const { profile } = useProfile();

  const [baseIngredient, setBaseIngredient] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
  try {
    setLoading(true);
    setError(null);

    const recipeData = await generateRecipe({
      baseIngredient,
      mealType,
      profile: {
        diet: profile.diet_type,
        allergens: profile.allergies || [],
        conditions: profile.other_restrictions
      }
    });

    setRecipe(recipeData);
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: RECIPE */}
      <Card className="p-6 lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-semibold">Nani-approved Recipe</h2>

        <Input
          placeholder="Enter base ingredient (e.g. rice, oats, paneer)"
          value={baseIngredient}
          onChange={(e) => setBaseIngredient(e.target.value)}
        />

        <Select
          value={mealType}
          onValueChange={(val) => setMealType(val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select meal type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="breakfast">Breakfast</SelectItem>
            <SelectItem value="lunch">Lunch</SelectItem>
            <SelectItem value="dinner">Dinner</SelectItem>
            <SelectItem value="snack">Snack</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Recipe"}
        </Button>

        {error && <p className="text-red-500">{error}</p>}

{recipe && (
  <>
    <h3 className="text-xl font-bold">{recipe.recipeName}</h3>

    <h4 className="font-semibold mt-4">Steps</h4>
    <ol className="list-decimal ml-5">
      {Array.isArray(recipe.steps) &&
        recipe.steps.map((step: string, i: number) => (
          <li key={i}>{step}</li>
        ))}
    </ol>
  </>
)}

      </Card>

      {/* RIGHT: SHOPPING LIST */}
      {recipe && (
        <Card className="p-6 space-y-3">
          <h3 className="text-xl font-semibold">Smart Shopping List</h3>

          {recipe.ingredients.map((ing, i) => (
            <label
              key={i}
              className="flex items-center gap-2 border rounded-lg p-2"
            >
              <input type="checkbox" />
              {ing.item} – {ing.quantity}
            </label>
          ))}
        </Card>
      )}
    </div>
  );
}