import { createContext, useCallback, useContext, useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { getCatalog, getSchedule, registerShop } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { t } from '../../lib/i18n';
import type { BarberHours, Catalog, DayOff, LocationBreak, Shop } from '../../lib/types';
import { AuthPanel } from '../../components/AuthPanel';
import { Footer, Page } from '../../components/Layout';
import { Button, ErrorNote, Field, Spinner } from '../../components/ui';
import AdminCalendar from './Calendar';
import { AdminBarbers, AdminLocations, AdminServices } from './Manage';
import AdminSettings from './Settings';

export type Schedule = { breaks: LocationBreak[]; daysOff: DayOff[]; barberHours: BarberHours[] };
type AdminState = { shop: Shop; catalog: Catalog; schedule: Schedule; reload: () => Promise<void> };
const Ctx = createContext<AdminState>(null as unknown as AdminState);
export const useAdmin = () => useContext(Ctx);

/** "Brivnica Pri Žigu" -> "brivnica-pri-zigu" */
export function slugify(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

function RegisterShop() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const link = touched ? slug : slugify(name);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await registerShop(name.trim(), link, phone.trim(), user?.email || ''); await refresh(); } catch (err) { setError(err); }
    setBusy(false);
  }
  return (
    <Page title={t('admin.title')} to="/admin">
      <h1>{t('admin.register_title')}</h1>
      <p className="muted">{t('admin.register_text')}</p>
      <form className="card stack" onSubmit={submit}>
        <Field label={t('admin.shop_name')}><input id="shop-name" type="text" required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label={t('admin.shop_link')} hint={`${location.host}/${link || '…'}`}>
          <input id="shop-slug" type="text" required minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9\-]+[a-z0-9]" autoCapitalize="none" value={link}
            onChange={e => { setTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} />
        </Field>
        <Field label={t('admin.shop_phone')}><input id="shop-phone" type="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} /></Field>
        <ErrorNote error={error} />
        <Button type="submit" busy={busy} className="block big">{t('admin.register_button')}</Button>
      </form>
    </Page>
  );
}

export default function Admin() {
  const { user, loading, shops } = useAuth();
  const [shopId, setShopId] = useState<string | null>(() => { try { return localStorage.getItem('admin:shop'); } catch { return null; } });
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState<unknown>(null);
  const shop = shops.find(s => s.id === shopId) || shops[0];

  const reload = useCallback(async () => {
    if (!shop) return;
    try {
      const [c, s] = await Promise.all([getCatalog(shop.id), getSchedule(shop.id)]);
      setCatalog(c); setSchedule(s); setError(null);
    } catch (e) { setError(e); }
  }, [shop?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setCatalog(null); reload(); }, [reload]);

  if (loading) return <Page title={t('admin.title')}><Spinner /></Page>;
  if (!user) {
    return (
      <Page title={t('admin.title')} to="/admin">
        <h1>{t('admin.login_title')}</h1>
        <p className="muted">{t('admin.login_text')}</p>
        <AuthPanel admin returnTo="/admin" />
        <Footer />
      </Page>
    );
  }
  if (!shop) return <RegisterShop />;

  const tabs = [
    { to: '/admin', end: true, ico: '📅', label: t('admin.tab_calendar') },
    { to: '/admin/storitve', ico: '✂️', label: t('admin.tab_services') },
    { to: '/admin/brivci', ico: '🧔', label: t('admin.tab_barbers') },
    { to: '/admin/lokacije', ico: '📍', label: t('admin.tab_locations') },
    { to: '/admin/nastavitve', ico: '⚙️', label: t('admin.tab_settings') },
  ];

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          {shops.length > 1
            ? <select aria-label={t('admin.switch_shop')} className="grow" value={shop.id} onChange={e => { setShopId(e.target.value); try { localStorage.setItem('admin:shop', e.target.value); } catch { /* ignore */ } }}>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            : <span className="brand grow">{shop.name}</span>}
          <Link className="link" to={`/${shop.slug}`} target="_blank">{t('admin.view_page')} ↗</Link>
        </div>
      </header>
      <main className="page wide admin-page">
        {!shop.active && <div className="note note-error">{t('admin.deactivated')}</div>}
        <ErrorNote error={error} />
        {!catalog || !schedule ? <Spinner /> : (
          <Ctx.Provider value={{ shop, catalog, schedule, reload }}>
            <Routes>
              <Route index element={<AdminCalendar />} />
              <Route path="storitve" element={<AdminServices />} />
              <Route path="brivci" element={<AdminBarbers />} />
              <Route path="lokacije" element={<AdminLocations />} />
              <Route path="nastavitve" element={<AdminSettings />} />
            </Routes>
          </Ctx.Provider>
        )}
      </main>
      <nav className="tabbar" aria-label={t('admin.title')}>
        <div className="tabbar-in">
          {tabs.map(x => <NavLink key={x.to} to={x.to} end={x.end}><span className="ico" aria-hidden>{x.ico}</span>{x.label}</NavLink>)}
        </div>
      </nav>
    </>
  );
}
