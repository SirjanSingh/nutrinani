import { getAccessToken, signOut } from './auth';
import { toast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Check if we're in demo mode (no API configured)
export const isDemoMode = !import.meta.env.VITE_API_BASE_URL;

// Logout handler for 401 responses
let logoutHandler: (() => void) | null = null;

export function setLogoutHandler(handler: () => void) {
  logoutHandler = handler;
}

async function handleUnauthorized() {
  await signOut();
  if (logoutHandler) {
    logoutHandler();
  }
  toast({
    title: "Session expired",
    description: "Please login again.",
    variant: "destructive",
  });
  // Force reload to show login page
  window.location.reload();
}

export async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  
  // Get auth token
  const token = await getAccessToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized();
    throw new ApiError(response.status, 'Unauthorized');
  }

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchFormData<T>(path: string, formData: FormData): Promise<T> {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  
  // Get auth token
  const token = await getAccessToken();
  
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Don't set Content-Type for FormData - browser will set it with boundary
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized();
    throw new ApiError(response.status, 'Unauthorized');
  }

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  return response.json();
}
