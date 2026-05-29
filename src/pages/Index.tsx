import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import EditProfile from "@/components/EditProfile";
import { Scanner } from "@/components/Scanner";
import Recipes from "@/components/Recipes";
import { VoiceBot } from "@/components/VoiceBot";
import { Inventory } from "@/components/Inventory";
import { Community } from "@/components/Community";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ChatBot } from "@/components/ChatBot";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";

export type Section =
  | "dashboard"
  | "scanner"
  | "recipes"
  | "voice"
  | "inventory"
  | "community"
  | "chat"
  | "editProfile";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthed, isAuthLoading } = useAuth();
  const { activeProfile, isProfileLoading } = useProfile();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [recipeQuery, setRecipeQuery] = useState<string>("");

  useEffect(() => {
    if (!isAuthLoading && isAuthed && !isProfileLoading && !activeProfile) {
      navigate("/profiles");
    }
  }, [isAuthed, isAuthLoading, activeProfile, isProfileLoading, navigate]);

  // Unauthed visitors can only see the public dashboard. If they try to
  // navigate elsewhere via the sidebar, redirect them to login.
  useEffect(() => {
    if (!isAuthLoading && !isAuthed && activeSection !== "dashboard") {
      navigate("/login");
    }
  }, [isAuthed, isAuthLoading, activeSection, navigate]);

  const handleBackToDashboard = () => {
    setActiveSection("dashboard");
  };

  const handleSectionChange = (section: Section, payload?: any) => {
    if (!isAuthed && section !== "dashboard") {
      navigate("/login");
      return;
    }
    if (section === "recipes") {
      setRecipeQuery(typeof payload === "string" ? payload : "");
    }
    setActiveSection(section);
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
      />

      <main className="flex-1 overflow-auto relative">
        {/* Floating Profile / Sign-in */}
        <div className="absolute top-6 right-6 md:right-8 lg:right-12 z-50">
          <ProfileHeader />
        </div>

        <div className="container mx-auto px-6 md:px-8 lg:px-12 pt-8 md:pt-10 pb-10 md:pb-14 max-w-7xl animate-fade-in">
          {activeSection === "dashboard" && <Dashboard onNavigateToSection={handleSectionChange} />}
          {activeSection === "editProfile" && <EditProfile onBack={handleBackToDashboard} />}
          {activeSection === "scanner" && <Scanner />}
          {activeSection === "recipes" && <Recipes initialQuery={recipeQuery} />}
          {activeSection === "inventory" && (
            <Inventory
              onNavigateToRecipes={() => setActiveSection("recipes")}
            />
          )}
          {activeSection === "community" && <Community />}
          {activeSection === "chat" && <ChatBot />}
          {activeSection === "voice" && <VoiceBot />}
        </div>
      </main>
    </div>
  );
};

export default Index;
