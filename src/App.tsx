import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { AuthGate } from "@/components/AuthGate";
import { SystemBanner } from "@/components/SystemBanner";
import Index from "./pages/Index";
import OnboardingPage from "./pages/OnboardingPage";
import ProfileSelectionPage from "./pages/ProfileSelectionPage";
import ManageProfilesPage from "./pages/ManageProfilesPage";
import EditProfilePage from "./pages/EditProfilePage";
import NotFound from "./pages/NotFound";
import GenerateRecipe from "./components/GenerateRecipe";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProfileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/profiles"
                element={
                  <AuthGate>
                    <ProfileSelectionPage />
                  </AuthGate>
                }
              />
              <Route
                path="/manage-profiles"
                element={
                  <AuthGate>
                    <ManageProfilesPage />
                  </AuthGate>
                }
              />
              <Route
                path="/profiles/:id/edit"
                element={
                  <AuthGate>
                    <EditProfilePage />
                  </AuthGate>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <AuthGate>
                    <OnboardingPage />
                  </AuthGate>
                }
              />
              <Route
                path="/"
                element={
                  <AuthGate>
                    <Index />
                  </AuthGate>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
