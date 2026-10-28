import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.");
  }

  if (!client) {
    client = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      },
    );
  }

  return client;
}

let anonymousUserPromise: Promise<string> | null = null;

export function getOrCreateAnonymousUser(): Promise<string> {
  if (!anonymousUserPromise) {
    anonymousUserPromise = (async () => {
      const supabase = getSupabaseClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      if (sessionData.session?.user.id) {
        return sessionData.session.user.id;
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        throw error;
      }
      if (!data.user) {
        throw new Error("Supabase tidak mengembalikan identitas pemain anonim.");
      }
      return data.user.id;
    })().catch((error: unknown) => {
      anonymousUserPromise = null;
      throw error;
    });
  }

  return anonymousUserPromise;
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
