// LOCAL TESTING ONLY: checks the database rules through the same client library the app uses.
//   ./dev/reset-db.sh && node dev/server.mjs &   then   node dev/test-db.mjs
import { createClient } from '@supabase/supabase-js';
import { ANON_KEY, SERVICE_KEY } from './server.mjs';

const URL = 'http://localhost:54321';
const mk = (key = ANON_KEY) => createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  ok ' : 'FAIL '} ${name}${cond ? '' : '  ' + extra}`); };
const errOf = r => r.error?.message || '';

async function user(email, name, confirm = true) {
  const c = mk();
  const r = await c.auth.signUp({ email, password: 'geslo123', options: { data: { full_name: name, phone: '040 111 222' } } });
  if (r.error) throw r.error;
  if (confirm) {
    const mails = await (await fetch(URL + '/dev/mails')).json();
    await fetch(mails.filter(m => m.to === email).pop().link, { redirect: 'manual' });
    const l = await c.auth.signInWithPassword({ email, password: 'geslo123' });
    if (l.error) throw l.error;
  }
  return c;
}

// next weekday (Mon-Fri) at least 2 days ahead, as YYYY-MM-DD
function workday(offset = 2) {
  const d = new Date(Date.now() + offset * 864e5);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function shop(c, slug, barbers) {
  const s = (await c.rpc('register_shop', { p_name: 'Brivnica ' + slug, p_slug: slug })).data;
  const loc = (await c.from('locations').insert({ shop_id: s.id, name: 'Center', address: 'Slovenska 1', city: 'Ljubljana' }).select().single()).data;
  await c.from('location_hours').insert([1, 2, 3, 4, 5].map(weekday => ({ location_id: loc.id, shop_id: s.id, weekday, opens: '08:00', closes: '16:00' })));
  await c.from('location_breaks').insert([1, 2, 3, 4, 5].map(weekday => ({ location_id: loc.id, shop_id: s.id, weekday, starts: '12:00', ends: '12:30' })));
  const svc = (await c.from('services').insert({ shop_id: s.id, name: 'Striženje', duration_min: 30, price: 15 }).select().single()).data;
  const bs = [];
  for (const name of barbers) {
    const b = (await c.from('barbers').insert({ shop_id: s.id, location_id: loc.id, name }).select().single()).data;
    await c.from('barber_services').insert({ barber_id: b.id, service_id: svc.id, shop_id: s.id });
    bs.push(b);
  }
  return { s, loc, svc, bs };
}

const t0 = Date.now();
const A = await user('admin-a@test.si', 'Admin A');
const B = await user('admin-b@test.si', 'Admin B');
const c1 = await user('c1@test.si', 'Stranka Ena');
const c2 = await user('c2@test.si', 'Stranka Dve');
const c3 = await user('c3@test.si', 'Stranka Tri');
const anon = mk();
const service = mk(SERVICE_KEY);

console.log('\n# sign-up and verification');
const unverified = mk();
await unverified.auth.signUp({ email: 'nov@test.si', password: 'geslo123' });
ok(errOf(await unverified.auth.signInWithPassword({ email: 'nov@test.si', password: 'geslo123' })).includes('not confirmed'), 'unverified email cannot log in');
ok(errOf(await anon.rpc('book_appointment', { p_location: crypto.randomUUID(), p_service: crypto.randomUUID(), p_barber: null, p_start: new Date().toISOString() })) !== '', 'anonymous visitor cannot book');

console.log('\n# shop setup');
const a = await shop(A, 'shop-a', ['Miha']);
const b = await shop(B, 'shop-b', ['Jure', 'Tine']);
ok(a.s?.slug === 'shop-a' && b.bs.length === 2, 'two shops registered with locations, services, barbers');
ok(errOf(await A.rpc('register_shop', { p_name: 'X', p_slug: 'admin' })).includes('slug_taken') || errOf(await A.rpc('register_shop', { p_name: 'Xx', p_slug: 'admin' })).includes('slug_taken'), 'reserved link names are refused');
ok(errOf(await c1.rpc('register_shop', { p_name: 'Druga', p_slug: 'shop-a' })).includes('slug_taken'), 'duplicate link name is refused');

console.log('\n# public catalogue');
ok((await anon.from('shops').select('*').eq('slug', 'shop-a')).data?.length === 1, 'visitor sees the shop');
ok((await anon.from('services').select('*').eq('shop_id', a.s.id)).data?.length === 1, 'visitor sees services');
ok(((await anon.from('appointments').select('*')).data || []).length === 0, 'visitor sees no appointments');
ok(((await anon.from('profiles').select('*')).data || []).length === 0, 'visitor sees no profiles');
ok(((await anon.from('location_breaks').select('*')).data || []).length === 0, 'visitor sees no internal schedule');

console.log('\n# free slots');
const day = workday();
const slotsA = (await anon.rpc('get_slots', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_date: day })).data;
// 08:00-16:00, 30 min service, 15 min grid = 31 starts; break 12:00-12:30 removes 11:45, 12:00, 12:15
ok(slotsA?.length === 28, 'slots respect opening hours and the break', `got ${slotsA?.length}`);
const sat = (() => { const d = new Date(day); while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })();
ok((await anon.rpc('get_slots', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_date: sat })).data?.length === 0, 'no slots on a closed day');
ok((await anon.rpc('get_free_days', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_from: day, p_days: 7 })).data?.includes(day), 'free days list includes the working day');

