import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signIn, signOut, signUp, signInWithGoogle, getCurrentUser, AuthUser, isDemoAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Hub } from 'aws-amplify/utils';

interface AuthContextType {
  user: AuthUser | null;
  isAuthed: boolean;
  isAuthLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { toast } = useToast();

  const checkAuth = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for existing session on mount
    checkAuth();

    // Listen for Amplify auth events (OAuth redirects, etc.)
    if (!isDemoAuth) {
      const hubListener = Hub.listen('auth', ({ payload }) => {
        switch (payload.event) {
          case 'signedIn':
            checkAuth();
            break;
          case 'signedOut':
            setUser(null);
            break;
          case 'tokenRefresh':
            checkAuth();
            break;
          case 'tokenRefresh_failure':
            setUser(null);
            toast({
              title: "Session expired",
              description: "Please login again.",
              variant: "destructive",
            });
            break;
        }
      });

      return () => hubListener();
    }
  }, [checkAuth, toast]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const loggedInUser = await signIn(email, password);
      setUser(loggedInUser);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${loggedInUser.email}`,
      });
    } catch (error: any) {
      const message = error.message || 'Login failed';
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      await signOut();
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  }, [toast]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    try {
      await signUp(email, password, name);
      // Auto-login after signup in demo mode
      if (isDemoAuth) {
        const loggedInUser = await signIn(email, password);
        setUser(loggedInUser);
      }
      toast({
        title: "Account created!",
        description: isDemoAuth 
          ? "Welcome to NutriNani!" 
          : "Please check your email for verification code.",
      });
    } catch (error: any) {
      const message = error.message || 'Registration failed';
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithGoogle();
      // For OAuth redirect, the page will reload and Hub will handle the rest
    } catch (error: any) {
      const message = error.message || 'Google login failed';
      toast({
        title: "Google login failed",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthed: !!user,
        isAuthLoading,
        isDemoMode: isDemoAuth,
        login,
        logout,
        register,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
