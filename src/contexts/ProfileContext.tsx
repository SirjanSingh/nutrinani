import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchJSON } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { OnboardingFormData } from "@/types/onboarding";

export type UserProfile = Partial<OnboardingFormData>;

interface ProfileContextType {
  profile: UserProfile | null;
  isProfileLoading: boolean;
  refreshProfile: () => Promise<void>;
  saveProfile: (data: UserProfile) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { isAuthed, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!isAuthed) {
      setProfile(null);
      return;
    }

    setIsProfileLoading(true);
    try {
      const p = await fetchJSON<UserProfile>("/me");

      // Merge with Cognito name as a fallback, but never overwrite an existing saved name
      const merged: UserProfile = {
        ...p,
        name: (p?.name as string) || user?.name || "",
      };

      setProfile(merged);
    } catch {
      // If API not configured yet, still provide a minimal profile from Cognito
      setProfile({ name: user?.name || "" });
    } finally {
      setIsProfileLoading(false);
    }
  }, [isAuthed, user?.name]);

  const saveProfile = useCallback(
    async (data: UserProfile) => {
      if (!isAuthed) return;

      // Ensure we never accidentally mark onboarding incomplete after user has filled it once
      const payload: UserProfile = {
        ...data,
        onboarding_completed: data.onboarding_completed ?? true,
      };

      await fetchJSON("/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setProfile(payload);
    },
    [isAuthed]
  );

  useEffect(() => {
    if (!isAuthed) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }
    refreshProfile();
  }, [isAuthed, refreshProfile]);

  const value = useMemo(
    () => ({ profile, isProfileLoading, refreshProfile, saveProfile }),
    [profile, isProfileLoading, refreshProfile, saveProfile]
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
