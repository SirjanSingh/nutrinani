import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import EditProfile from "@/components/EditProfile";
import { Scanner } from "@/components/Scanner";
import Recipes from "@/components/Recipes";
import { VoiceBot } from "@/components/VoiceBot";
import { Inventory } from "@/components/Inventory";
import { Community } from "@/components/Community";
import { ProfileMenu } from "@/components/ProfileMenu";

export type Section = "dashboard" | "scanner" | "recipes" | "voice" | "inventory" | "community" | "editProfile";

const Index = () => {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");

  const handleEditProfile = () => {
    setActiveSection("editProfile");
  };

  const handleBackToDashboard = () => {
    setActiveSection("dashboard");
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border/50">
          <div className="container mx-auto max-w-7xl px-6 md:px-8 lg:px-12 py-4 flex items-center justify-end">
            <ProfileMenu onEditProfile={handleEditProfile} />
          </div>
        </div>

        <div className="container mx-auto p-6 md:p-8 lg:p-12 max-w-7xl animate-fade-in">
          {activeSection === "dashboard" && <Dashboard onNavigateToSection={setActiveSection} />}
          {activeSection === "editProfile" && <EditProfile onBack={handleBackToDashboard} />}
          {activeSection === "scanner" && <Scanner />}
          {activeSection === "recipes" && <Recipes />}
          {activeSection === "inventory" && <Inventory onNavigateToRecipes={() => setActiveSection("recipes")} />}
          {activeSection === "community" && <Community />}
          {activeSection === "voice" && <VoiceBot />}
        </div>
      </main>
    </div>
  );
};

export default Index;
