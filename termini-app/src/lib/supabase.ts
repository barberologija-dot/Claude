import { createClient } from '@supabase/supabase-js';

const raw = import.meta.env.VITE_SUPABASE_URL as string;
// "same-origin" is used only by the local preview, where the dev server forwards requests to the test backend
const url = raw === 'same-origin' ? location.origin : raw;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const configured = Boolean(url && key);
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing');
