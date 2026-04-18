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
import type { FamilyProfile, ProfileContextType } from "@/types/profile";

export type UserProfile = Partial<OnboardingFormData>;

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { isAuthed, user } = useAuth();
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<FamilyProfile | null>(
    null
  );
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Legacy support - get current profile data
  const profile = activeProfile?.onboardingData || null;

  const refreshProfiles = useCallback(async () => {
    if (!isAuthed) {
      setProfiles([]);
      setActiveProfile(null);
      return;
    }

    setIsProfileLoading(true);
    try {
      // Fetch profiles from your API
      const profilesData = await fetchJSON<FamilyProfile[]>("/profiles");
      console.log("Fetched profiles:", profilesData);

      if (profilesData && profilesData.length > 0) {
        setProfiles(profilesData);

        // Set active profile from localStorage or first profile
        const savedProfileId = localStorage.getItem("activeProfileId");
        const activeProf =
          profilesData.find((p) => p.id === savedProfileId) || profilesData[0];
        setActiveProfile(activeProf);
      } else {
        // No profiles exist
        setProfiles([]);
        setActiveProfile(null);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
      setProfiles([]);
      setActiveProfile(null);
    } finally {
      setIsProfileLoading(false);
    }
  }, [isAuthed]);

  const createProfile = useCallback(
    async (
      name: string,
      age?: number,
      avatar: string = "👤"
    ): Promise<FamilyProfile> => {
      if (!isAuthed) throw new Error("Not authenticated");

      const profileData = {
        name,
        age,
        avatar,
        onboardingData: {
          name,
          onboarding_completed: false,
        } as OnboardingFormData,
      };

      try {
        // Call your real API
        const createdProfile = await fetchJSON<FamilyProfile>("/profiles", {
          method: "POST",
          body: JSON.stringify(profileData),
        });

        console.log("Profile created:", createdProfile);

        // Update local state
        setProfiles((prev) => [...prev, createdProfile]);
        return createdProfile;
      } catch (error) {
        console.error("Error creating profile:", error);
        throw error;
      }
    },
    [isAuthed]
  );

  const selectProfile = useCallback(
    (profileId: string) => {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile) {
        setActiveProfile(profile);
        localStorage.setItem("activeProfileId", profileId);
      }
    },
    [profiles]
  );

  const updateProfile = useCallback(
    async (profileId: string, data: Partial<FamilyProfile>) => {
      if (!isAuthed) return;

      try {
        const updatedProfile = await fetchJSON<FamilyProfile>(
          `/profiles/${profileId}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
          }
        );

        console.log("Profile updated:", updatedProfile);

        // Update local state
        setProfiles((prev) =>
          prev.map((p) => (p.id === profileId ? updatedProfile : p))
        );

        if (activeProfile?.id === profileId) {
          setActiveProfile(updatedProfile);
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
      }
    },
    [isAuthed, activeProfile?.id]
  );

  const deleteProfile = useCallback(
    async (profileId: string) => {
      if (!isAuthed) return;

      const profileToDelete = profiles.find((p) => p.id === profileId);
      if (profileToDelete?.isMain) {
        throw new Error("Cannot delete main profile");
      }

      try {
        await fetchJSON(`/profiles/${profileId}`, {
          method: "DELETE",
        });

        console.log("Profile deleted:", profileId);

        // Update local state
        setProfiles((prev) => prev.filter((p) => p.id !== profileId));

        if (activeProfile?.id === profileId) {
          const remainingProfiles = profiles.filter((p) => p.id !== profileId);
          setActiveProfile(remainingProfiles[0] || null);
        }
      } catch (error) {
        console.error("Error deleting profile:", error);
        throw error;
      }
    },
    [isAuthed, profiles, activeProfile?.id]
  );

  // Legacy saveProfile function for backward compatibility
  const saveProfile = useCallback(
    async (data: UserProfile) => {
      if (!activeProfile) return;

      const updatedProfile: Partial<FamilyProfile> = {
        onboardingData: {
          ...activeProfile.onboardingData,
          ...data,
          onboarding_completed: data.onboarding_completed ?? true,
        },
      };

      await updateProfile(activeProfile.id, updatedProfile);
    },
    [activeProfile, updateProfile]
  );

  useEffect(() => {
    if (!isAuthed) {
      setProfiles([]);
      setActiveProfile(null);
      setIsProfileLoading(false);
      return;
    }
    refreshProfiles();
  }, [isAuthed, refreshProfiles]);

  const value = useMemo(
    () => ({
      // New profile system
      profiles,
      activeProfile,
      isProfileLoading,
      createProfile,
      selectProfile,
      updateProfile,
      deleteProfile,
      refreshProfiles,
      // Legacy compatibility
      profile,
      refreshProfile: refreshProfiles,
      saveProfile,
    }),
    [
      profiles,
      activeProfile,
      isProfileLoading,
      createProfile,
      selectProfile,
      updateProfile,
      deleteProfile,
      refreshProfiles,
      profile,
      saveProfile,
    ]
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
