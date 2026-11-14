// All visible texts live in src/i18n/<language>.json.
// To add Croatian or German: copy sl.json to hr.json / de.json, translate it,
// and add it to "dictionaries" below.
import sl from '../i18n/sl.json';

const dictionaries: Record<string, unknown> = { sl };
export const languages = Object.keys(dictionaries);

let current = 'sl';
try {
  const saved = localStorage.getItem('lang');
  if (saved && dictionaries[saved]) current = saved;
} catch { /* storage not available */ }

export const getLanguage = () => current;
export function setLanguage(lang: string) {
  if (!dictionaries[lang]) return;
  try { localStorage.setItem('lang', lang); } catch { /* ignore */ }
  location.reload();
}

function lookup(dict: unknown, key: string): unknown {
  return key.split('.').reduce<any>((o, k) => (o == null ? o : o[k]), dict);
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const v = lookup(dictionaries[current], key) ?? lookup(dictionaries.sl, key);
  if (typeof v !== 'string') return key;
  return v.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ''));
}

/** Lists in the translation file (e.g. weekday names). */
export function tList(key: string): string[] {
  const v = lookup(dictionaries[current], key) ?? lookup(dictionaries.sl, key);
  return Array.isArray(v) ? (v as string[]) : [];
}
