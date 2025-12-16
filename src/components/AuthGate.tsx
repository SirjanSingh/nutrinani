import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/pages/AuthPage';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/nutrinani-logo.png';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { isAuthed, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <img src={logo} alt="NutriNani" className="w-20 h-20 rounded-full mb-4 animate-pulse" />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading NutriNani...</p>
      </div>
    );
  }

  if (!isAuthed) {
    return <AuthPage />;
  }

  return <>{children}</>;
}
