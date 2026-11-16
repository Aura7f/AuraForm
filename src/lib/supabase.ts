import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getErrorMessage } from '../utils/errors';

const hasInvalidHeaderCharacters = (value: string): boolean => /[\u0000-\u001f\u007f]/.test(value);

const isValidSupabaseUrl = (value: string): boolean => {
  if (!value || /\s/.test(value) || hasInvalidHeaderCharacters(value)) return false;

  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      !url.hostname.includes('your-project.supabase.co')
    );
  } catch {
    return false;
  }
};

const isValidSupabaseKey = (value: string): boolean =>
  !hasInvalidHeaderCharacters(value) &&
  (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) ||
    /^sb_publishable_[A-Za-z0-9_-]+$/.test(value));

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const configuredKeys = [
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
    '',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
].map(key => key.trim());
const supabaseAnonKey = configuredKeys.find(isValidSupabaseKey) || '';

export const isSupabaseConfigured = (): boolean => {
  return isValidSupabaseUrl(supabaseUrl) && Boolean(supabaseAnonKey);
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

/**
 * Helper to ping and verify connectivity to Supabase PostgreSQL
 */
export const checkSupabaseConnection = async (): Promise<{ ok: boolean; message: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, message: 'Supabase credentials are not configured in .env' };
  }
  try {
    const { error } = await supabase.from('forms').select('id').limit(1);
    if (error) {
      return { ok: false, message: `Database error: ${error.message}` };
    }
    return { ok: true, message: 'Successfully connected to Supabase PostgreSQL database!' };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Network error connecting to Supabase') };
  }
};
