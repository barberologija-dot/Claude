// Admin lists: services, barbers and locations. Each opens an edit panel.
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  addBreaks, deleteRow, insertRow, saveBarberHours, saveBarberServices, saveLocationHours, saveServiceBarbers, updateRow,
} from '../../lib/api';
import { t, tList } from '../../lib/i18n';
import { fmtDay, fmtDuration, fmtPrice, hhmm, todayKey } from '../../lib/time';
import type { Barber, Location, Service } from '../../lib/types';
import { Avatar, Button, Empty, ErrorNote, Field, ImagePicker, Sheet, Toggle } from '../../components/ui';
import { useAdmin } from './Admin';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
type DayHours = { on: boolean; from: string; to: string };
type WeekHours = Record<number, DayHours>;

function HoursEditor({ value, onChange }: { value: WeekHours; onChange: (v: WeekHours) => void }) {
  const names = tList('weekdays');
  const set = (d: number, patch: Partial<DayHours>) => onChange({ ...value, [d]: { ...value[d], ...patch } });
  return (
    <div>
      {WEEK.map(d => (
        <div className="hours-row" key={d}>
          <Toggle checked={value[d].on} onChange={on => set(d, { on })} label={names[d]} />
          {!value[d].on && <span className="muted">{t('shop.closed')}</span>}
          {value[d].on && (
            <div className="hours-times">
              <input type="time" aria-label={`${names[d]} ${t('admin.from')}`} value={value[d].from} onChange={e => set(d, { from: e.target.value })} />
              <span>–</span>
              <input type="time" aria-label={`${names[d]} ${t('admin.to')}`} value={value[d].to} onChange={e => set(d, { to: e.target.value })} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
const emptyWeek = (on: (d: number) => boolean, from = '09:00', to = '17:00'): WeekHours =>
  Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => [d, { on: on(d), from, to }]));
const badHours = (w: WeekHours) => Object.values(w).some(d => d.on && (!d.from || !d.to || d.from >= d.to));

// ============================================================ services

export function AdminServices() {
  const { shop, catalog, reload } = useAdmin();
  const [edit, setEdit] = useState<Partial<Service> | null>(null);
  const [who, setWho] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  function open(s: Partial<Service> | null) {
    setError(null);
    setEdit(s ?? { name: '', description: '', duration_min: 30, price: 15, image_url: null, active: true });
    setWho(s?.id ? catalog.barberServices.filter(x => x.service_id === s.id).map(x => x.barber_id) : catalog.barbers.map(b => b.id));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true); setError(null);
    try {
      const row = { name: edit.name!.trim(), description: edit.description || '', duration_min: edit.duration_min, price: edit.price, image_url: edit.image_url ?? null, active: edit.active ?? true };
      const saved = edit.id ? await updateRow<Service>('services', edit.id, row) : await insertRow<Service>('services', { ...row, shop_id: shop.id, sort: catalog.services.length });
      await saveServiceBarbers(saved, who);
      await reload(); setEdit(null);
    } catch (err) { setError(err); }
    setBusy(false);
  }
  async function remove() {
    if (!edit?.id) return;
    setBusy(true); setError(null);
    try { await deleteRow('services', edit.id); await reload(); setEdit(null); } catch (err) { setError(err); }
    setBusy(false);
  }

  return (
    <>
      <div className="row between"><h1>{t('admin.tab_services')}</h1><Button onClick={() => open(null)}>＋ {t('admin.add')}</Button></div>
      {catalog.services.length === 0
        ? <Empty title={t('admin.no_services_title')} text={t('admin.no_services_text')} />
        : <div className="list">
            {catalog.services.map(s => (
              <button key={s.id} className={`item ${s.active ? '' : 'off'}`} onClick={() => open(s)}>
                {s.image_url ? <img className="thumb" src={s.image_url} alt="" /> : <span className="thumb" />}
                <span className="grow"><span className="title">{s.name}</span><span className="sub">{fmtDuration(s.duration_min)}{!s.active && ` · ${t('admin.hidden')}`}</span></span>
                <span className="end">{fmtPrice(s.price)}</span>
              </button>
            ))}
          </div>}

      <Sheet open={!!edit} title={t(edit?.id ? 'admin.edit_service' : 'admin.new_service')} onClose={() => setEdit(null)}>
        {edit && (
          <form className="stack" onSubmit={save}>
            <Field label={t('admin.service_name')}><input id="svc-name" type="text" required maxLength={80} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div className="row">
              <div className="grow"><Field label={t('admin.duration')}><input id="svc-duration" type="number" required min={5} max={480} step={5} inputMode="numeric" value={edit.duration_min} onChange={e => setEdit({ ...edit, duration_min: +e.target.value })} /></Field></div>
              <div className="grow"><Field label={t('admin.price')}><input id="svc-price" type="number" required min={0} max={9999} step={0.5} inputMode="decimal" value={edit.price} onChange={e => setEdit({ ...edit, price: +e.target.value })} /></Field></div>
            </div>
            <Field label={t('admin.short_description')}><input id="svc-desc" type="text" maxLength={120} value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} /></Field>
            <ImagePicker shopId={shop.id} value={edit.image_url ?? null} onChange={image_url => setEdit({ ...edit, image_url })} label={t('admin.image')} />
            {catalog.barbers.length > 0 && (
              <div className="field">
                <span className="field-label">{t('admin.who_does_it')}</span>
                <div className="chips wrap">
                  {catalog.barbers.map(b => (
                    <button type="button" key={b.id} className={`chip ${who.includes(b.id) ? 'on' : ''}`} aria-pressed={who.includes(b.id)}
                      onClick={() => setWho(w => (w.includes(b.id) ? w.filter(x => x !== b.id) : [...w, b.id]))}>{b.name}</button>
                  ))}
                </div>
              </div>
            )}
            {edit.id && <Toggle checked={edit.active ?? true} onChange={active => setEdit({ ...edit, active })} label={t('admin.visible_to_customers')} />}
            <ErrorNote error={error} />
            <Button type="submit" busy={busy} className="block big">{t('common.save')}</Button>
            {edit.id && <Button type="button" variant="ghost" className="block" onClick={remove}>{t('common.delete')}</Button>}
          </form>
        )}
      </Sheet>
    </>
  );
}

// ============================================================ barbers

export function AdminBarbers() {
  const { shop, catalog, schedule, reload } = useAdmin();
  const [edit, setEdit] = useState<Partial<Barber> | null>(null);
  const [does, setDoes] = useState<string[]>([]);
  const [custom, setCustom] = useState(false);
  const [week, setWeek] = useState<WeekHours>(emptyWeek(() => true));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  function open(b: Partial<Barber> | null) {
    setError(null);
    const locId = b?.location_id || catalog.locations[0]?.id;
    setEdit(b ?? { name: '', photo_url: null, location_id: locId, active: true });
    setDoes(b?.id ? catalog.barberServices.filter(x => x.barber_id === b.id).map(x => x.service_id) : catalog.services.map(s => s.id));
    const own = b?.id ? schedule.barberHours.filter(h => h.barber_id === b.id) : [];
    const locHours = catalog.hours.filter(h => h.location_id === locId);
    setCustom(own.length > 0);
    setWeek(Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => {
      const o = own.find(h => h.weekday === d), l = locHours.find(h => h.weekday === d);
      return [d, o ? { on: o.works, from: hhmm(o.starts) || hhmm(l?.opens) || '09:00', to: hhmm(o.ends) || hhmm(l?.closes) || '17:00' }
                   : { on: !!l, from: hhmm(l?.opens) || '09:00', to: hhmm(l?.closes) || '17:00' }];
    })));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    if (custom && badHours(week)) { setError(t('errors.bad_hours')); return; }
    setBusy(true); setError(null);
    try {
      const row = { name: edit.name!.trim(), photo_url: edit.photo_url ?? null, location_id: edit.location_id, active: edit.active ?? true };
      const saved = edit.id ? await updateRow<Barber>('barbers', edit.id, row) : await insertRow<Barber>('barbers', { ...row, shop_id: shop.id, sort: catalog.barbers.length });
      await saveBarberServices(saved, does);
      await saveBarberHours(saved, custom ? WEEK.map(d => ({ weekday: d, works: week[d].on, starts: week[d].on ? week[d].from : null, ends: week[d].on ? week[d].to : null })) : null);
      await reload(); setEdit(null);
    } catch (err) { setError(err); }
    setBusy(false);
  }
  async function remove() {
    if (!edit?.id) return;
    setBusy(true); setError(null);
    try { await deleteRow('barbers', edit.id); await reload(); setEdit(null); } catch (err) { setError(err); }
    setBusy(false);
  }

  if (catalog.locations.length === 0) {
    return <><h1>{t('admin.tab_barbers')}</h1><Empty title={t('admin.need_location_title')} text={t('admin.need_location_text')}><Link className="btn btn-primary" to="/admin/lokacije">{t('admin.tab_locations')}</Link></Empty></>;
  }
  return (
    <>
      <div className="row between"><h1>{t('admin.tab_barbers')}</h1><Button onClick={() => open(null)}>＋ {t('admin.add')}</Button></div>
      {catalog.barbers.length === 0
        ? <Empty title={t('admin.no_barbers_title')} text={t('admin.no_barbers_text')} />
        : <div className="list">
            {catalog.barbers.map(b => (
              <button key={b.id} className={`item ${b.active ? '' : 'off'}`} onClick={() => open(b)}>
                <Avatar src={b.photo_url} name={b.name} />
                <span className="grow">
                  <span className="title">{b.name}</span>
                  <span className="sub">{catalog.locations.find(l => l.id === b.location_id)?.name} · {t('admin.n_services', { n: catalog.barberServices.filter(x => x.barber_id === b.id).length })}{!b.active && ` · ${t('admin.hidden')}`}</span>
                </span>
                <span className="chev" aria-hidden>›</span>
              </button>
            ))}
          </div>}

      <Sheet open={!!edit} title={t(edit?.id ? 'admin.edit_barber' : 'admin.new_barber')} onClose={() => setEdit(null)}>
        {edit && (
          <form className="stack" onSubmit={save}>
            <ImagePicker round shopId={shop.id} value={edit.photo_url ?? null} onChange={photo_url => setEdit({ ...edit, photo_url })} label={t('admin.photo')} />
            <Field label={t('admin.barber_name')}><input id="barber-name" type="text" required maxLength={80} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
            {catalog.locations.length > 1 && (
              <Field label={t('admin.works_at')}>
                <select id="barber-location" value={edit.location_id} onChange={e => setEdit({ ...edit, location_id: e.target.value })}>
                  {catalog.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            )}
            <div className="field">
              <span className="field-label">{t('admin.barber_services')}</span>
              {catalog.services.length === 0 ? <span className="muted">{t('admin.no_services_text')}</span> : (
                <div className="chips wrap">
                  {catalog.services.map(s => (
                    <button type="button" key={s.id} className={`chip ${does.includes(s.id) ? 'on' : ''}`} aria-pressed={does.includes(s.id)}
                      onClick={() => setDoes(w => (w.includes(s.id) ? w.filter(x => x !== s.id) : [...w, s.id]))}>{s.name}</button>
                  ))}
                </div>
              )}
            </div>
            <Toggle checked={custom} onChange={setCustom} label={t('admin.custom_hours')} />
            {custom ? <HoursEditor value={week} onChange={setWeek} /> : <p className="muted small">{t('admin.same_as_location')}</p>}
            {edit.id && <Toggle checked={edit.active ?? true} onChange={active => setEdit({ ...edit, active })} label={t('admin.visible_to_customers')} />}
            <ErrorNote error={error} />
            <Button type="submit" busy={busy} className="block big">{t('common.save')}</Button>
            {edit.id && <Button type="button" variant="ghost" className="block" onClick={remove}>{t('common.delete')}</Button>}
          </form>
        )}
      </Sheet>
    </>
  );
}

// ============================================================ locations

export function AdminLocations() {
  const { shop, catalog, schedule, reload } = useAdmin();
  const [edit, setEdit] = useState<Partial<Location> | null>(null);
  const [week, setWeek] = useState<WeekHours>(emptyWeek(() => false));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // new break / day off
  const [br, setBr] = useState({ from: '12:00', to: '12:30', days: [1, 2, 3, 4, 5] });
  const [off, setOff] = useState({ from: todayKey(), to: todayKey(), barber: '', note: '' });
  const names = tList('weekdays_short');

  function open(l: Partial<Location> | null) {
    setError(null);
    setEdit(l ?? { name: catalog.locations.length ? '' : shop.name, address: '', city: '', phone: shop.phone, active: true });
    const hours = l?.id ? catalog.hours.filter(h => h.location_id === l.id) : null;
    setWeek(hours
      ? Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(d => { const h = hours.find(x => x.weekday === d); return [d, { on: !!h, from: hhmm(h?.opens) || '09:00', to: hhmm(h?.closes) || '17:00' }]; }))
      : emptyWeek(d => d >= 1 && d <= 5));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    if (badHours(week)) { setError(t('errors.bad_hours')); return; }
    setBusy(true); setError(null);
    try {
      const row = { name: edit.name!.trim(), address: edit.address || '', city: edit.city || '', phone: edit.phone || '', active: edit.active ?? true };
      const saved = edit.id ? await updateRow<Location>('locations', edit.id, row) : await insertRow<Location>('locations', { ...row, shop_id: shop.id, sort: catalog.locations.length });
      await saveLocationHours(saved, WEEK.filter(d => week[d].on).map(d => ({ weekday: d, opens: week[d].from, closes: week[d].to })));
      await reload();
      if (edit.id) setEdit(null); else setEdit(saved);   // a new location stays open so breaks and days off can be added
    } catch (err) { setError(err); }
    setBusy(false);
  }
  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); await reload(); } catch (err) { setError(err); }
    setBusy(false);
  }
  const current = edit?.id ? catalog.locations.find(l => l.id === edit.id) : undefined;
  const breaks = schedule.breaks.filter(b => b.location_id === edit?.id);
  // show breaks grouped by time, e.g. "12:00–12:30 · Pon, Tor, Sre"
  const breakGroups = Object.values(breaks.reduce<Record<string, typeof breaks>>((acc, b) => { (acc[`${b.starts}-${b.ends}`] ||= []).push(b); return acc; }, {}));
  const daysOff = schedule.daysOff.filter(d => d.location_id === edit?.id && d.date_to >= todayKey());

  return (
    <>
      <div className="row between"><h1>{t('admin.tab_locations')}</h1><Button onClick={() => open(null)}>＋ {t('admin.add')}</Button></div>
      {catalog.locations.length === 0
        ? <Empty title={t('admin.no_locations_title')} text={t('admin.no_locations_text')} />
        : <div className="list">
            {catalog.locations.map(l => (
              <button key={l.id} className={`item ${l.active ? '' : 'off'}`} onClick={() => open(l)}>
                <span className="grow"><span className="title">{l.name}</span><span className="sub">{[l.address, l.city].filter(Boolean).join(', ') || t('admin.no_address')}{!l.active && ` · ${t('admin.hidden')}`}</span></span>
                <span className="chev" aria-hidden>›</span>
              </button>
            ))}
          </div>}

      <Sheet open={!!edit} title={t(edit?.id ? 'admin.edit_location' : 'admin.new_location')} onClose={() => setEdit(null)}>
        {edit && <>
          <form className="stack" onSubmit={save}>
            <Field label={t('admin.location_name')}><input id="loc-name" type="text" required maxLength={80} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label={t('admin.address')}><input id="loc-address" type="text" maxLength={120} autoComplete="street-address" value={edit.address} onChange={e => setEdit({ ...edit, address: e.target.value })} /></Field>
            <Field label={t('admin.city')}><input id="loc-city" type="text" maxLength={80} value={edit.city} onChange={e => setEdit({ ...edit, city: e.target.value })} /></Field>
            <Field label={t('admin.shop_phone')}><input id="loc-phone" type="tel" maxLength={30} value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <h3>{t('admin.working_hours')}</h3>
            <HoursEditor value={week} onChange={setWeek} />
            {edit.id && <Toggle checked={edit.active ?? true} onChange={active => setEdit({ ...edit, active })} label={t('admin.visible_to_customers')} />}
            <ErrorNote error={error} />
            <Button type="submit" busy={busy} className="block big">{t('common.save')}</Button>
          </form>

          {current && <>
            <section className="card stack">
              <h3>{t('admin.breaks')}</h3>
              {breakGroups.length === 0 && <p className="muted small">{t('admin.no_breaks')}</p>}
              {breakGroups.map(g => (
                <div className="row between" key={g[0].id}>
                  <span>{hhmm(g[0].starts)}–{hhmm(g[0].ends)} <span className="muted">· {WEEK.filter(d => g.some(b => b.weekday === d)).map(d => names[d]).join(', ')}</span></span>
                  <button className="icon-btn" aria-label={t('common.delete')} onClick={() => act(() => Promise.all(g.map(b => deleteRow('location_breaks', b.id))))}>🗑</button>
                </div>
              ))}
              <div className="hours-times">
                <input type="time" aria-label={t('admin.from')} value={br.from} onChange={e => setBr({ ...br, from: e.target.value })} />
                <span>–</span>
                <input type="time" aria-label={t('admin.to')} value={br.to} onChange={e => setBr({ ...br, to: e.target.value })} />
              </div>
              <div className="chips wrap">
                {WEEK.map(d => (
                  <button type="button" key={d} className={`chip ${br.days.includes(d) ? 'on' : ''}`} aria-pressed={br.days.includes(d)}
                    onClick={() => setBr(x => ({ ...x, days: x.days.includes(d) ? x.days.filter(y => y !== d) : [...x.days, d] }))}>{names[d]}</button>
                ))}
              </div>
              <Button variant="soft" busy={busy} disabled={!br.days.length || br.from >= br.to} onClick={() => act(() => addBreaks(current, br.days, br.from, br.to))}>{t('admin.add_break')}</Button>
            </section>

            <section className="card stack">
              <h3>{t('admin.days_off')}</h3>
              {daysOff.length === 0 && <p className="muted small">{t('admin.no_days_off')}</p>}
              {daysOff.map(d => (
                <div className="row between" key={d.id}>
                  <span>
                    {fmtDay(d.date_from, { day: 'numeric', month: 'short' })}{d.date_to !== d.date_from && ` – ${fmtDay(d.date_to, { day: 'numeric', month: 'short' })}`}
                    <span className="muted"> · {d.barber_id ? catalog.barbers.find(b => b.id === d.barber_id)?.name : t('admin.whole_location')}{d.note && ` · ${d.note}`}</span>
                  </span>
                  <button className="icon-btn" aria-label={t('common.delete')} onClick={() => act(() => deleteRow('days_off', d.id))}>🗑</button>
                </div>
              ))}
              <div className="hours-times">
                <input type="date" aria-label={t('admin.from')} value={off.from} min={todayKey()} onChange={e => setOff({ ...off, from: e.target.value, to: e.target.value > off.to ? e.target.value : off.to })} />
                <span>–</span>
                <input type="date" aria-label={t('admin.to')} value={off.to} min={off.from} onChange={e => setOff({ ...off, to: e.target.value })} />
              </div>
              <select aria-label={t('admin.who_is_off')} value={off.barber} onChange={e => setOff({ ...off, barber: e.target.value })}>
                <option value="">{t('admin.whole_location')}</option>
                {catalog.barbers.filter(b => b.location_id === current.id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input type="text" maxLength={80} placeholder={t('admin.note_optional')} aria-label={t('admin.note_optional')} value={off.note} onChange={e => setOff({ ...off, note: e.target.value })} />
              <Button variant="soft" busy={busy} disabled={!off.from || !off.to || off.from > off.to}
                onClick={() => act(() => insertRow('days_off', { shop_id: shop.id, location_id: current.id, barber_id: off.barber || null, date_from: off.from, date_to: off.to, note: off.note }))}>{t('admin.add_day_off')}</Button>
            </section>

            <Button variant="ghost" className="block" onClick={() => act(async () => { await deleteRow('locations', current.id); setEdit(null); })}>{t('common.delete')}</Button>
          </>}
        </>}
      </Sheet>
    </>
  );
}
