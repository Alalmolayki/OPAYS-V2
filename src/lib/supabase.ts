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
        .select('value, updated_at')
        .eq('key', name)
        .maybeSingle();

      if (error) {
        console.error('[Supabase storage] getItem error:', error.message);
      }

      const localRaw = localStorage.getItem(name);
      const localTsRaw = localStorage.getItem(`${name}__ts`);
      const localTs = localTsRaw ? Number(localTsRaw) : 0;
      const supabaseTs = data?.updated_at ? new Date(data.updated_at).getTime() : 0;

      // ── If Supabase has data and it's at least as fresh as our local write,
      //    use it. Otherwise prefer localStorage — this guards against reading
      //    back stale Supabase data when this tab's own upsert (e.g. right after
      //    applying to a team) hasn't landed yet on a quick refresh.
      if (data?.value && supabaseTs >= localTs) {
        try {
          return JSON.parse(data.value) as StorageValue<T>;
        } catch {
          // fall through to localStorage
        }
      }

      if (localRaw) {
        if (!data?.value) {
          // Supabase empty → migrate (first-time setup)
          console.info('[Supabase storage] Migrating localStorage → Supabase');
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
        }
        try {
          return JSON.parse(localRaw) as StorageValue<T>;
        } catch {
          return null;
        }
      }

      if (data?.value) {
        try {
          return JSON.parse(data.value) as StorageValue<T>;
        } catch {
          return null;
        }
      }

      return null;
    },

    setItem: async (name, value) => {
      const serialized = JSON.stringify(value);
      const ts = Date.now();
      // Keep localStorage in sync as a local cache (helps with migration detection
      // and lets getItem trust the most recent write even if Supabase lags behind)
      localStorage.setItem(name, serialized);
      localStorage.setItem(`${name}__ts`, String(ts));

      const { error } = await supabase.from('app_state').upsert(
        { key: name, value: serialized, updated_at: new Date(ts).toISOString() },
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
