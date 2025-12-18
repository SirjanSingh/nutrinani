// Onboarding data types for NutriNani post-signup flow

export type DietType = 'vegan' | 'vegetarian' | 'eggetarian' | 'non_vegetarian';

export type Gender = 'male' | 'female' | 'prefer_not_to_say';

export interface OnboardingFormData {
  // Step 1: Basic Info
  name: string;
  dob: string; // ISO date format (YYYY-MM-DD)
  gender?: Gender;
  
  // Step 2: Food Preferences
  diet_type: DietType;
  favorite_foods: string[];
  disliked_foods: string[];
  
  // Step 3: Allergies & Restrictions
  allergies: string[];
  other_restrictions?: string;
  
  // Completion status
  onboarding_completed: boolean;
}

// Predefined allergy options
export const ALLERGY_OPTIONS = [
  'Nuts (tree nuts)',
  'Peanuts',
  'Dairy / Milk',
  'Eggs',
  'Soy',
  'Gluten / Wheat',
  'Fish',
  'Shellfish',
  'Sesame',
] as const;

// Diet type options with display labels
export const DIET_TYPE_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'non_vegetarian', label: 'Non-vegetarian' },
];

// Gender options with display labels
export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// Initial empty form data
export const INITIAL_ONBOARDING_DATA: OnboardingFormData = {
  name: '',
  dob: '',
  gender: undefined,
  diet_type: 'vegetarian', // Default to vegetarian
  favorite_foods: [],
  disliked_foods: [],
  allergies: [],
  other_restrictions: '',
  onboarding_completed: false,
};
