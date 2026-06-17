import { createClient } from '@supabase/supabase-js';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// If env vars are not set, Supabase is disabled — store falls back to localStorage.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Creates a Zustand persist storage adapter backed by Supabase.
 *
 * The entire app state is stored as a single JSON string in:
 *   table: app_state  (columns: key TEXT PK, value TEXT, updated_at TIMESTAMPTZ)
 *
 * Falls back to localStorage when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are absent.
 *
 * Migration: if Supabase is empty on first load but localStorage has data,
 * the local data is automatically pushed to Supabase (one-time migration).
 */
export function createSupabaseStorage<T>(): PersistStorage<T> {
  // ── LocalStorage fallback (dev / missing env vars) ──────────────────────────
  if (!supabase) {
    return {
      getItem: (name) => {
        const raw = localStorage.getItem(name);
        return raw ? (JSON.parse(raw) as StorageValue<T>) : null;
      },
      setItem: (name, value) => {
        localStorage.setItem(name, JSON.stringify(value));
      },
      removeItem: (name) => {
        localStorage.removeItem(name);
      },
    };
  }

  // ── Supabase storage ─────────────────────────────────────────────────────────
  return {
    getItem: async (name) => {
      const { data, error } = await supabase
        .from('app_state')
        .select('value')
        .eq('key', name)
        .maybeSingle();

      if (error) {
        console.error('[Supabase storage] getItem error:', error.message);
      }

      // ── If Supabase has data, use it ────────────────────────────────────────
      if (data?.value) {
        try {
          return JSON.parse(data.value) as StorageValue<T>;
        } catch {
          return null;
        }
      }

      // ── Supabase empty → try localStorage migration ─────────────────────────
      // This handles the transition when Supabase is first configured: existing
      // state in localStorage is pushed to Supabase so other devices can see it.
      const localRaw = localStorage.getItem(name);
      if (localRaw) {
        console.info('[Supabase storage] Migrating localStorage → Supabase');
        // Push local data to Supabase in the background
        supabase
          .from('app_state')
          .upsert(
            { key: name, value: localRaw, updated_at: new Date().toISOString() },
            { onConflict: 'key' },
          )
          .then(({ error: e }) => {
            if (e) console.error('[Supabase storage] migration error:', e.message);
            else console.info('[Supabase storage] Migration complete');
          });

        try {
          return JSON.parse(localRaw) as StorageValue<T>;
        } catch {
          return null;
        }
      }

      return null;
    },

    setItem: async (name, value) => {
      const serialized = JSON.stringify(value);
      // Keep localStorage in sync as a local cache (helps with migration detection)
      localStorage.setItem(name, serialized);

      const { error } = await supabase.from('app_state').upsert(
        { key: name, value: serialized, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
      if (error) console.error('[Supabase storage] setItem error:', error.message);
    },

    removeItem: async (name) => {
      localStorage.removeItem(name);
      const { error } = await supabase
        .from('app_state')
        .delete()
        .eq('key', name);
      if (error) console.error('[Supabase storage] removeItem error:', error.message);
    },
  };
}