console.log('\n# double booking');
const slot = slotsA[4].slot;
const race = await Promise.all([c1, c2, c3].map(c => c.rpc('book_appointment', { p_location: a.loc.id, p_service: a.svc.id, p_barber: a.bs[0].id, p_start: slot })));
ok(race.filter(r => !r.error).length === 1, 'three customers, same slot, one barber: exactly one gets it', race.map(errOf).join(' | '));
ok(race.filter(r => errOf(r).includes('slot_taken')).length === 2, 'the other two are told the slot was just taken');
const slotB = (await anon.rpc('get_slots', { p_location: b.loc.id, p_service: b.svc.id, p_barber: null, p_date: day })).data[6].slot;
const any = await Promise.all([c1, c2, c3].map(c => c.rpc('book_appointment', { p_location: b.loc.id, p_service: b.svc.id, p_barber: null, p_start: slotB })));
ok(any.filter(r => !r.error).length === 2 && new Set(any.filter(r => !r.error).map(r => r.data.barber_id)).size === 2, '"any barber" with two barbers: two get different barbers, the third is refused', any.map(errOf).join(' | '));
const mine = race.find(r => !r.error).data;
const winner = [c1, c2, c3][race.findIndex(r => !r.error)];
const dup = await A.from('appointments').insert({ shop_id: a.s.id, location_id: a.loc.id, barber_id: a.bs[0].id, service_id: a.svc.id, customer_name: 'Ročno', starts_at: slot }).select();
ok(dup.error?.code === '23P01', 'shop admin cannot double-book the barber by hand either', errOf(dup));
const after = (await anon.rpc('get_slots', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_date: day })).data;
ok(after.length === 25 && !after.some(s => s.slot === slot), 'booked time disappears from free slots', `got ${after.length}`);

console.log('\n# shop separation');
const seenA = (await A.from('appointments').select('*')).data;
const seenB = (await B.from('appointments').select('*')).data;
ok(seenA.length === 1 && seenA.every(x => x.shop_id === a.s.id), 'admin A sees only shop A appointments');
ok(seenB.length === 2 && seenB.every(x => x.shop_id === b.s.id), 'admin B sees only shop B appointments');
ok(((await B.from('appointments').update({ status: 'cancelled' }).eq('id', mine.id).select()).data || []).length === 0, 'admin B cannot change shop A appointments');
ok(!!(await B.from('services').insert({ shop_id: a.s.id, name: 'Vsiljena', duration_min: 10 }).select()).error, 'admin B cannot add services to shop A');
ok(((await B.from('services').update({ price: 0 }).eq('shop_id', a.s.id).select()).data || []).length === 0, 'admin B cannot change shop A prices');
ok(!!(await B.from('appointments').insert({ shop_id: a.s.id, location_id: a.loc.id, barber_id: a.bs[0].id, service_id: a.svc.id, starts_at: slotsA[10].slot }).select()).error, 'admin B cannot add appointments to shop A');
ok(!!(await B.from('appointments').insert({ shop_id: b.s.id, location_id: a.loc.id, barber_id: a.bs[0].id, service_id: a.svc.id, starts_at: slotsA[10].slot }).select()).error, 'admin B cannot attach shop A barbers to own shop');
ok(((await A.from('profiles').select('*')).data || []).length === 1, 'admin sees only their own profile, not customer accounts');
ok(!!(await A.from('shops').update({ active: false }).eq('id', a.s.id).select()).error || (await anon.from('shops').select('*').eq('id', a.s.id)).data.length === 1, 'shop admin cannot change the "active" switch');
ok(!!(await c1.from('profiles').update({ is_platform_owner: true }).eq('id', (await c1.auth.getUser()).data.user.id).select()).error, 'nobody can make themselves platform owner');

