import type { OnboardingFormData } from './onboarding';

export interface FamilyProfile {
  id: string;
  name: string;
  age?: number;
  avatar: string;
  isMain: boolean;
  createdAt: string;
  onboardingData: OnboardingFormData;
}

export interface ProfileContextType {
  profiles: FamilyProfile[];
  activeProfile: FamilyProfile | null;
  isProfileLoading: boolean;
  createProfile: (name: string, age?: number, avatar?: string) => Promise<FamilyProfile>;
  selectProfile: (profileId: string) => void;
  updateProfile: (profileId: string, data: Partial<FamilyProfile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
  // Legacy compatibility
  profile: Partial<OnboardingFormData> | null;
  refreshProfile: () => Promise<void>;
  saveProfile: (data: Partial<OnboardingFormData>) => Promise<void>;
}

export const DEFAULT_AVATARS = ['👤', '👨', '👩', '👧', '👦', '🧑', '👴', '👵'];