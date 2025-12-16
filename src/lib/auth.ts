import { 
  signUp as amplifySignUp, 
  signIn as amplifySignIn, 
  signOut as amplifySignOut,
  confirmSignUp as amplifyConfirmSignUp,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
} from 'aws-amplify/auth';
import { isAmplifyConfigured } from './amplify';

// Demo mode when Amplify is not configured
export const isDemoAuth = !isAmplifyConfigured;

// Demo user for testing without Cognito
const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@nutrinani.com',
  name: 'Demo User',
};
const DEMO_TOKEN = 'demo-jwt-token';
const DEMO_SESSION_KEY = 'nutrinani_demo_session';

export interface AuthUser {
  id?: string;
  email: string;
  name?: string;
}

// Sign up with email/password
export async function signUp(email: string, password: string, name?: string): Promise<void> {
  if (isDemoAuth) {
    await new Promise(resolve => setTimeout(resolve, 500));
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ ...DEMO_USER, email, name }));
    return;
  }

  await amplifySignUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        name: name || '',
      },
    },
  });
}

// Confirm signup with verification code
export async function confirmSignUp(email: string, code: string): Promise<void> {
  if (isDemoAuth) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return;
  }

  await amplifyConfirmSignUp({
    username: email,
    confirmationCode: code,
  });
}

// Sign in with email/password
export async function signIn(email: string, password: string): Promise<AuthUser> {
  if (isDemoAuth) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = { ...DEMO_USER, email };
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
    return user;
  }

  const result = await amplifySignIn({
    username: email,
    password,
  });

  if (result.isSignedIn) {
    return getCurrentUser() as Promise<AuthUser>;
  }

  throw new Error('Sign in failed');
}

// Sign in with Google (OAuth redirect)
export async function signInWithGoogle(): Promise<void> {
  if (isDemoAuth) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = { ...DEMO_USER, email: 'google-user@gmail.com', name: 'Google User' };
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
    window.location.reload();
    return;
  }

  await signInWithRedirect({ provider: 'Google' });
}

// Sign out
export async function signOut(): Promise<void> {
  if (isDemoAuth) {
    localStorage.removeItem(DEMO_SESSION_KEY);
    return;
  }

  await amplifySignOut();
}

// Get access token for API calls
export async function getAccessToken(): Promise<string | null> {
  if (isDemoAuth) {
    const session = localStorage.getItem(DEMO_SESSION_KEY);
    return session ? DEMO_TOKEN : null;
  }

  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() || null;
  } catch {
    return null;
  }
}

// Get current authenticated user
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isDemoAuth) {
    const stored = localStorage.getItem(DEMO_SESSION_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  try {
    const user = await amplifyGetCurrentUser();
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken;
    
    return {
      id: user.userId,
      email: idToken?.payload?.email as string || user.signInDetails?.loginId || '',
      name: idToken?.payload?.name as string || undefined,
    };
  } catch {
    return null;
  }
}
