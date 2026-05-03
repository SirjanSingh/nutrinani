import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateRecipe } from "@/services/recipeApi";
import { useProfile } from "@/contexts/ProfileContext";
import { Loader2, ChefHat, Clock, Users, BookOpen, ImageIcon, ArrowRight, ArrowDown } from "lucide-react";

// ─── Health Score Engine ──────────────────────────────────────────────────────
type HealthScore = { label: string; emoji: string; score: number; color: string };

const INGREDIENT_KEYWORDS: Record<string, { bad: string[]; good?: string[] }> = {
  diabeticSafe: {
    bad: ["sugar", "syrup", "honey", "molasses", "corn starch", "white rice", "white bread",
          "refined flour", "maida", "candy", "jaggery", "glucose", "fructose", "maltose",
          "condensed milk", "ice cream", "chocolate"],
  },
  lowSugar: {
    bad: ["sugar", "syrup", "honey", "jaggery", "candy", "sweetener", "molasses",
          "condensed milk", "jam", "marmalade", "ketchup", "bbq sauce"],
  },
  vegan: {
    bad: ["chicken", "beef", "pork", "lamb", "mutton", "fish", "salmon", "tuna", "shrimp",
          "prawn", "egg", "eggs", "milk", "cream", "butter", "cheese", "paneer", "ghee",
          "yogurt", "curd", "whey", "honey", "gelatin", "lard", "bacon"],
  },
  vegetarian: {
    bad: ["chicken", "beef", "pork", "lamb", "mutton", "fish", "salmon", "tuna", "shrimp",
          "prawn", "gelatin", "lard", "bacon"],
  },
  glutenFree: {
    bad: ["wheat", "flour", "maida", "bread", "pasta", "noodles", "barley", "rye",
          "semolina", "suji", "rava", "biscuit", "crouton", "soy sauce"],
  },
  dairyFree: {
    bad: ["milk", "cream", "butter", "cheese", "paneer", "ghee", "yogurt", "curd",
          "whey", "condensed milk", "ice cream", "lactose"],
  },
  lowSodium: {
    bad: ["salt", "soy sauce", "pickle", "olives", "chips", "salted", "brine",
          "anchovies", "bacon", "canned", "processed"],
  },
  keto: {
    bad: ["rice", "bread", "pasta", "potato", "sugar", "flour", "maida", "oats",
          "corn", "banana", "mango", "grapes", "apple", "beans", "lentils"],
  },
  highProtein: {
    bad: [],
    good: ["chicken", "egg", "tofu", "lentils", "beans", "fish", "paneer",
           "chickpeas", "greek yogurt", "quinoa", "tuna", "salmon"],
  },
};

