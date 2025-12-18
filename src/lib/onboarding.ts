// Utility functions for onboarding data processing

import type { OnboardingFormData } from '@/types/onboarding';

/**
 * Calculate age from date of birth
 * @param dob - Date of birth in ISO format (YYYY-MM-DD) or Date object
 * @returns Age in years, or 0 if invalid date
 */
export function calculateAge(dob: string | Date): number {
  try {
    const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
    
    // Check for invalid date
    if (isNaN(birthDate.getTime())) {
      return 0;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred this year yet
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    // Return 0 for future dates or negative ages
    return age < 0 ? 0 : age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return 0;
  }
}

/**
 * Parse comma-separated string into array of trimmed strings
 * @param input - Comma-separated string
 * @returns Array of trimmed, non-empty strings
 */
export function parseCommaSeparated(input: string): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }
  
  return input
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Format onboarding form data for API submission
 * Ensures all arrays are properly formatted and data structure is correct
 * @param formData - Raw form data
 * @returns Formatted onboarding data ready for submission
 */
export function formatOnboardingData(formData: Partial<OnboardingFormData>): OnboardingFormData {
  return {
    name: formData.name || '',
    dob: formData.dob || '',
    gender: formData.gender,
    diet_type: formData.diet_type || 'vegetarian',
    favorite_foods: Array.isArray(formData.favorite_foods) ? formData.favorite_foods : [],
    disliked_foods: Array.isArray(formData.disliked_foods) ? formData.disliked_foods : [],
    allergies: Array.isArray(formData.allergies) ? formData.allergies : [],
    other_restrictions: formData.other_restrictions || '',
    onboarding_completed: formData.onboarding_completed || false,
  };
}

/**
 * Validate Step 1 (Basic Info) data
 * @param data - Partial form data
 * @returns Object with isValid flag and error messages
 */
export function validateStep1(data: Partial<OnboardingFormData>): {
  isValid: boolean;
  errors: { name?: string; dob?: string };
} {
  const errors: { name?: string; dob?: string } = {};
  
  // Validate name
  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Please enter your full name (at least 2 characters)';
  }
  
  // Validate date of birth
  if (!data.dob) {
    errors.dob = 'Please enter your date of birth';
  } else {
    const age = calculateAge(data.dob);
    if (age === 0) {
      errors.dob = 'Please enter a valid date of birth';
    } else if (age < 13) {
      errors.dob = 'You must be at least 13 years old to use NutriNani';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate Step 2 (Food Preferences) data
 * @param data - Partial form data
 * @returns Object with isValid flag and error messages
 */
export function validateStep2(data: Partial<OnboardingFormData>): {
  isValid: boolean;
  errors: { diet_type?: string };
} {
  const errors: { diet_type?: string } = {};
  
  // Validate diet type is selected
  if (!data.diet_type) {
    errors.diet_type = 'Please select your diet type';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Save onboarding data to session storage
 * @param data - Form data to save
 */
export function saveOnboardingToSession(data: Partial<OnboardingFormData>): void {
  try {
    sessionStorage.setItem('nutrinani_onboarding', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving onboarding data to session:', error);
  }
}

/**
 * Load onboarding data from session storage
 * @returns Saved form data or null if not found
 */
export function loadOnboardingFromSession(): Partial<OnboardingFormData> | null {
  try {
    const saved = sessionStorage.getItem('nutrinani_onboarding');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error loading onboarding data from session:', error);
    return null;
  }
}

/**
 * Clear onboarding data from session storage
 */
export function clearOnboardingSession(): void {
  try {
    sessionStorage.removeItem('nutrinani_onboarding');
  } catch (error) {
    console.error('Error clearing onboarding session:', error);
  }
}
