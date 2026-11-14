import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { bookAppointment, errKey, flushEmails, getAppointment, getFreeDays, getSlots, rescheduleMyAppointment } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { t, tList } from '../../lib/i18n';
import { addDays, fmtDay, fmtDuration, fmtPrice, fmtTime, todayKey, weekdayOf } from '../../lib/time';
import type { Appointment, Slot } from '../../lib/types';
import { AuthPanel } from '../../components/AuthPanel';
import { Page } from '../../components/Layout';
import { Avatar, Button, Empty, ErrorNote, Spinner } from '../../components/ui';
import { useShop } from './ShopPage';

type Step = 'location' | 'service' | 'barber' | 'time' | 'confirm' | 'done';
type Selection = { locationId?: string; serviceId?: string; barberId?: string; date?: string; slot?: string };
const ANY = 'any';

export default function Booking() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { shop, catalog, error: loadError } = useShop(slug);
  const moveId = params.get('prestavi');
  const storeKey = `booking:${slug}`;

  const [sel, setSel] = useState<Selection>({});
  const [step, setStep] = useState<Step>('service');
  const [ready, setReady] = useState(false);
  const [moving, setMoving] = useState<Appointment | null>(null);
  const [freeDays, setFreeDays] = useState<string[] | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);

  const locations = useMemo(() => catalog?.locations.filter(l => l.active) || [], [catalog]);
  const services = useMemo(() => catalog?.services.filter(s => s.active) || [], [catalog]);
  const location = locations.find(l => l.id === sel.locationId);
  const service = services.find(s => s.id === sel.serviceId);
  const tz = location?.timezone;
  // barbers at this location who do the chosen service
  const barbers = useMemo(() => (catalog?.barbers || []).filter(b => b.active && b.location_id === sel.locationId
    && catalog!.barberServices.some(x => x.barber_id === b.id && x.service_id === sel.serviceId)), [catalog, sel.locationId, sel.serviceId]);
  const barber = barbers.find(b => b.id === sel.barberId);
  const rpcBarber = sel.barberId && sel.barberId !== ANY ? sel.barberId : null;

  // Work out where to start: restore an unfinished booking, or skip steps that have only one choice.
  useEffect(() => {
    if (!catalog || !shop || ready) return;
    (async () => {
      let s: Selection = {};
      if (moveId) {
        const a = await getAppointment(moveId).catch(() => null);
        if (a && a.shop_id === shop.id && a.status === 'booked') {
          setMoving(a);
          setSel({ locationId: a.location_id, serviceId: a.service_id, barberId: a.barber_id });
          setStep('time'); setReady(true);
          return;
        }
      }
      try {
        const saved = JSON.parse(localStorage.getItem(storeKey) || 'null');
        if (saved && Date.now() - saved.at < 45 * 60 * 1000) s = saved.sel;
      } catch { /* nothing saved */ }
      if (params.get('storitev')) s = { serviceId: params.get('storitev')! };
      if (!locations.some(l => l.id === s.locationId)) s = { serviceId: s.serviceId };
      if (!s.locationId && locations.length === 1) s.locationId = locations[0].id;
      if (!services.some(x => x.id === s.serviceId)) s = { locationId: s.locationId };
      setSel(s);
      setStep(!s.locationId ? 'location' : !s.serviceId ? 'service' : !s.barberId ? 'barber' : s.slot ? 'confirm' : 'time');
      setReady(true);
    })();
  }, [catalog, shop, ready, moveId, storeKey, params, locations, services]);

  // Remember the choice so it survives the trip to the verification email and back.
  useEffect(() => {
    if (!ready || moving || step === 'done') return;
    try { localStorage.setItem(storeKey, JSON.stringify({ at: Date.now(), sel })); } catch { /* ignore */ }
  }, [sel, ready, moving, step, storeKey]);

  // Only one barber does this service here: no need to ask.
  useEffect(() => {
    if (ready && step === 'barber' && barbers.length === 1) { setSel(s => ({ ...s, barberId: barbers[0].id })); setStep('time'); }
  }, [ready, step, barbers]);

  // Which days still have free times.
  const days = useMemo(() => {
    if (!shop || !tz) return [];
    const first = todayKey(tz);
    return Array.from({ length: Math.min(shop.max_days_ahead, 60) + 1 }, (_, i) => addDays(first, i));
  }, [shop, tz]);

  useEffect(() => {
    if (step !== 'time' || !sel.locationId || !sel.serviceId || !days.length) return;
    let alive = true;
    setFreeDays(null); setError(null);
    getFreeDays(sel.locationId, sel.serviceId, rpcBarber, days[0], days.length)
      .then(list => {
        if (!alive) return;
        setFreeDays(list);
        setSel(s => (s.date && list.includes(s.date) ? s : { ...s, date: list[0], slot: undefined }));
      })
      .catch(e => alive && setError(e));
    return () => { alive = false; };
  }, [step, sel.locationId, sel.serviceId, rpcBarber, days]);

  useEffect(() => {
    if (step !== 'time' || !sel.locationId || !sel.serviceId || !sel.date) { setSlots(null); return; }
    let alive = true;
    setSlots(null);
    getSlots(sel.locationId, sel.serviceId, rpcBarber, sel.date, moving?.id)
      .then(list => alive && setSlots(list))
      .catch(e => alive && setError(e));
    return () => { alive = false; };
  }, [step, sel.locationId, sel.serviceId, rpcBarber, sel.date, moving]);

  const times = useMemo(() => [...new Set((slots || []).map(s => s.slot))], [slots]);

  const order: Step[] = moving ? ['time', 'confirm'] : [...(locations.length > 1 ? ['location' as Step] : []), 'service', ...(barbers.length === 1 && step !== 'barber' ? [] : ['barber' as Step]), 'time', 'confirm'];
  const index = order.indexOf(step);
  function back() {
    setError(null);
    if (index <= 0) navigate(moving ? '/moji-termini' : `/${slug}`);
    else setStep(order[index - 1]);
  }

  async function confirm() {
    if (!sel.locationId || !sel.serviceId || !sel.slot) return;
    setBusy(true); setError(null);
    try {
      const a = moving
        ? await rescheduleMyAppointment(moving.id, sel.slot)
        : await bookAppointment(sel.locationId, sel.serviceId, rpcBarber, sel.slot);
      setBooked(a); setStep('done');
      try { localStorage.removeItem(storeKey); } catch { /* ignore */ }
      flushEmails();
    } catch (e) {
      setError(e);
      if (errKey(e) === 'errors.slot_taken') { setSel(s => ({ ...s, slot: undefined })); setStep('time'); }
    }
    setBusy(false);
  }

  if (shop === undefined || (shop && !catalog) || (shop && !ready)) return <Page><Spinner /></Page>;
  if (!shop) return <Page><ErrorNote error={loadError} /><Empty title={t('shop.not_found_title')} text={t('shop.not_found_text')} /></Page>;

  const weekdays = tList('weekdays_short');
  const titles: Record<Step, string> = {
    location: t('booking.choose_location'), service: t('booking.choose_service'), barber: t('booking.choose_barber'),
    time: t(moving ? 'booking.choose_new_time' : 'booking.choose_time'), confirm: t('booking.confirm_title'), done: '',
  };

  if (step === 'done' && booked) {
    const b = catalog!.barbers.find(x => x.id === booked.barber_id);
    return (
      <Page title={shop.name} to={`/${shop.slug}`}>
        <section className="card stack center">
          <div className="success-mark" aria-hidden>✓</div>
          <h1>{t(moving ? 'booking.moved_title' : 'booking.done_title')}</h1>
          <p className="muted">{t('booking.done_text')}</p>
        </section>
        <section className="card summary">
          <div className="line"><span>{t('booking.when')}</span><span>{fmtDay(sel.date!)} {t('common.at')} {fmtTime(booked.starts_at, tz)}</span></div>
          <div className="line"><span>{t('booking.service')}</span><span>{service?.name}</span></div>
          <div className="line"><span>{t('booking.barber')}</span><span>{b?.name}</span></div>
          <div className="line"><span>{t('booking.where')}</span><span>{[location?.name, location?.address, location?.city].filter(Boolean).join(', ')}</span></div>
          <div className="line"><span>{t('booking.price')}</span><span>{fmtPrice(booked.price)}</span></div>
        </section>
        <Link to="/moji-termini" className="btn btn-primary big block">{t('nav.my_appointments')}</Link>
        <Link to={`/${shop.slug}`} className="btn btn-ghost block">{t('booking.back_to_shop')}</Link>
      </Page>
    );
  }

  return (
    <Page title={shop.name} to={`/${shop.slug}`}>
      <div className="row">
        <button className="icon-btn" onClick={back} aria-label={t('common.back')}>←</button>
        <h1 className="grow">{titles[step]}</h1>
      </div>
      <div className="steps" aria-hidden>{order.map((s, i) => <span key={s} className={i <= index ? 'done' : ''} />)}</div>
      <ErrorNote error={error} />

      {step === 'location' && (
        <div className="list">
          {locations.map(l => (
            <button key={l.id} className={`item ${sel.locationId === l.id ? 'selected' : ''}`} onClick={() => { setSel({ locationId: l.id, serviceId: sel.serviceId }); setStep('service'); }}>
              <span className="grow"><span className="title">{l.name}</span><span className="sub">{[l.address, l.city].filter(Boolean).join(', ')}</span></span>
              <span className="chev" aria-hidden>›</span>
            </button>
          ))}
        </div>
      )}

      {step === 'service' && (
        <div className="list">
          {services.map(s => (
            <button key={s.id} className={`item ${sel.serviceId === s.id ? 'selected' : ''}`} onClick={() => { setSel({ locationId: sel.locationId, serviceId: s.id }); setStep('barber'); }}>
              {s.image_url && <img className="thumb" src={s.image_url} alt="" />}
              <span className="grow"><span className="title">{s.name}</span><span className="sub">{fmtDuration(s.duration_min)}{s.description && ` · ${s.description}`}</span></span>
              <span className="end">{fmtPrice(s.price)}</span>
            </button>
          ))}
        </div>
      )}

      {step === 'barber' && (barbers.length === 0
        ? <Empty title={t('booking.no_barber_title')} text={t('booking.no_barber_text')} />
        : <div className="list">
            <button className={`item ${sel.barberId === ANY ? 'selected' : ''}`} onClick={() => { setSel(s => ({ ...s, barberId: ANY, date: undefined, slot: undefined })); setStep('time'); }}>
              <Avatar name="✂" />
              <span className="grow"><span className="title">{t('booking.any_barber')}</span><span className="sub">{t('booking.any_barber_hint')}</span></span>
              <span className="chev" aria-hidden>›</span>
            </button>
            {barbers.map(b => (
              <button key={b.id} className={`item ${sel.barberId === b.id ? 'selected' : ''}`} onClick={() => { setSel(s => ({ ...s, barberId: b.id, date: undefined, slot: undefined })); setStep('time'); }}>
                <Avatar src={b.photo_url} name={b.name} />
                <span className="grow"><span className="title">{b.name}</span></span>
                <span className="chev" aria-hidden>›</span>
              </button>
            ))}
          </div>)}

      {step === 'time' && (!freeDays ? <Spinner /> : freeDays.length === 0
        ? <Empty title={t('booking.no_days_title')} text={t('booking.no_days_text')} />
        : <>
            <div className="days">
              {days.map(d => (
                <button key={d} className={`day ${sel.date === d ? 'on' : ''}`} disabled={!freeDays.includes(d)} aria-pressed={sel.date === d}
                  onClick={() => setSel(s => ({ ...s, date: d, slot: undefined }))}>
                  <span className="wd">{weekdays[weekdayOf(d)]}</span>
                  <span className="dn">{+d.slice(8)}</span>
                  <span className="mo">{fmtDay(d, { month: 'short' })}</span>
                </button>
              ))}
            </div>
            {sel.date && <h2>{fmtDay(sel.date)}</h2>}
            {!slots ? <Spinner /> : times.length === 0
              ? <Empty title={t('booking.no_slots_title')} text={t('booking.no_slots_text')} />
              : <div className="slots">
                  {times.map(s => (
                    <button key={s} className={`slot ${sel.slot === s ? 'on' : ''}`} onClick={() => { setSel(x => ({ ...x, slot: s })); setStep('confirm'); }}>{fmtTime(s, tz)}</button>
                  ))}
                </div>}
          </>)}

      {step === 'confirm' && <>
        <section className="card summary">
          <div className="line"><span>{t('booking.when')}</span><span>{sel.date && fmtDay(sel.date)} {t('common.at')} {sel.slot && fmtTime(sel.slot, tz)}</span></div>
          <div className="line"><span>{t('booking.service')}</span><span>{service?.name} · {service && fmtDuration(service.duration_min)}</span></div>
          <div className="line"><span>{t('booking.barber')}</span><span>{barber?.name || t('booking.any_barber')}</span></div>
          <div className="line"><span>{t('booking.where')}</span><span>{[location?.name, location?.address, location?.city].filter(Boolean).join(', ')}</span></div>
          <div className="line"><span>{t('booking.price')}</span><span>{service && fmtPrice(service.price)}</span></div>
        </section>
        {authLoading ? <Spinner /> : user
          ? <>
              <p className="muted center">{t('booking.cancel_rule', { hours: shop.cancel_deadline_hours })}</p>
              <Button className="block big" busy={busy} onClick={confirm}>{t(moving ? 'booking.confirm_move' : 'booking.confirm')}</Button>
            </>
          : <>
              <div className="note">{t('booking.login_needed')}</div>
              <AuthPanel initial="signup" returnTo={`/${slug}/rezervacija`} />
            </>}
      </>}
    </Page>
  );
}
