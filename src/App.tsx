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
import NotFound from "./pages/NotFound";
import GenerateRecipe from "./components/GenerateRecipe";
function App() {
  return (
    <div>
      <GenerateRecipe />
    </div>
  );
}
export default App;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ProfileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SystemBanner />
            <Routes>
              <Route path="/onboarding" element={<AuthGate><OnboardingPage /></AuthGate>} />
              <Route path="/" element={<AuthGate><Index /></AuthGate>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
