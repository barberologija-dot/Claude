import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { getAppointments, insertRow, updateRow } from '../../lib/api';
import { t, tList } from '../../lib/i18n';
import { addDays, dateKey, fmtDay, fmtPrice, fmtTime, fromMinutes, minutesOfDay, mondayOf, toMinutes, todayKey, weekdayOf, zonedToIso } from '../../lib/time';
import type { Appointment, AppointmentStatus } from '../../lib/types';
import { Button, ErrorNote, Field, Sheet, Spinner } from '../../components/ui';
import { useAdmin } from './Admin';

const PPM = 1.5; // pixels per minute in the day view
type Draft = { id?: string; customer_name: string; customer_phone: string; service_id: string; barber_id: string; date: string; time: string; note: string };

export default function AdminCalendar() {
  const { shop, catalog, schedule } = useAdmin();
  const locations = catalog.locations;
  const [locId, setLocId] = useState(locations.find(l => l.active)?.id || locations[0]?.id);
  const loc = locations.find(l => l.id === locId) || locations[0];
  const tz = loc?.timezone;
  const [date, setDate] = useState(() => todayKey(tz));
  const [view, setView] = useState<'day' | 'week'>('day');
  const [who, setWho] = useState('all');
  const [list, setList] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const grid = useRef<HTMLDivElement>(null);
  const scrollTo = useRef(0);

  const from = view === 'day' ? date : mondayOf(date);
  const span = view === 'day' ? 1 : 7;

  const load = useCallback(async () => {
    if (!loc) return;
    try {
      setList(await getAppointments(shop.id, loc.id, zonedToIso(from, '00:00', tz), zonedToIso(addDays(from, span), '00:00', tz)));
      setError(null);
    } catch (e) { setError(e); }
  }, [shop.id, loc?.id, from, span, tz]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setList(null); load(); }, [load]);
  // keep the calendar fresh while it is open (new online bookings)
  useEffect(() => { const id = setInterval(load, 60_000); return () => clearInterval(id); }, [load]);

  // when a day opens, bring the first appointment (or the current time) into view
  useEffect(() => { if (list && view === 'day' && grid.current) grid.current.scrollTop = scrollTo.current; }, [list, view, date]);

  const barbers = useMemo(() => catalog.barbers.filter(b => b.location_id === loc?.id && (b.active || list?.some(a => a.barber_id === b.id))), [catalog, loc, list]);
  const shown = barbers.filter(b => who === 'all' || b.id === who);
  const visible = useMemo(() => (list || []).filter(a => a.status !== 'cancelled' && (who === 'all' || a.barber_id === who)), [list, who]);
  const svc = (id: string) => catalog.services.find(s => s.id === id);
  const barberName = (id: string) => catalog.barbers.find(b => b.id === id)?.name || '';

  // ---- setup checklist for a new shop
  const missing = { location: locations.length === 0, service: catalog.services.length === 0, barber: catalog.barbers.length === 0 };
  if (missing.location || missing.service || missing.barber) {
    return (
      <>
        <h1>{t('admin.welcome_title')}</h1>
        <p className="muted">{t('admin.welcome_text')}</p>
        <div className="checklist">
          <Link to="/admin/lokacije" className={missing.location ? '' : 'done'}>{missing.location ? '①' : '✓'} {t('admin.step_location')}</Link>
          <Link to="/admin/storitve" className={missing.service ? '' : 'done'}>{missing.service ? '②' : '✓'} {t('admin.step_services')}</Link>
          <Link to="/admin/brivci" className={missing.barber ? '' : 'done'}>{missing.barber ? '③' : '✓'} {t('admin.step_barbers')}</Link>
        </div>
      </>
    );
  }

  // ---- actions
  function openNew(barberId?: string, time?: string, day = date) {
    const now = minutesOfDay(new Date(), tz);
    const next = Math.ceil((now + 1) / shop.slot_minutes) * shop.slot_minutes;
    setFormError(null);
    setDraft({
      customer_name: '', customer_phone: '', note: '', date: day,
      service_id: catalog.services.find(s => s.active)?.id || catalog.services[0].id,
      barber_id: barberId || (who !== 'all' ? who : shown[0]?.id || barbers[0]?.id || ''),
      time: time || fromMinutes(Math.min(next, 23 * 60)),
    });
  }
  function openEdit(a: Appointment) {
    setFormError(null); setDetail(null);
    setDraft({ id: a.id, customer_name: a.customer_name, customer_phone: a.customer_phone, note: a.note, service_id: a.service_id, barber_id: a.barber_id, date: dateKey(a.starts_at, tz), time: fromMinutes(minutesOfDay(a.starts_at, tz)) });
  }
  async function saveDraft(e: FormEvent) {
    e.preventDefault();
    if (!draft || !loc) return;
    setBusy(true); setFormError(null);
    try {
      const service = svc(draft.service_id)!;
      const starts = zonedToIso(draft.date, draft.time, tz);
      const row = {
        customer_name: draft.customer_name.trim(), customer_phone: draft.customer_phone.trim(), note: draft.note,
        service_id: draft.service_id, barber_id: draft.barber_id, starts_at: starts,
        ends_at: new Date(new Date(starts).getTime() + service.duration_min * 60_000).toISOString(), price: service.price,
      };
      if (draft.id) await updateRow('appointments', draft.id, row);
      else await insertRow('appointments', { ...row, shop_id: shop.id, location_id: loc.id });
      setDraft(null); await load();
    } catch (err) { setFormError(err); }
    setBusy(false);
  }
  async function setStatus(a: Appointment, status: AppointmentStatus) {
    setBusy(true); setFormError(null);
    try {
      await updateRow('appointments', a.id, status === 'cancelled'
        ? { status, cancelled_by: 'shop', cancelled_at: new Date().toISOString() }
        : { status, cancelled_by: null, cancelled_at: null });
      setDetail(null); await load();
    } catch (err) { setFormError(err); }
    setBusy(false);
  }

  // ---- day view geometry
  const dow = weekdayOf(date);
  const hours = catalog.hours.find(h => h.location_id === loc.id && h.weekday === dow);
  const dayList = visible.filter(a => dateKey(a.starts_at, tz) === date);
  let startMin = hours ? toMinutes(hours.opens) : 8 * 60;
  let endMin = hours ? toMinutes(hours.closes) : 18 * 60;
  for (const a of dayList) { startMin = Math.min(startMin, minutesOfDay(a.starts_at, tz)); endMin = Math.max(endMin, minutesOfDay(a.starts_at, tz) + (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60_000); }
  startMin = Math.floor(startMin / 60) * 60; endMin = Math.min(24 * 60, Math.ceil(endMin / 60) * 60);
  const height = (endMin - startMin) * PPM;
  const breaks = schedule.breaks.filter(b => b.location_id === loc.id && b.weekday === dow);
  const closedAll = schedule.daysOff.some(d => d.location_id === loc.id && !d.barber_id && d.date_from <= date && d.date_to >= date);
  const nowMin = date === todayKey(tz) ? minutesOfDay(new Date(), tz) : -1;
  const firstMin = Math.min(...dayList.map(a => minutesOfDay(a.starts_at, tz)), nowMin >= startMin && nowMin <= endMin ? nowMin : Infinity);
  scrollTo.current = Number.isFinite(firstMin) ? Math.max(0, (firstMin - startMin - 45) * PPM) : 0;

  function clickColumn(e: MouseEvent<HTMLDivElement>, barberId: string) {
    if (e.target !== e.currentTarget) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    openNew(barberId, fromMinutes(startMin + Math.floor(y / PPM / shop.slot_minutes) * shop.slot_minutes));
  }
  /** Parts of the day when this barber does not work (own hours or day off). */
  function closedBands(barberId: string): [number, number][] {
    if (closedAll || !hours) return [[startMin, endMin]];
    if (schedule.daysOff.some(d => d.barber_id === barberId && d.date_from <= date && d.date_to >= date)) return [[startMin, endMin]];
    const own = schedule.barberHours.find(h => h.barber_id === barberId && h.weekday === dow);
    if (own && !own.works) return [[startMin, endMin]];
    const open = Math.max(toMinutes(hours.opens), own?.starts ? toMinutes(own.starts) : 0);
    const close = Math.min(toMinutes(hours.closes), own?.ends ? toMinutes(own.ends) : 24 * 60);
    return [[startMin, open], [close, endMin]].filter(([a, b]) => b > a) as [number, number][];
  }

  const weekdays = tList('weekdays_short');
  const title = view === 'day' ? fmtDay(date, { weekday: 'short', day: 'numeric', month: 'short' }) : `${fmtDay(from, { day: 'numeric', month: 'short' })} – ${fmtDay(addDays(from, 6), { day: 'numeric', month: 'short' })}`;

  return (
    <>
      {locations.length > 1 && (
        <div className="chips">
          {locations.map(l => <button key={l.id} className={`chip ${l.id === loc.id ? 'on' : ''}`} onClick={() => { setLocId(l.id); setWho('all'); }}>{l.name}</button>)}
        </div>
      )}
      <div className="cal-nav">
        <button className="icon-btn" aria-label={t('admin.prev')} onClick={() => setDate(addDays(date, -span))}>‹</button>
        <button className="title link-btn" style={{ textDecoration: 'none' }} onClick={() => setDate(todayKey(tz))}>{title}{date === todayKey(tz) && view === 'day' ? ` · ${t('admin.today')}` : ''}</button>
        <button className="icon-btn" aria-label={t('admin.next')} onClick={() => setDate(addDays(date, span))}>›</button>
      </div>
      <div className="segmented">
        <button className={view === 'day' ? 'on' : ''} onClick={() => setView('day')}>{t('admin.day')}</button>
        <button className={view === 'week' ? 'on' : ''} onClick={() => setView('week')}>{t('admin.week')}</button>
      </div>
      {barbers.length > 1 && (
        <div className="chips">
          <button className={`chip ${who === 'all' ? 'on' : ''}`} onClick={() => setWho('all')}>{t('admin.all_barbers')}</button>
          {barbers.map(b => <button key={b.id} className={`chip ${who === b.id ? 'on' : ''}`} onClick={() => setWho(b.id)}>{b.name}</button>)}
        </div>
      )}
      <ErrorNote error={error} />

      {!list ? <Spinner /> : view === 'day' ? (
        <>
          {closedAll && <div className="note">{t('admin.day_off_today')}</div>}
          {!hours && !closedAll && <div className="note">{t('admin.closed_today')}</div>}
          <div className="cal" ref={grid}>
            <div className="cal-head">
              <div className="gutter" />
              {shown.map(b => <div className="col" key={b.id}>{b.name}</div>)}
            </div>
            <div className="cal-body" style={{ height }}>
              <div className="gutter">
                {Array.from({ length: (endMin - startMin) / 60 + 1 }, (_, i) => <span key={i} style={{ top: Math.max(i * 60 * PPM, 8) }}>{fromMinutes(startMin + i * 60)}</span>)}
              </div>
              {shown.map(b => (
                <div className="cal-col" key={b.id} style={{ backgroundSize: `100% ${60 * PPM}px` }} onClick={e => clickColumn(e, b.id)} role="button" aria-label={`${t('admin.new_appointment')}: ${b.name}`}>
                  {closedBands(b.id).map(([a, z], i) => <div key={i} className="cal-closed" style={{ top: (a - startMin) * PPM, height: (z - a) * PPM }} />)}
                  {breaks.map(br => <div key={br.id} className="cal-break" style={{ top: (toMinutes(br.starts) - startMin) * PPM, height: (toMinutes(br.ends) - toMinutes(br.starts)) * PPM }} />)}
                  {dayList.filter(a => a.barber_id === b.id).map(a => {
                    const top = (minutesOfDay(a.starts_at, tz) - startMin) * PPM;
                    const h = Math.max(22, (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60_000 * PPM - 1);
                    return (
                      <button key={a.id} className={`appt ${a.status}`} style={{ top, height: h }} onClick={() => { setFormError(null); setDetail(a); }}>
                        <b>{fmtTime(a.starts_at, tz)} {a.customer_name || t('admin.no_name')}</b>
                        {h > 34 && <span>{svc(a.service_id)?.name}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
              {nowMin >= startMin && nowMin <= endMin && <div className="cal-now" style={{ top: (nowMin - startMin) * PPM }} />}
            </div>
          </div>
          <p className="muted small center">{t('admin.tap_hint')}</p>
        </>
      ) : (
        <div className="list">
          {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map(d => {
            const items = visible.filter(a => dateKey(a.starts_at, tz) === d);
            return (
              <div key={d}>
                <button className={`week-day ${d === todayKey(tz) ? 'today' : ''}`} onClick={() => { setDate(d); setView('day'); }}>
                  <span>{weekdays[weekdayOf(d)]}, {fmtDay(d, { day: 'numeric', month: 'short' })}</span>
                  <span className="badge grey">{items.length}</span>
                </button>
                {items.map(a => (
                  <button key={a.id} className="item" style={{ minHeight: 52 }} onClick={() => { setFormError(null); setDetail(a); }}>
                    <span className={`dot ${a.status}`} aria-hidden />
                    <b className="nowrap">{fmtTime(a.starts_at, tz)}</b>
                    <span className="grow"><span className="title">{a.customer_name || t('admin.no_name')}</span><span className="sub">{svc(a.service_id)?.name} · {barberName(a.barber_id)}</span></span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <button className="fab" aria-label={t('admin.new_appointment')} onClick={() => openNew()}>＋</button>

      {/* appointment details */}
      <Sheet open={!!detail} title={detail?.customer_name || t('admin.no_name')} onClose={() => setDetail(null)}>
        {detail && <>
          <section className="card summary">
            <div className="line"><span>{t('booking.when')}</span><span>{fmtDay(dateKey(detail.starts_at, tz), { weekday: 'short', day: 'numeric', month: 'short' })}, {fmtTime(detail.starts_at, tz)}–{fmtTime(detail.ends_at, tz)}</span></div>
            <div className="line"><span>{t('booking.service')}</span><span>{svc(detail.service_id)?.name}</span></div>
            <div className="line"><span>{t('booking.barber')}</span><span>{barberName(detail.barber_id)}</span></div>
            <div className="line"><span>{t('booking.price')}</span><span>{fmtPrice(detail.price)}</span></div>
            {detail.customer_phone && <div className="line"><span>{t('auth.phone')}</span><span><a href={`tel:${detail.customer_phone.replace(/\s/g, '')}`}>{detail.customer_phone}</a></span></div>}
            {detail.note && <div className="line"><span>{t('admin.note')}</span><span>{detail.note}</span></div>}
            <div className="line"><span>{t('admin.status')}</span><span><span className={`badge ${detail.status === 'no_show' ? 'red' : detail.status === 'completed' ? 'grey' : ''}`}>{t(`status.${detail.status}`)}</span> <span className="muted small">{t(detail.customer_id ? 'admin.booked_online' : 'admin.booked_by_shop')}</span></span></div>
          </section>
          <ErrorNote error={formError} />
          {detail.status === 'booked' ? <>
            <div className="row">
              <Button className="grow" busy={busy} onClick={() => setStatus(detail, 'completed')}>✓ {t('admin.mark_completed')}</Button>
              <Button className="grow" variant="soft" busy={busy} onClick={() => setStatus(detail, 'no_show')}>{t('admin.mark_no_show')}</Button>
            </div>
            <Button variant="ghost" className="block" onClick={() => openEdit(detail)}>{t('admin.edit_move')}</Button>
            <Button variant="danger" className="block" busy={busy} onClick={() => setStatus(detail, 'cancelled')}>{t('admin.cancel_appointment')}</Button>
          </> : <Button variant="ghost" className="block" busy={busy} onClick={() => setStatus(detail, 'booked')}>{t('admin.back_to_booked')}</Button>}
        </>}
      </Sheet>

      {/* add / edit */}
      <Sheet open={!!draft} title={t(draft?.id ? 'admin.edit_appointment' : 'admin.new_appointment')} onClose={() => setDraft(null)}>
        {draft && (
          <form className="stack" onSubmit={saveDraft}>
            <Field label={t('admin.customer_name')}><input id="appt-name" type="text" required maxLength={80} value={draft.customer_name} onChange={e => setDraft({ ...draft, customer_name: e.target.value })} /></Field>
            <Field label={t('auth.phone')}><input id="appt-phone" type="tel" maxLength={30} value={draft.customer_phone} onChange={e => setDraft({ ...draft, customer_phone: e.target.value })} /></Field>
            <Field label={t('booking.service')}>
              <select id="appt-service" value={draft.service_id} onChange={e => setDraft({ ...draft, service_id: e.target.value })}>
                {catalog.services.filter(s => s.active || s.id === draft.service_id).map(s => <option key={s.id} value={s.id}>{s.name} · {s.duration_min} min · {fmtPrice(s.price)}</option>)}
              </select>
            </Field>
            <Field label={t('booking.barber')}>
              <select id="appt-barber" required value={draft.barber_id} onChange={e => setDraft({ ...draft, barber_id: e.target.value })}>
                {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <div className="row">
              <div className="grow"><Field label={t('admin.date')}><input id="appt-date" type="date" required value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></Field></div>
              <div className="grow"><Field label={t('admin.time')}><input id="appt-time" type="time" required step={shop.slot_minutes * 60} value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} /></Field></div>
            </div>
            <Field label={t('admin.note')}><input id="appt-note" type="text" maxLength={200} value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} /></Field>
            <ErrorNote error={formError} />
            <Button type="submit" busy={busy} className="block big">{t('common.save')}</Button>
          </form>
        )}
      </Sheet>
    </>
  );
}
