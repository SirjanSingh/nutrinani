// Profile types
export type Profile = {
  id: string;
  name?: string;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  activityLevel?: "sedentary" | "moderate" | "active";
  conditions: string[];
  allergies: string[];
  dietPreferences: string[];
  updatedAt?: string;
};

// Scan types
export type ScanResult = {
  scanId: string;
  productName: string;
  ingredients: string[];
  verdict: {
    status: "safe" | "caution" | "avoid";
    riskScore: number;
    summary: string;
    reasons: string[];
    flags: { label: string; value: string; safe: boolean }[];
  };
  createdAt: string;
};

// Pantry types
export type PantryItem = {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

// Recipe types
export type Recipe = {
  id: string;
  title: string;
  tags: string[];
  description?: string;
  steps: string[];
  ingredientsNeeded: { name: string; quantity?: string }[];
  pantryUsed?: string[];
  missingIngredients?: string[];
  shoppingList: { name: string; quantity?: string; checked?: boolean }[];
  warnings?: string[];
};

export type SubstitutionSuggestion = {
  missingIngredient: string;
  suggestions: {
    name: string;
    badge: "safe" | "caution";
    reason: string;
    impact?: string;
  }[];
};

// Community types
export type CommunityPost = {
  id: string;
  type: "recipe" | "remedy";
  title?: string;
  tags: string[];
  originalText: string;
  rewrittenText?: string;
  safetyForUser: { badge: "safe" | "caution"; reasons: string[] };
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  createdAt: string;
  author?: { name?: string };
};

export type Comment = {
  id: string;
  postId: string;
  text: string;
  createdAt: string;
  author?: { name?: string };
};
