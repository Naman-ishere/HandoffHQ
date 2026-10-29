/**
 * HandoffHQ — Safe Supabase Client Initializer (src/lib/supabaseClient.js)
 *
 * Only reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Refuses to initialize if a service_role or secret key is detected.
 */

import { createClient } from '@supabase/supabase-js';

const rawUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_URL
    : '';
const rawAnonKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : '';

const supabaseUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
const supabaseAnonKey = typeof rawAnonKey === 'string' ? rawAnonKey.trim() : '';

/**
 * Defensive check to prevent accidental exposure of a service_role or secret key
 * in browser environment variables.
 */
export function isUnsafeKey(key) {
  if (!key) return false;
  const lower = key.toLowerCase();
  if (lower.startsWith('sb_secret_') || lower.includes('service_role')) {
    return true;
  }
  // Check JWT payload role if it is a 3-part JWT
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      if (payload.role === 'service_role') {
        return true;
      }
    } catch {
      // Ignore malformed base64 in non-JWT keys
    }
  }
  return false;
}

export const hasUnsafeSupabaseKey = isUnsafeKey(supabaseAnonKey);

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) && !hasUnsafeSupabaseKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;
