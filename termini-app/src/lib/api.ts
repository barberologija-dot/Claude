// Every call the app makes to the database goes through this file.
import { supabase } from './supabase';
import type { Appointment, Barber, BarberHours, BarberService, Catalog, DayOff, Location, LocationBreak, LocationHours, Profile, Service, Shop, Slot } from './types';

function must<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

/** Turns a database or login error into a translation key. */
export function errKey(e: unknown): string {
  const err = e as { message?: string; code?: string; error_code?: string };
  const m = `${err?.message || ''} ${err?.error_code || ''}`;
  const known = ['slot_taken', 'rate_limited', 'too_many_active', 'too_late', 'email_not_verified', 'not_authenticated',
    'slug_taken', 'bad_slug', 'owns_shop', 'not_bookable', 'not_found'];
  const hit = known.find(k => m.includes(k));
  if (hit) return `errors.${hit}`;
  if (err?.code === '23P01') return 'errors.barber_busy';
  if (err?.code === '23503') return 'errors.in_use';
  if (/invalid login credentials|invalid_credentials/i.test(m)) return 'errors.bad_login';
  if (/not confirmed/i.test(m)) return 'errors.email_not_confirmed';
  if (/rate limit|too many requests|over_email_send_rate_limit/i.test(m)) return 'errors.rate_limited';
  if (/password/i.test(m)) return 'errors.weak_password';
  if (/captcha/i.test(m)) return 'errors.captcha';
  if (/failed to fetch|network/i.test(m)) return 'errors.offline';
  return 'errors.generic';
}

// ---------- public catalogue ----------
export async function getShopBySlug(slug: string): Promise<Shop | null> {
  return must(await supabase.from('shops').select('*').eq('slug', slug.toLowerCase()).maybeSingle());
}
export async function getShopsByIds(ids: string[]): Promise<Shop[]> {
  if (!ids.length) return [];
  return must(await supabase.from('shops').select('*').in('id', ids));
}
export async function getCatalog(shopId: string): Promise<Catalog> {
  const [locations, hours, services, barbers, barberServices] = await Promise.all([
    supabase.from('locations').select('*').eq('shop_id', shopId).order('sort').order('created_at'),
    supabase.from('location_hours').select('*').eq('shop_id', shopId),
    supabase.from('services').select('*').eq('shop_id', shopId).order('sort').order('created_at'),
    supabase.from('barbers').select('*').eq('shop_id', shopId).order('sort').order('created_at'),
    supabase.from('barber_services').select('*').eq('shop_id', shopId),
  ]);
  return {
    locations: must<Location[]>(locations), hours: must<LocationHours[]>(hours), services: must<Service[]>(services),
    barbers: must<Barber[]>(barbers), barberServices: must<BarberService[]>(barberServices),
  };
}

// ---------- booking ----------
export async function getSlots(locationId: string, serviceId: string, barberId: string | null, date: string, ignore?: string): Promise<Slot[]> {
  return must(await supabase.rpc('get_slots', { p_location: locationId, p_service: serviceId, p_barber: barberId, p_date: date, p_ignore: ignore ?? null }));
}
export async function getFreeDays(locationId: string, serviceId: string, barberId: string | null, from: string, days: number): Promise<string[]> {
  return must(await supabase.rpc('get_free_days', { p_location: locationId, p_service: serviceId, p_barber: barberId, p_from: from, p_days: days }));
}
export async function bookAppointment(locationId: string, serviceId: string, barberId: string | null, start: string): Promise<Appointment> {
  return must(await supabase.rpc('book_appointment', { p_location: locationId, p_service: serviceId, p_barber: barberId, p_start: start }));
}
export async function cancelMyAppointment(id: string): Promise<Appointment> {
  return must(await supabase.rpc('cancel_my_appointment', { p_id: id }));
}
export async function rescheduleMyAppointment(id: string, start: string): Promise<Appointment> {
  return must(await supabase.rpc('reschedule_my_appointment', { p_id: id, p_start: start }));
}
/** Asks the server to send any waiting emails. Safe to call any time. */
export function flushEmails() {
  fetch('/api/notify', { method: 'POST' }).catch(() => { /* emails stay queued and go out on the next call */ });
}

export type MyAppointment = Appointment & { shop?: Shop; service?: Service; barber?: Barber; location?: Location };
export async function getMyAppointments(userId: string): Promise<MyAppointment[]> {
  const list = must<Appointment[]>(await supabase.from('appointments').select('*').eq('customer_id', userId).order('starts_at', { ascending: false }).limit(100));
  const ids = (k: keyof Appointment) => [...new Set(list.map(a => a[k] as string))];
  if (!list.length) return [];
  const [shops, services, barbers, locations] = await Promise.all([
    supabase.from('shops').select('*').in('id', ids('shop_id')),
    supabase.from('services').select('*').in('id', ids('service_id')),
    supabase.from('barbers').select('*').in('id', ids('barber_id')),
    supabase.from('locations').select('*').in('id', ids('location_id')),
  ]);
  const by = <T extends { id: string }>(r: { data: T[] | null }) => new Map((r.data || []).map(x => [x.id, x]));
  const [sm, svm, bm, lm] = [by<Shop>(shops), by<Service>(services), by<Barber>(barbers), by<Location>(locations)];
  return list.map(a => ({ ...a, shop: sm.get(a.shop_id), service: svm.get(a.service_id), barber: bm.get(a.barber_id), location: lm.get(a.location_id) }));
}
export async function getAppointment(id: string): Promise<Appointment | null> {
  return must(await supabase.from('appointments').select('*').eq('id', id).maybeSingle());
}

