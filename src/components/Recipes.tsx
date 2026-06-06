import { useState, useEffect } from "react";
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
import { Loader2, ChefHat, Clock, Users, ImageIcon } from "lucide-react";

export default function Recipes({ initialQuery }: { initialQuery?: string }) {
  const { profile } = useProfile();

  const [baseIngredient, setBaseIngredient] = useState(initialQuery || "");

  useEffect(() => {
    if (initialQuery) {
      setBaseIngredient(initialQuery);
    }
  }, [initialQuery]);
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

      // Fetch main image separately so it doesn't block recipe text
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      fetch(`${apiBase}/generate-recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "main-image",
          recipeName: res.recipeName,
          imagePrompt: res.imagePrompt,
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.image) {
            setRecipe((prev: any) => ({ ...prev, imageUrl: data.image }));
          }
        })
        .catch(() => {/* image fails silently, fallback handles it */})
        .finally(() => setImageLoading(false));

    } catch (e: any) {
      console.error("Recipe generation error:", e);
      setImageLoading(false);
      alert(e.message || "Failed to generate recipe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateCollage = async () => {
    if (!recipe?.steps) return;

    setCollageLoading(true);
    const apiBase = import.meta.env.VITE_API_BASE_URL;

    // Pre-fill with empty strings so cards render immediately as placeholders
    const images: string[] = new Array(recipe.steps.length).fill("");
    setStepImages([...images]);

    const fetchStep = async (i: number) => {
      for (let attempt = 1; attempt <= 3; attempt++) {
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

          // Transient throttle/cold-start — retry
          if ([502, 503, 504].includes(res.status) && attempt < 3) {
            await new Promise(r => setTimeout(r, 1200 * attempt));
            continue;
          }

          const data = await res.json().catch(() => ({}));
          if (res.ok && data.image) {
            setStepImages(prev => {
              const next = [...prev];
              next[i] = data.image;
              return next;
            });
          }
          return;
        } catch {
          if (attempt < 3) await new Promise(r => setTimeout(r, 1200 * attempt));
        }
      }
    };

    // Account concurrency is tiny — go sequential (batch of 1) to avoid 503s
    const BATCH_SIZE = 1;
    for (let b = 0; b < recipe.steps.length; b += BATCH_SIZE) {
      const batch = Array.from(
        { length: Math.min(BATCH_SIZE, recipe.steps.length - b) },
        (_, j) => fetchStep(b + j)
      );
      await Promise.allSettled(batch);
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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <h1 className="text-4xl font-bold text-gray-900">Nani's Recipe Generator</h1>
          </div>
          <p className="text-gray-600">AI-powered recipes with visual step-by-step guides</p>
        </div>

        {/* ── INPUT FORM ── */}
        <Card className="p-6 shadow-lg">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-gray-600">Base Ingredient</label>
              <Input
                placeholder="e.g., rice, oats, chicken, tofu"
                value={baseIngredient}
                onChange={(e) => setBaseIngredient(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-10 text-sm"
                disabled={loading}
              />
            </div>
            <div className="w-full md:w-44 space-y-1.5">
              <label className="text-sm font-medium text-gray-600">Meal Type</label>
              <Select value={mealType} onValueChange={setMealType} disabled={loading}>
                <SelectTrigger className="h-10 text-sm w-full">
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading || !baseIngredient.trim()}
              className="h-10 px-8 text-sm font-semibold flex-shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <ChefHat className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* ── NO RECIPE YET ── */}
        {!recipe && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 py-20 text-center text-gray-400 shadow-lg">
              <ChefHat className="h-20 w-20 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Enter an ingredient and generate your first recipe!</p>
            </Card>

            {profile && (
              <Card className="p-6 space-y-4 h-fit shadow-lg bg-gradient-to-br from-orange-50 to-green-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Dietary Profile</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Diet Type:</span>
                    <p className="text-gray-900 capitalize mt-1">{profile.diet_type || "Not set"}</p>
                  </div>
                  {normalizeArray(profile.allergies).length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Allergies:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {normalizeArray(profile.allergies).map((a: string, i: number) => (
                          <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {normalizeArray(profile.other_restrictions).length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Health Conditions:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {normalizeArray(profile.other_restrictions).map((c: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
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
        )}

        {/* ── RECIPE RESULTS — persistent 2-col split ── */}
        {recipe && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* ── LEFT COLUMN (2/3): photo → recipe details → steps ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Dish photo */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl bg-gray-100 min-h-56">
                {imageLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 to-green-100 z-10">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-600 mb-3" />
                    <p className="text-sm font-medium text-gray-700">Generating food image…</p>
                  </div>
                )}
                <img
                  src={recipe.imageUrl}
                  className="w-full h-auto object-cover"
                  alt={recipe.recipeName}
                  onLoad={() => setImageLoading(false)}
                  onError={(e) => {
                    setImageLoading(false);
                    e.currentTarget.src = `https://source.unsplash.com/800x500/?${encodeURIComponent(recipe.recipeName + " food")}`;
                  }}
                  style={{ display: imageLoading ? "none" : "block" }}
                />
              </div>

              {/* Recipe name + meta + health scores + steps */}
              <Card className="p-6 shadow-lg space-y-5">
                {/* Name & meta */}
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">{recipe.recipeName}</h3>
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

                {/* Health scores */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(recipe.healthScores || {}).map(([key, value]) => {
                    const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                    let emoji = "🌿";
                    if (key.toLowerCase().includes("sugar")) emoji = "🍬";
                    if (key.toLowerCase().includes("diabetic")) emoji = "💉";
                    if (key.toLowerCase().includes("vegan") || key.toLowerCase().includes("vegetarian")) emoji = "🌱";
                    if (key.toLowerCase().includes("heart")) emoji = "❤️";
                    if (key.toLowerCase().includes("sodium")) emoji = "🧂";
                    if (key.toLowerCase().includes("gluten") || key.toLowerCase().includes("celiac")) emoji = "🌾";
                    if (key.toLowerCase().includes("dairy") || key.toLowerCase().includes("lactose")) emoji = "🥛";
                    return (
                      <Badge key={key} variant="secondary" className="text-sm px-3 py-1 bg-green-100 text-green-800 border-green-200">
                        {emoji} {formattedKey}: {String(value)}%
                      </Badge>
                    );
                  })}
                </div>

                {/* Cooking instructions — single column, vertical */}
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-orange-600" />
                    Cooking Instructions
                  </h3>
                  {recipe.steps.map((step: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 rounded-xl border-l-4 border-orange-400 bg-orange-50/40 hover:bg-orange-50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-base shadow-md">
                        {i + 1}
                      </div>
                      <p className="text-gray-700 flex-1 pt-1 leading-relaxed text-sm">{step}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ── RIGHT COLUMN (1/3): shopping list → visual guide — sticky, scrolls internally ── */}
            <div className="space-y-6 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1 nani-scroll">

              {/* Shopping list */}
              <Card className="p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🛒</span>
                  <h3 className="text-lg font-semibold text-gray-900">Shopping List</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">Check off items as you shop</p>

                <div className="space-y-0.5">
                  {recipe.ingredients.map((ing: any, i: number) => (
                    <label
                      key={i}
                      className="flex gap-2.5 items-start hover:bg-gray-50 px-2 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 mt-0.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm leading-snug">
                        <strong className="font-medium text-gray-900">{ing.item}</strong>
                        <span className="text-gray-500"> — {ing.quantity}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => {
                    const list = recipe.ingredients.map((ing: any) => `${ing.item} - ${ing.quantity}`).join("\n");
                    navigator.clipboard.writeText(list);
                    alert("Shopping list copied to clipboard!");
                  }}
                >
                  📋 Copy Shopping List
                </Button>
              </Card>

              {/* Visual guide */}
              <Card className="p-5 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Visual Guide</h3>
                  </div>
                  {stepImages.length > 0 && (
                    <Button onClick={generateCollage} variant="ghost" size="sm" disabled={collageLoading} className="text-xs text-gray-500 h-7 px-2">
                      {collageLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "🔄 Redo"}
                    </Button>
                  )}
                </div>

                {stepImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <ImageIcon className="h-10 w-10 text-orange-200" />
                    <p className="text-gray-500 text-xs text-center">Visual image for each cooking step</p>
                    <Button onClick={generateCollage} disabled={collageLoading} size="sm" className="gap-2 w-full">
                      {collageLoading ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
                      ) : (
                        <><ImageIcon className="h-3.5 w-3.5" />Generate Visual Guide</>
                      )}
                    </Button>
                  </div>
                ) : (
                  /* All steps shown — no max-height, page scrolls naturally */
                  <div className="space-y-4">
                    {stepImages.map((img, i) => (
                      <div key={i} className="rounded-xl overflow-hidden shadow-md border border-gray-100">
                        <div className="relative">
                          {img ? (
                            <img
                              src={img}
                              alt={`Step ${i + 1}`}
                              className="w-full aspect-video object-cover"
                              onError={(e) => {
                                e.currentTarget.src = `https://placehold.co/400x225/f3f4f6/9ca3af?text=Step+${i + 1}`;
                              }}
                            />
                          ) : (
                            <div className="w-full aspect-video bg-gradient-to-br from-orange-100 to-amber-50 flex flex-col items-center justify-center gap-2">
                              <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                              <span className="text-xs text-orange-600 font-medium">Generating step {i + 1}…</span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-lg">
                            {i + 1}
                          </div>
                        </div>
                        <div className="px-3 py-2.5 bg-white">
                          <p className="text-xs text-gray-600 leading-relaxed">{recipe.steps[i]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}