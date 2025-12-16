import { useQuery } from '@tanstack/react-query';
import { isDemoMode } from '@/lib/api';

export interface SystemStatus {
  backendUp: boolean;
  dbUp: boolean;
  isDemoMode: boolean;
}

interface HealthResponse {
  ok: boolean;
  db: 'up' | 'down';
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function checkHealth(): Promise<SystemStatus> {
  // If no API configured, we're in demo mode
  if (isDemoMode || !API_BASE_URL) {
    return {
      backendUp: true,
      dbUp: true,
      isDemoMode: true,
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 503) {
        // Backend up but DB down
        return {
          backendUp: true,
          dbUp: false,
          isDemoMode: false,
        };
      }
      throw new Error('Backend error');
    }

    const data: HealthResponse = await response.json();
    return {
      backendUp: true,
      dbUp: data.db === 'up',
      isDemoMode: false,
    };
  } catch (error) {
    // Network error - backend unreachable
    return {
      backendUp: false,
      dbUp: false,
      isDemoMode: false,
    };
  }
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: checkHealth,
    refetchInterval: 20000, // Poll every 20 seconds
    staleTime: 15000,
    retry: false,
  });
}

// Cache keys for offline mode
export const CACHE_KEYS = {
  PROFILE: 'nutrinani_profile_cache',
  PANTRY: 'nutrinani_pantry_cache',
  COMMUNITY: 'nutrinani_community_cache',
  SCANS: 'nutrinani_scans_cache',
} as const;

// Helper to save to cache
export function saveToCache(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn('Failed to save to cache:', e);
  }
}

// Helper to load from cache
export function loadFromCache<T>(key: string): { data: T; timestamp: number } | null {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Failed to load from cache:', e);
  }
  return null;
}
