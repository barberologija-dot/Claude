// LOCAL TESTING ONLY: fills the test database with a demo shop.
//   admin login:    admin@demo.si / demo12345
//   customer login: stranka@demo.si / demo12345
import { createClient } from '@supabase/supabase-js';
import { ANON_KEY } from './server.mjs';

const URL = 'http://localhost:54321';
const mk = () => createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function user(email, name) {
  const c = mk();
  await c.auth.signUp({ email, password: 'demo12345', options: { data: { full_name: name, phone: '040 123 456' } } });
  const mails = await (await fetch(URL + '/dev/mails')).json();
  const link = mails.filter(m => m.to === email).pop()?.link;
  if (link) await fetch(link, { redirect: 'manual' });
  const r = await c.auth.signInWithPassword({ email, password: 'demo12345' });
  if (r.error) throw r.error;
  return c;
}
const must = r => { if (r.error) throw r.error; return r.data; };

const A = await user('admin@demo.si', 'Demo Admin');
const shop = must(await A.rpc('register_shop', { p_name: 'Barberologija Demo', p_slug: 'demo', p_phone: '01 234 56 78', p_email: 'info@demo.si' }));
must(await A.from('shops').update({ description: 'Klasično striženje in nega brade v središču mesta.' }).eq('id', shop.id).select());
const loc = must(await A.from('locations').insert({ shop_id: shop.id, name: 'Center', address: 'Slovenska cesta 10', city: 'Ljubljana', phone: '01 234 56 78' }).select().single());
must(await A.from('location_hours').insert([1, 2, 3, 4, 5, 6].map(weekday => ({ location_id: loc.id, shop_id: shop.id, weekday, opens: '08:00', closes: weekday === 6 ? '13:00' : '18:00' }))).select());
must(await A.from('location_breaks').insert([1, 2, 3, 4, 5].map(weekday => ({ location_id: loc.id, shop_id: shop.id, weekday, starts: '12:00', ends: '12:30' }))).select());
const services = [];
for (const [name, duration_min, price] of [['Striženje', 30, 15], ['Britje brade', 15, 8], ['Striženje + brada', 45, 21], ['Otroško striženje', 20, 10]])
  services.push(must(await A.from('services').insert({ shop_id: shop.id, name, duration_min, price, sort: services.length }).select().single()));
const barbers = [];
for (const name of ['Žiga', 'Miha', 'Luka']) {
  const b = must(await A.from('barbers').insert({ shop_id: shop.id, location_id: loc.id, name, sort: barbers.length }).select().single());
  must(await A.from('barber_services').insert(services.map(s => ({ barber_id: b.id, service_id: s.id, shop_id: shop.id }))).select());
  barbers.push(b);
}

// a few bookings on the next working day so the calendar is not empty
const C = await user('stranka@demo.si', 'Marko Kovač');
let day = new Date(Date.now() + 864e5);
while (day.getUTCDay() === 0) day = new Date(day.getTime() + 864e5);
const key = day.toISOString().slice(0, 10);
const slots = must(await C.rpc('get_slots', { p_location: loc.id, p_service: services[0].id, p_barber: null, p_date: key }));
const times = [...new Set(slots.map(s => s.slot))];
must(await C.rpc('book_appointment', { p_location: loc.id, p_service: services[2].id, p_barber: barbers[0].id, p_start: times[4] }));
const names = ['Janez Novak', 'Peter Horvat', 'Tomaž Zupan', 'Andrej Kralj', 'Matej Potočnik'];
for (let i = 0; i < names.length; i++) {
  await A.from('appointments').insert({ shop_id: shop.id, location_id: loc.id, barber_id: barbers[i % 3].id, service_id: services[i % 3].id, customer_name: names[i], customer_phone: '041 000 00' + i, starts_at: times[8 + i * 5] }).select();
}
console.log(`seeded: /demo  (admin@demo.si / demo12345, stranka@demo.si / demo12345), bookings on ${key}`);
process.exit(0);
