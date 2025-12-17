import { 
  signUp as amplifySignUp, 
  signIn as amplifySignIn, 
  signOut as amplifySignOut,
  confirmSignUp as amplifyConfirmSignUp,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
} from 'aws-amplify/auth';
import { isAmplifyConfigured, isGoogleAuthConfigured } from './amplify';

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

  try {
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
  } catch (error: any) {
    // Check for the specific client secret error
    if (error.message?.includes('SECRET_HASH')) {
      throw new Error(
        'Authentication configuration error: Your Cognito app client has a secret, but frontend apps cannot use secrets. ' +
        'Please create a new app client WITHOUT a client secret in AWS Cognito Console. ' +
        'See FIX_CLIENT_SECRET_ERROR.md for detailed instructions.'
      );
    }
    
    // Pass through other errors with better messages
    if (error.name === 'UsernameExistsException') {
      throw new Error('An account with this email already exists');
    }
    
    if (error.name === 'InvalidPasswordException') {
      throw new Error('Password does not meet requirements');
    }
    
    if (error.name === 'InvalidParameterException') {
      throw new Error('Invalid email or password format');
    }
    
    // Default error
    throw new Error(error.message || 'Sign up failed');
  }
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

  try {
    const result = await amplifySignIn({ username: email, password });
    
    console.log("🔍 DEBUG - amplifySignIn result:", result);
    
    if (result.isSignedIn) {
      const u = await getCurrentUser();
      if (!u) throw new Error("Signed in but user not found");
      return u;
    }
    
    // IMPORTANT: show what Cognito is asking for
    const step = result.nextStep?.signInStep || "UNKNOWN_STEP";
    throw new Error(`Sign in requires next step: ${step}`);
  } catch (error: any) {
    console.log("🔍 DEBUG - Raw signIn error:", error);
    throw new Error(error?.message || "Sign in failed");
  }
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

  if (!isGoogleAuthConfigured) {
    throw new Error('Google authentication is not configured. Please check your environment variables.');
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
