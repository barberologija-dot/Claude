import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { cancelMyAppointment, getMyAppointments, type MyAppointment } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { t } from '../../lib/i18n';
import { fmtDateTime, fmtPrice } from '../../lib/time';
import { Page } from '../../components/Layout';
import { Button, Empty, ErrorNote, Sheet, Spinner } from '../../components/ui';

export default function MyAppointments() {
  const { user, loading } = useAuth();
  const [list, setList] = useState<MyAppointment[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [toCancel, setToCancel] = useState<MyAppointment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (user) getMyAppointments(user.id).then(setList).catch(setError);
  }, [user]);
  useEffect(load, [load]);

  if (loading) return <Page><Spinner /></Page>;
  if (!user) return <Navigate to="/prijava?nazaj=/moji-termini" replace />;

  const now = Date.now();
  const upcoming = (list || []).filter(a => a.status === 'booked' && new Date(a.ends_at).getTime() > now).reverse();
  const past = (list || []).filter(a => !upcoming.includes(a));
  const canChange = (a: MyAppointment) => new Date(a.starts_at).getTime() - (a.shop?.cancel_deadline_hours ?? 0) * 3600_000 > now;

  async function doCancel() {
    if (!toCancel) return;
    setBusy(true); setError(null);
    try { await cancelMyAppointment(toCancel.id); setToCancel(null); load(); } catch (e) { setError(e); setToCancel(null); }
    setBusy(false);
  }

  const card = (a: MyAppointment, active: boolean) => (
    <div className="card stack-sm" key={a.id}>
      <div className="row between">
        <b>{fmtDateTime(a.starts_at, a.location?.timezone)}</b>
        {!active && <span className={`badge ${a.status === 'cancelled' || a.status === 'no_show' ? 'red' : 'grey'}`}>{t(`status.${a.status}`)}</span>}
      </div>
      <span>{a.service?.name} · {a.barber?.name} · {fmtPrice(a.price)}</span>
      <span className="muted">{a.shop?.name}{a.location && ` · ${[a.location.address, a.location.city].filter(Boolean).join(', ')}`}</span>
      {active && (canChange(a)
        ? <div className="row" style={{ marginTop: 6 }}>
            <Link className="btn btn-soft grow" to={`/${a.shop?.slug}/rezervacija?prestavi=${a.id}`}>{t('my.move')}</Link>
            <Button variant="ghost" className="grow" onClick={() => setToCancel(a)}>{t('my.cancel')}</Button>
          </div>
        : <span className="muted small">{t('my.too_late', { hours: a.shop?.cancel_deadline_hours ?? 0, phone: a.shop?.phone || '' })}</span>)}
      {!active && a.shop && <Link className="link-btn" to={`/${a.shop.slug}/rezervacija?storitev=${a.service_id}`}>{t('my.book_again')}</Link>}
    </div>
  );

  return (
    <Page>
      <h1>{t('nav.my_appointments')}</h1>
      <ErrorNote error={error} />
      {!list ? <Spinner /> : <>
        {upcoming.length === 0 ? <Empty title={t('my.none_title')} text={t('my.none_text')} /> : upcoming.map(a => card(a, true))}
        {past.length > 0 && <><h2 style={{ marginTop: 8 }}>{t('my.past')}</h2>{past.map(a => card(a, false))}</>}
      </>}
      <Sheet open={!!toCancel} title={t('my.cancel_title')} onClose={() => setToCancel(null)}>
        <p>{toCancel && `${toCancel.service?.name}, ${fmtDateTime(toCancel.starts_at, toCancel.location?.timezone)}`}</p>
        <Button variant="danger" className="block" busy={busy} onClick={doCancel}>{t('my.cancel_yes')}</Button>
        <Button variant="ghost" className="block" onClick={() => setToCancel(null)}>{t('my.cancel_no')}</Button>
      </Sheet>
    </Page>
  );
}
