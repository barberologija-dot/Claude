// Date and time helpers. Appointments are stored as exact moments; they are
// always shown in the time zone of the shop's location.
import { getLanguage } from './i18n';

const LOCALES: Record<string, string> = { sl: 'sl-SI', hr: 'hr-HR', de: 'de-DE' };
const loc = () => LOCALES[getLanguage()] || 'sl-SI';
export const DEFAULT_TZ = 'Europe/Ljubljana';

/** 'YYYY-MM-DD' of a moment in a time zone. */
export function dateKey(d: Date | string, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
}
export const todayKey = (tz = DEFAULT_TZ) => dateKey(new Date(), tz);

export function addDays(key: string, n: number): string {
  const d = new Date(key + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** 0 = Sunday ... 6 = Saturday */
export const weekdayOf = (key: string) => new Date(key + 'T12:00:00Z').getUTCDay();
/** Monday of the week that contains the day. */
export const mondayOf = (key: string) => addDays(key, -((weekdayOf(key) + 6) % 7));

export function fmtTime(d: Date | string, tz = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat(loc(), { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));
}
export function fmtDay(key: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }): string {
  return new Intl.DateTimeFormat(loc(), { timeZone: 'UTC', ...opts }).format(new Date(key + 'T12:00:00Z'));
}
export function fmtDateTime(d: Date | string, tz = DEFAULT_TZ): string {
  return `${fmtDay(dateKey(d, tz), { weekday: 'short', day: 'numeric', month: 'short' })}, ${fmtTime(d, tz)}`;
}

/** Minutes since midnight of a moment, in a time zone. */
export function minutesOfDay(d: Date | string, tz = DEFAULT_TZ): number {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d)).split(':').map(Number);
  return (h % 24) * 60 + m;
}

/** The exact moment of a local date + time ('HH:MM') in a time zone, as ISO text. */
export function zonedToIso(key: string, time: string, tz = DEFAULT_TZ): string {
  const [h, m] = time.split(':').map(Number);
  const wanted = Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10), h, m);
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const shown = Date.UTC(
      +dateKey(new Date(guess), tz).slice(0, 4), +dateKey(new Date(guess), tz).slice(5, 7) - 1, +dateKey(new Date(guess), tz).slice(8, 10),
      Math.floor(minutesOfDay(new Date(guess), tz) / 60), minutesOfDay(new Date(guess), tz) % 60);
    guess += wanted - shown;
  }
  return new Date(guess).toISOString();
}

export const hhmm = (t: string | null | undefined) => (t || '').slice(0, 5);
export const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMinutes = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

export function fmtPrice(n: number | string): string {
  return new Intl.NumberFormat(loc(), { style: 'currency', currency: 'EUR', minimumFractionDigits: Number(n) % 1 ? 2 : 0 }).format(Number(n));
}
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}
