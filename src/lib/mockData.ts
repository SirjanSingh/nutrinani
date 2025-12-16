import { Profile, ScanResult, PantryItem, Recipe, CommunityPost, Comment, SubstitutionSuggestion } from "@/types";

export const mockProfile: Profile = {
  id: "1",
  name: "User",
  age: 28,
  weightKg: 65,
  heightCm: 165,
  activityLevel: "moderate",
  conditions: ["Diabetes"],
  allergies: ["Lactose intolerance"],
  dietPreferences: ["Vegetarian"],
  updatedAt: new Date().toISOString(),
};

export const mockScanHistory: ScanResult[] = [
  {
    scanId: "scan-1",
    productName: "ChocoFit Protein Bar",
    ingredients: ["Whey protein", "Maltodextrin", "E322 (Soy lecithin)", "Artificial sweetener (955)", "Sugar", "Milk solids"],
    verdict: {
      status: "caution",
      riskScore: 72,
      summary: "Not ideal for Diabetes · Contains added sugar and sweeteners",
      reasons: ["High sugar content", "Contains artificial sweeteners", "Contains lactose"],
      flags: [
        { label: "Contains nuts", value: "No", safe: true },
        { label: "Contains lactose", value: "Yes", safe: false },
        { label: "High sugar", value: "Yes", safe: false },
        { label: "Diabetes safe", value: "No", safe: false },
      ],
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const mockPantryItems: PantryItem[] = [
  { id: "p1", name: "Oats", quantity: 500, unit: "g", category: "Grains", expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(), createdAt: new Date().toISOString() },
  { id: "p2", name: "Chickpeas (Chana)", quantity: 1, unit: "kg", category: "Legumes", expiryDate: new Date(Date.now() + 90 * 86400000).toISOString(), createdAt: new Date().toISOString() },
  { id: "p3", name: "Ragi Flour", quantity: 250, unit: "g", category: "Flour", expiryDate: new Date(Date.now() + 5 * 86400000).toISOString(), createdAt: new Date().toISOString() },
  { id: "p4", name: "Lauki (Bottle Gourd)", quantity: 1, unit: "pc", category: "Vegetables", expiryDate: new Date(Date.now() + 3 * 86400000).toISOString(), createdAt: new Date().toISOString() },
  { id: "p5", name: "Turmeric", quantity: 100, unit: "g", category: "Spices", expiryDate: new Date(Date.now() + 180 * 86400000).toISOString(), createdAt: new Date().toISOString() },
  { id: "p6", name: "Cumin Seeds", quantity: 50, unit: "g", category: "Spices", createdAt: new Date().toISOString() },
  { id: "p7", name: "Paneer", quantity: 200, unit: "g", category: "Dairy", expiryDate: new Date(Date.now() + 2 * 86400000).toISOString(), createdAt: new Date().toISOString() },
];

export const mockRecipes: Record<string, Recipe> = {
  oats: {
    id: "r1",
    title: "Diabetes-friendly Oats Chilla",
    tags: ["Diabetes-safe", "High-fiber", "Veg", "Quick"],
    description: "A healthy, savory pancake made with oats that's perfect for diabetics. Low glycemic index and packed with fiber.",
    steps: [
      "Blend 1 cup oats into a fine powder",
      "Mix with chopped onions, tomatoes, green chilies, and coriander",
      "Add salt, turmeric, and a pinch of asafoetida",
      "Add water to make a batter of pouring consistency",
      "Heat a non-stick pan and pour batter in circular motion",
      "Cook on medium heat until golden on both sides",
    ],
    ingredientsNeeded: [
      { name: "Oats", quantity: "1 cup" },
      { name: "Onion", quantity: "1 medium" },
      { name: "Tomato", quantity: "1 small" },
      { name: "Green chili", quantity: "2" },
      { name: "Coriander leaves", quantity: "2 tbsp" },
      { name: "Turmeric", quantity: "1/4 tsp" },
      { name: "Salt", quantity: "to taste" },
    ],
    pantryUsed: ["Oats", "Turmeric"],
    missingIngredients: ["Onion", "Tomato", "Green chili", "Coriander leaves"],
    shoppingList: [
      { name: "Onion", quantity: "1 medium" },
      { name: "Tomato", quantity: "1 small" },
      { name: "Green chili", quantity: "2" },
      { name: "Coriander leaves", quantity: "1 bunch" },
    ],
    warnings: [],
  },
  chana: {
    id: "r2",
    title: "Protein-rich Chana Salad",
    tags: ["High-protein", "Diabetes-safe", "Vegan", "No-cook"],
    description: "A refreshing and protein-packed salad using boiled chickpeas with tangy lemon dressing.",
    steps: [
      "Soak chickpeas overnight and boil until soft",
      "Dice cucumber, tomatoes, and onions finely",
      "Mix chickpeas with vegetables",
      "Add lemon juice, chaat masala, and salt",
      "Garnish with fresh coriander and serve chilled",
    ],
    ingredientsNeeded: [
      { name: "Chickpeas", quantity: "1 cup" },
      { name: "Cucumber", quantity: "1 medium" },
      { name: "Tomato", quantity: "1 medium" },
      { name: "Onion", quantity: "1 small" },
      { name: "Lemon", quantity: "1" },
      { name: "Chaat masala", quantity: "1 tsp" },
    ],
    pantryUsed: ["Chickpeas (Chana)"],
    missingIngredients: ["Cucumber", "Tomato", "Onion", "Lemon", "Chaat masala"],
    shoppingList: [
      { name: "Cucumber", quantity: "1 medium" },
      { name: "Tomato", quantity: "1 medium" },
      { name: "Onion", quantity: "1 small" },
      { name: "Lemon", quantity: "2" },
      { name: "Chaat masala", quantity: "1 packet" },
    ],
    warnings: [],
  },
  lauki: {
    id: "r3",
    title: "Lauki ki Sabzi (Bottle Gourd Curry)",
    tags: ["Low-calorie", "Diabetes-safe", "Veg", "Heart-healthy"],
    description: "A light and nutritious curry made with bottle gourd, perfect for weight management and diabetics.",
    steps: [
      "Peel and dice lauki into small cubes",
      "Heat minimal oil and add cumin seeds",
      "Add chopped onion and sauté until golden",
      "Add tomatoes, turmeric, and coriander powder",
      "Add lauki cubes with salt and a little water",
      "Cover and cook until soft, garnish with coriander",
    ],
    ingredientsNeeded: [
      { name: "Lauki", quantity: "500g" },
      { name: "Cumin seeds", quantity: "1 tsp" },
      { name: "Onion", quantity: "1 medium" },
      { name: "Tomato", quantity: "2 medium" },
      { name: "Turmeric", quantity: "1/2 tsp" },
      { name: "Coriander powder", quantity: "1 tsp" },
    ],
    pantryUsed: ["Lauki (Bottle Gourd)", "Cumin Seeds", "Turmeric"],
    missingIngredients: ["Onion", "Tomato", "Coriander powder"],
    shoppingList: [
      { name: "Onion", quantity: "1 medium" },
      { name: "Tomato", quantity: "2 medium" },
      { name: "Coriander powder", quantity: "1 packet" },
    ],
    warnings: [],
  },
  ragi: {
    id: "r4",
    title: "Ragi Dosa",
    tags: ["Diabetes-safe", "Gluten-free", "High-calcium", "Veg"],
    description: "Crispy and healthy dosa made with finger millet flour, excellent for diabetics and rich in calcium.",
    steps: [
      "Mix ragi flour with rice flour in 2:1 ratio",
      "Add salt, cumin seeds, and chopped onions",
      "Make a thin batter with water",
      "Let it rest for 30 minutes",
      "Pour on hot tawa and spread thin",
      "Cook until crispy, serve with coconut chutney",
    ],
    ingredientsNeeded: [
      { name: "Ragi flour", quantity: "1 cup" },
      { name: "Rice flour", quantity: "1/2 cup" },
      { name: "Cumin seeds", quantity: "1 tsp" },
      { name: "Onion", quantity: "1 small" },
      { name: "Salt", quantity: "to taste" },
    ],
    pantryUsed: ["Ragi Flour", "Cumin Seeds"],
    missingIngredients: ["Rice flour", "Onion"],
    shoppingList: [
      { name: "Rice flour", quantity: "250g" },
      { name: "Onion", quantity: "2 medium" },
      { name: "Coconut", quantity: "1/2 cup (for chutney)" },
    ],
    warnings: [],
  },
};

export const mockCommunityPosts: CommunityPost[] = [
  {
    id: "post-1",
    type: "remedy",
    title: "Ginger-Tulsi Kadha for Cold",
    tags: ["cold", "immunity", "traditional"],
    originalText: "Boil ginger, tulsi leaves, and black pepper in water for 10 mins. Add honey and drink warm. Best for cold and sore throat.",
    rewrittenText: "**Nani-verified Ginger-Tulsi Kadha**\n\n**Ingredients:** Fresh ginger (1 inch), Tulsi leaves (8-10), Black pepper (3-4), Honey (1 tsp)\n\n**Method:** Boil ginger and tulsi in 2 cups water for 10 minutes. Strain, add black pepper and honey. Drink warm.\n\n**Best for:** Cold, sore throat, immunity boost\n\n⚠️ *Diabetics: Skip honey or use in moderation*",
    safetyForUser: { badge: "caution", reasons: ["Contains honey - monitor sugar intake for diabetics"] },
    likeCount: 24,
    commentCount: 5,
    likedByMe: false,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    author: { name: "Priya Sharma" },
  },
  {
    id: "post-2",
    type: "recipe",
    title: "Low-GI Moong Dal Chilla",
    tags: ["diabetes-friendly", "breakfast", "protein"],
    originalText: "Soak moong dal overnight. Grind with green chili and ginger. Add salt and make thin pancakes. Great for diabetics!",
    rewrittenText: "**Nani-verified Moong Dal Chilla**\n\n**Ingredients:** Moong dal (1 cup, soaked), Green chili (2), Ginger (1 inch), Salt to taste\n\n**Method:** Grind soaked dal with chilies and ginger. Make thin batter. Cook on non-stick pan until golden.\n\n**Nutrition:** High protein, Low GI, Fiber-rich\n\n✅ *Safe for diabetics and weight watchers*",
    safetyForUser: { badge: "safe", reasons: ["Low glycemic index", "High protein", "No allergens detected"] },
    likeCount: 42,
    commentCount: 8,
    likedByMe: true,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    author: { name: "Raj Patel" },
  },
  {
    id: "post-3",
    type: "remedy",
    title: "Haldi Doodh for Joint Pain",
    tags: ["joint-pain", "anti-inflammatory", "bedtime"],
    originalText: "Add 1 tsp turmeric to warm milk. Drink before bed. Helps with joint pain and better sleep.",
    safetyForUser: { badge: "caution", reasons: ["Contains dairy - not suitable for lactose intolerance"] },
    likeCount: 18,
    commentCount: 3,
    likedByMe: false,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    author: { name: "Anita Gupta" },
  },
];

export const mockComments: Record<string, Comment[]> = {
  "post-1": [
    { id: "c1", postId: "post-1", text: "This works amazing! Tried it last winter.", createdAt: new Date(Date.now() - 3600000).toISOString(), author: { name: "Vikram" } },
    { id: "c2", postId: "post-1", text: "Can we add lemon to this?", createdAt: new Date(Date.now() - 1800000).toISOString(), author: { name: "Meera" } },
  ],
  "post-2": [
    { id: "c3", postId: "post-2", text: "My go-to breakfast now!", createdAt: new Date(Date.now() - 7200000).toISOString(), author: { name: "Sanjay" } },
  ],
};

export const mockSubstitutions: SubstitutionSuggestion[] = [
  {
    missingIngredient: "Onion",
    suggestions: [
      { name: "Shallots", badge: "safe", reason: "Similar flavor, lower FODMAP", impact: "Milder taste" },
      { name: "Leeks (white part)", badge: "safe", reason: "Gentle on digestion", impact: "Subtle onion flavor" },
      { name: "Asafoetida (hing)", badge: "safe", reason: "Onion-free alternative", impact: "Different but complementary flavor" },
    ],
  },
  {
    missingIngredient: "Milk",
    suggestions: [
      { name: "Almond milk", badge: "safe", reason: "Dairy-free, low calorie", impact: "Slightly nutty taste" },
      { name: "Oat milk", badge: "safe", reason: "Creamy, dairy-free", impact: "Mild oat flavor" },
      { name: "Coconut milk", badge: "caution", reason: "High in saturated fat", impact: "Rich, coconut flavor" },
    ],
  },
];