// ---------- account ----------
export async function getProfile(userId: string): Promise<Profile | null> {
  return must(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle());
}
export async function updateProfile(userId: string, patch: Partial<Profile> & { notify_consent_at?: string | null }) {
  must(await supabase.from('profiles').update(patch).eq('id', userId).select());
}
export async function deleteMyAccount() {
  must(await supabase.rpc('delete_my_account'));
}
export async function getMyShops(userId: string): Promise<Shop[]> {
  const rows = must<{ shop_id: string }[]>(await supabase.from('shop_members').select('*').eq('user_id', userId));
  return getShopsByIds(rows.map(r => r.shop_id));
}
export async function registerShop(name: string, slug: string, phone: string, email: string): Promise<Shop> {
  return must(await supabase.rpc('register_shop', { p_name: name, p_slug: slug, p_phone: phone, p_email: email }));
}

// ---------- shop admin ----------
type Table = 'shops' | 'locations' | 'services' | 'barbers' | 'appointments' | 'days_off' | 'location_breaks';
export async function insertRow<T>(table: Table, row: Record<string, unknown>): Promise<T> {
  return must(await supabase.from(table).insert(row).select().single());
}
export async function updateRow<T>(table: Table, id: string, patch: Record<string, unknown>): Promise<T> {
  return must(await supabase.from(table).update(patch).eq('id', id).select().single());
}
export async function deleteRow(table: Table, id: string) {
  must(await supabase.from(table).delete().eq('id', id).select());
}

export async function getSchedule(shopId: string) {
  const [breaks, daysOff, barberHours] = await Promise.all([
    supabase.from('location_breaks').select('*').eq('shop_id', shopId),
    supabase.from('days_off').select('*').eq('shop_id', shopId).order('date_from'),
    supabase.from('barber_hours').select('*').eq('shop_id', shopId),
  ]);
  return { breaks: must<LocationBreak[]>(breaks), daysOff: must<DayOff[]>(daysOff), barberHours: must<BarberHours[]>(barberHours) };
}

/** Replaces the weekly opening hours of a location. */
export async function saveLocationHours(loc: Location, rows: { weekday: number; opens: string; closes: string }[]) {
  must(await supabase.from('location_hours').delete().eq('location_id', loc.id).select());
  if (rows.length) must(await supabase.from('location_hours').insert(rows.map(r => ({ ...r, location_id: loc.id, shop_id: loc.shop_id }))).select());
}
export async function addBreaks(loc: Location, weekdays: number[], starts: string, ends: string) {
  must(await supabase.from('location_breaks').insert(weekdays.map(weekday => ({ location_id: loc.id, shop_id: loc.shop_id, weekday, starts, ends }))).select());
}
export async function saveBarberServices(barber: Barber, serviceIds: string[]) {
  must(await supabase.from('barber_services').delete().eq('barber_id', barber.id).select());
  if (serviceIds.length) must(await supabase.from('barber_services').insert(serviceIds.map(service_id => ({ barber_id: barber.id, service_id, shop_id: barber.shop_id }))).select());
}
export async function addServiceToBarbers(service: Service, barberIds: string[]) {
  if (barberIds.length) must(await supabase.from('barber_services').insert(barberIds.map(barber_id => ({ barber_id, service_id: service.id, shop_id: service.shop_id }))).select());
}
export async function saveServiceBarbers(service: Service, barberIds: string[]) {
  must(await supabase.from('barber_services').delete().eq('service_id', service.id).select());
  await addServiceToBarbers(service, barberIds);
}
/** rows = null means "same hours as the location". */
export async function saveBarberHours(barber: Barber, rows: { weekday: number; works: boolean; starts: string | null; ends: string | null }[] | null) {
  must(await supabase.from('barber_hours').delete().eq('barber_id', barber.id).select());
  if (rows?.length) must(await supabase.from('barber_hours').insert(rows.map(r => ({ ...r, barber_id: barber.id, shop_id: barber.shop_id }))).select());
}

export async function getAppointments(shopId: string, locationId: string, fromIso: string, toIso: string): Promise<Appointment[]> {
  return must(await supabase.from('appointments').select('*').eq('shop_id', shopId).eq('location_id', locationId)
    .gte('starts_at', fromIso).lt('starts_at', toIso).order('starts_at'));
}

/** Shrinks a photo in the browser, then stores it in the shop's image folder. */
export async function uploadImage(shopId: string, file: File, maxSize = 900): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('image'))), 'image/jpeg', 0.82));
  const path = `${shopId}/${crypto.randomUUID()}.jpg`;
  must(await supabase.storage.from('images').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' }));
  return supabase.storage.from('images').getPublicUrl(path).data.publicUrl;
}