console.log('\n# customer rules');
const own = (await winner.from('appointments').select('*')).data;
ok(own.length >= 1 && own.every(x => x.customer_name.startsWith('Stranka')), 'customer sees only their own appointments');
ok(!!(await winner.from('appointments').insert({ shop_id: a.s.id, location_id: a.loc.id, barber_id: a.bs[0].id, service_id: a.svc.id, starts_at: slotsA[12].slot }).select()).error, 'customer cannot insert appointments directly');
ok(((await winner.from('appointments').update({ price: 0 }).eq('id', mine.id).select()).data || []).length === 0, 'customer cannot edit an appointment directly');
const moved = await winner.rpc('reschedule_my_appointment', { p_id: mine.id, p_start: slotsA[5].slot });
ok(!moved.error && moved.data.starts_at !== mine.starts_at, 'customer can move an appointment to a free time (even one overlapping the old time)', errOf(moved));
const other = [c1, c2, c3].find(c => c !== winner);
ok(errOf(await other.rpc('cancel_my_appointment', { p_id: mine.id })).includes('not_found'), "customer cannot cancel someone else's appointment");
const cancelled = await winner.rpc('cancel_my_appointment', { p_id: mine.id });
ok(cancelled.data?.status === 'cancelled', 'customer can cancel before the deadline', errOf(cancelled));
ok((await anon.rpc('get_slots', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_date: day })).data.length === 28, 'cancelled time is free again');

console.log('\n# limits');
await A.from('shops').update({ max_active_per_customer: 2 }).eq('id', a.s.id);
const fresh = await user('c4@test.si', 'Stranka Štiri');
const r1 = await fresh.rpc('book_appointment', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_start: slotsA[0].slot });
const r2 = await fresh.rpc('book_appointment', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_start: slotsA[2].slot });
const r3 = await fresh.rpc('book_appointment', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_start: slotsA[8].slot });
ok(!r1.error && !r2.error && errOf(r3).includes('too_many_active'), 'open appointments per customer are limited', [r1, r2, r3].map(errOf).join(' | '));
await A.from('shops').update({ max_active_per_customer: 20 }).eq('id', a.s.id);
let last;
for (let i = 0; i < 6; i++) last = await fresh.rpc('book_appointment', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_start: slotsA[14 + i * 2].slot });
ok(errOf(last).includes('rate_limited'), 'bookings per hour are limited', errOf(last));
await A.from('shops').update({ cancel_deadline_hours: 720 }).eq('id', a.s.id);
ok(errOf(await fresh.rpc('cancel_my_appointment', { p_id: r1.data.id })).includes('too_late'), 'cancelling after the deadline is refused');
await A.from('shops').update({ cancel_deadline_hours: 2, min_notice_minutes: 10080 }).eq('id', a.s.id);
ok((await anon.rpc('get_slots', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_date: day })).data.length === 0, 'minimum notice hides slots that are too soon');
await A.from('shops').update({ min_notice_minutes: 60 }).eq('id', a.s.id);
await A.from('days_off').insert({ shop_id: a.s.id, location_id: a.loc.id, date_from: day, date_to: day });
ok((await anon.rpc('get_slots', { p_location: a.loc.id, p_service: a.svc.id, p_barber: null, p_date: day })).data.length === 0, 'a day off closes booking for that day');

console.log('\n# email outbox, images, account deletion');
ok(!!(await c1.rpc('claim_outbox', { p_limit: 5 })).error, 'customers cannot read the email outbox');
const claimed = (await service.rpc('claim_outbox', { p_limit: 50 })).data;
ok(claimed?.length >= 3 && claimed.every(m => m.email && m.shop_name && m.starts_at), 'server can collect pending confirmation emails', JSON.stringify(claimed)?.slice(0, 200));
const up = (c, shopId) => c.storage.from('images').upload(`${shopId}/logo-${Math.random()}.jpg`, new Blob([new Uint8Array([255, 216, 255])], { type: 'image/jpeg' }));
ok(!(await up(A, a.s.id)).error, 'admin can upload an image to own shop');
ok(!!(await up(B, a.s.id)).error, "admin cannot upload into another shop's folder");
ok(!!(await c1.storage.from('images').upload(`${a.s.id}/x.jpg`, new Blob(['x']))).error, 'customers cannot upload images');
ok(errOf(await A.rpc('delete_my_account')).includes('owns_shop'), 'a shop admin cannot delete the account while owning a shop');
ok(!(await fresh.rpc('delete_my_account')).error, 'customer can delete their account');
const left = (await A.from('appointments').select('*').eq('customer_name', 'Stranka Štiri')).data;
ok(left.length === 0, 'their name is removed from the shop calendar after deletion');
ok(errOf(await fresh.auth.signInWithPassword({ email: 'c4@test.si', password: 'geslo123' })).includes('Invalid'), 'deleted account cannot log in');

console.log(`\n${pass} passed, ${fail} failed (${Date.now() - t0} ms)`);
process.exit(fail ? 1 : 0);