function calculateHealthScores(
  profile: { diet_type?: string; allergies?: any; other_restrictions?: any } | null,
  ingredients: { item: string; quantity: string }[]
): HealthScore[] {
  if (!profile || !ingredients?.length) return [];

  const normalize = (v: any): string[] => {
    if (Array.isArray(v)) return v.map((s) => String(s).toLowerCase().trim());
    if (typeof v === "string")
      return v.split(/[,;]+/).map((s) => s.toLowerCase().trim()).filter(Boolean);
    return [];
  };

  const ingredientText = ingredients
    .map((i) => i.item.toLowerCase())
    .join(" ");

  const checkScore = (badWords: string[], goodWords?: string[]) => {
    if (goodWords && goodWords.length > 0) {
      // For "positive" attributes like highProtein, score by presence of good words
      const found = goodWords.filter((w) => ingredientText.includes(w)).length;
      return Math.min(100, Math.round((found / goodWords.length) * 100 + 40));
    }
    const hits = badWords.filter((w) => ingredientText.includes(w)).length;
    return Math.max(0, 100 - hits * 18);
  };

  const scores: HealthScore[] = [];
  const diet = (profile.diet_type || "").toLowerCase();
  const conditions = normalize(profile.other_restrictions);
  const allergies = normalize(profile.allergies);

  // Diet-based scores
  if (diet === "vegan") {
    const s = INGREDIENT_KEYWORDS.vegan;
    scores.push({ label: "Vegan Friendly", emoji: "🌱", score: checkScore(s.bad!), color: "bg-green-100 text-green-800 border-green-200" });
  }
  if (diet === "vegetarian") {
    const s = INGREDIENT_KEYWORDS.vegetarian;
    scores.push({ label: "Vegetarian Safe", emoji: "🥦", score: checkScore(s.bad!), color: "bg-green-100 text-green-800 border-green-200" });
  }
  if (diet === "keto") {
    const s = INGREDIENT_KEYWORDS.keto;
    scores.push({ label: "Keto Friendly", emoji: "🥩", score: checkScore(s.bad!), color: "bg-yellow-100 text-yellow-800 border-yellow-200" });
  }
  if (diet === "high-protein") {
    const s = INGREDIENT_KEYWORDS.highProtein;
    scores.push({ label: "High Protein", emoji: "💪", score: checkScore([], s.good), color: "bg-blue-100 text-blue-800 border-blue-200" });
  }

  // Condition-based scores
  for (const cond of conditions) {
    if (cond.includes("diabet")) {
      const s = INGREDIENT_KEYWORDS.diabeticSafe;
      scores.push({ label: "Diabetic Safe", emoji: "💉", score: checkScore(s.bad!), color: "bg-blue-100 text-blue-800 border-blue-200" });
    }
    if (cond.includes("hypertension") || cond.includes("blood pressure") || cond.includes("low sodium")) {
      const s = INGREDIENT_KEYWORDS.lowSodium;
      scores.push({ label: "Low Sodium", emoji: "🫀", score: checkScore(s.bad!), color: "bg-purple-100 text-purple-800 border-purple-200" });
    }
    if (cond.includes("celiac") || cond.includes("gluten")) {
      const s = INGREDIENT_KEYWORDS.glutenFree;
      scores.push({ label: "Gluten Free", emoji: "🌾", score: checkScore(s.bad!), color: "bg-amber-100 text-amber-800 border-amber-200" });
    }
    if (cond.includes("lactose") || cond.includes("dairy")) {
      const s = INGREDIENT_KEYWORDS.dairyFree;
      scores.push({ label: "Dairy Free", emoji: "🥛", score: checkScore(s.bad!), color: "bg-sky-100 text-sky-800 border-sky-200" });
    }
    if (cond.includes("low sugar") || cond.includes("sugar free")) {
      const s = INGREDIENT_KEYWORDS.lowSugar;
      scores.push({ label: "Low Sugar", emoji: "🍬", score: checkScore(s.bad!), color: "bg-pink-100 text-pink-800 border-pink-200" });
    }
  }

  // Allergy-based scores
  for (const allergen of allergies) {
    const score = ingredientText.includes(allergen) ? 20 : 98;
    const label = allergen.charAt(0).toUpperCase() + allergen.slice(1);
    scores.push({ label: `${label} Free`, emoji: "⚠️", score, color: "bg-red-100 text-red-800 border-red-200" });
  }

  // Fallback: always show a Low Sugar badge if no profile conditions match
  if (scores.length === 0) {
    const s = INGREDIENT_KEYWORDS.lowSugar;
    scores.push({ label: "Low Sugar", emoji: "🍬", score: checkScore(s.bad!), color: "bg-green-100 text-green-800 border-green-200" });
  }

  // De-duplicate by label
  const seen = new Set<string>();
  return scores.filter((s) => { if (seen.has(s.label)) return false; seen.add(s.label); return true; });
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Recipes() {
  const { profile } = useProfile();

  const [baseIngredient, setBaseIngredient] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [collageLoading, setCollageLoading] = useState(false);
  const [stepImages, setStepImages] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!baseIngredient.trim()) {
      alert("Please enter a base ingredient");
      return;
    }

    try {
      setLoading(true);
      setImageLoading(true);
      setRecipe(null);
      setStepImages([]);

      const res = await generateRecipe({
        baseIngredient,
        mealType,
        profile: {
          diet: profile?.diet_type ?? "vegetarian",
          allergens: profile?.allergies ?? [],
          conditions: profile?.other_restrictions
        }
      });

      setRecipe(res);
    } catch (e: any) {
      console.error("Recipe generation error:", e);
      alert(e.message || "Failed to generate recipe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateCollage = async () => {
    if (!recipe || !recipe.steps) return;

    setCollageLoading(true);

    // Seed with empty slots so the UI renders placeholders immediately
    const images: string[] = new Array(recipe.steps.length).fill("");
    setStepImages([...images]);

    const apiBase = import.meta.env.VITE_API_BASE_URL;

    // Call Lambda once per step, update UI progressively as each arrives
    for (let i = 0; i < recipe.steps.length; i++) {
      try {
        const res = await fetch(`${apiBase}/generate-recipe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "step-image",
            recipeName: recipe.recipeName,
            step: recipe.steps[i],
            stepIndex: i,
          }),
        });

        const data = await res.json();
        if (res.ok && data.image) {
          images[i] = data.image;
          setStepImages([...images]); // progressive update
        } else {
          console.warn(`Step ${i + 1} image failed:`, data.error);
        }
      } catch (err) {
        console.warn(`Step ${i + 1} fetch error:`, err);
      }
    }

    setCollageLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleGenerate();
    }
  };

  const normalizeArray = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <h1 className="text-4xl font-bold text-gray-900">Nani's Recipe Generator</h1>
          </div>
          <p className="text-gray-600">AI-powered recipes with visual step-by-step guides</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN CONTENT */}
          <Card className="p-6 lg:col-span-2 space-y-6 shadow-lg">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Generate Your Recipe</h2>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Base Ingredient
                </label>
                <Input
                  placeholder="e.g., rice, oats, chicken, tofu"
                  value={baseIngredient}
                  onChange={(e) => setBaseIngredient(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-lg"
                  disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Meal Type
                </label>
                <Select value={mealType} onValueChange={setMealType} disabled={loading}>
                  <SelectTrigger className="text-lg">
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast"> Breakfast</SelectItem>
                    <SelectItem value="lunch"> Lunch</SelectItem>
                    <SelectItem value="dinner"> Dinner</SelectItem>
                    <SelectItem value="snack"> Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={loading || !baseIngredient.trim()}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Your Recipe...
                  </>
                ) : (
                  <>
                    <ChefHat className="mr-2 h-5 w-5" />
                    Generate Recipe
                  </>
                )}
              </Button>
            </div>

            {/* RECIPE DISPLAY */}
            {recipe && (
              <div className="space-y-6 pt-6 border-t">
                {/* AI-Generated Image */}
                <div className="relative rounded-2xl overflow-hidden shadow-xl bg-gray-100">
                  {imageLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 to-green-100 z-10">
                      <Loader2 className="h-12 w-12 animate-spin text-orange-600 mb-3" />
                      <p className="text-sm font-medium text-gray-700">Generating food image...</p>
                    </div>
                  )}
                  <img
                    src={recipe.imageUrl}
                    className="w-full h-auto object-cover"
                    alt={recipe.recipeName}
                    onLoad={() => setImageLoading(false)}
                    onError={(e) => {
                      setImageLoading(false);
                      console.error("Image failed to load, using fallback");
                      e.currentTarget.src = `https://source.unsplash.com/800x500/?${encodeURIComponent(
                        recipe.recipeName + " food"
                      )}`;
                    }}
                    style={{ display: imageLoading ? "none" : "block" }}
                  />
                </div>

                {/* Recipe Name */}
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {recipe.recipeName}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Serves 2-3
                    </span>
                  </div>
                </div>

                {/* Health Scores — dynamically computed from profile & ingredients */}
                <div className="flex flex-wrap gap-2">
                  {calculateHealthScores(profile, recipe.ingredients).map((hs) => (
                    <Badge
                      key={hs.label}
                      variant="secondary"
                      className={`text-sm px-3 py-1 ${hs.color}`}
                    >
                      {hs.emoji} {hs.label}: {hs.score}%
                    </Badge>
                  ))}
                </div>

                {/* Cooking Instructions */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-orange-600" />
                    Cooking Instructions
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {recipe.steps.map((step: string, i: number) => (
                      <Card 
                        key={i} 
                        className="p-4 hover:shadow-md transition-all duration-200 border-l-4 border-orange-400 bg-white"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                            {i + 1}
                          </div>
                          <p className="text-gray-700 flex-1 pt-2 leading-relaxed">
                            {step}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!recipe && !loading && (
              <div className="py-16 text-center text-gray-400">
                <ChefHat className="h-20 w-20 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Enter an ingredient and generate your first recipe!</p>
              </div>
            )}
          </Card>

          {/* SHOPPING LIST & VISUAL GUIDE SIDEBAR */}
          {recipe && (
            <div className="space-y-6">
              {/* Shopping List */}
              <Card className="p-6 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🛒</span>
                  <h3 className="text-xl font-semibold text-gray-900">Shopping List</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Check off items as you shop
                </p>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {recipe.ingredients.map((ing: any, i: number) => (
                    <label 
                      key={i} 
                      className="flex gap-3 items-start hover:bg-gray-50 p-3 rounded-lg cursor-pointer transition-colors group"
                    >
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      <span className="flex-1 text-sm group-hover:text-gray-900">
                        <strong className="font-semibold text-gray-900">
                          {ing.item}
                        </strong>
                        <span className="text-gray-600"> - {ing.quantity}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => {
                    const list = recipe.ingredients
                      .map((ing: any) => `${ing.item} - ${ing.quantity}`)
                      .join("\n");
                    navigator.clipboard.writeText(list);
                    alert("Shopping list copied to clipboard!");
                  }}
                >
                  📋 Copy Shopping List
                </Button>
              </Card>

              {/* Visual Guide */}
              <Card className="p-6 space-y-4 shadow-lg sticky top-6">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="h-5 w-5 text-orange-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Visual Guide</h3>
                </div>

                {stepImages.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon className="h-12 w-12 mx-auto text-orange-300 mb-3" />
                    <p className="text-sm text-gray-600 mb-4">
                      Generate step-by-step images
                    </p>
                    
                    {collageLoading && (
                      <div className="mb-4">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-600 mx-auto mb-2" />
                        <p className="text-xs text-orange-700 font-medium">
                          Generating images...
                        </p>
                      </div>
                    )}

                    <Button 
                      onClick={generateCollage}
                      disabled={collageLoading}
                      className="w-full gap-2"
                      variant="outline"
                    >
                      {collageLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4" />
                          Generate Visual Guide
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Vertical flow with down arrows */}
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {stepImages.map((img, i) => (
                        <div key={i} className="flex flex-col items-center gap-3">
                          <Card className="overflow-hidden shadow-md w-full hover:shadow-lg transition-shadow">
                            <div className="relative">
                              <img
                                src={img || `https://placehold.co/400x400/f3f4f6/9ca3af?text=Step+${i + 1}`}
                                alt={`Step ${i + 1}`}
                                className="w-full aspect-square object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = `https://placehold.co/400x400/f3f4f6/9ca3af?text=Step+${i + 1}`;
                                }}
                              />
                              <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-lg">
                                {i + 1}
                              </div>
                            </div>
                            <div className="p-3 bg-white">
                              <p className="text-xs text-gray-700 line-clamp-2">
                                {recipe.steps[i]}
                              </p>
                            </div>
                          </Card>
                          
                          {i < stepImages.length - 1 && (
                            <ArrowDown className="h-6 w-6 text-orange-500" />
                          )}
                        </div>
                      ))}
                    </div>

                    <Button 
                      onClick={generateCollage}
                      variant="outline"
                      className="w-full"
                      disabled={collageLoading}
                    >
                      {collageLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          🔄 Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Profile Info Sidebar (when no recipe) */}
          {!recipe && !loading && profile && (
            <Card className="p-6 space-y-4 h-fit sticky top-6 shadow-lg bg-gradient-to-br from-orange-50 to-green-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Your Dietary Profile
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Diet Type:</span>
                  <p className="text-gray-900 capitalize mt-1">
                    {profile.diet_type || "Not set"}
                  </p>
                </div>

                {normalizeArray(profile.allergies).length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Allergies:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {normalizeArray(profile.allergies).map((allergy: string, i: number) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {normalizeArray(profile.other_restrictions).length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Health Conditions:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {normalizeArray(profile.other_restrictions).map((condition: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-600 mt-4 pt-4 border-t">
                💡 Recipes are personalized based on your profile
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}