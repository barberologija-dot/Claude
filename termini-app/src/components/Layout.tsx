import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { t } from '../lib/i18n';

/** Top bar used on all customer pages. */
export function TopBar({ title, to = '/' }: { title?: string; to?: string }) {
  const { user, loading } = useAuth();
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link to={to} className="brand grow">{title || t('app.name')}</Link>
        {!loading && (user
          ? <>
              <Link className="link" to="/moji-termini">{t('nav.my_appointments')}</Link>
              <Link className="link" to="/racun" aria-label={t('nav.account')}>👤</Link>
            </>
          : <Link className="link primary" to={`/prijava?nazaj=${encodeURIComponent(location.pathname + location.search)}`}>{t('auth.login')}</Link>)}
      </div>
    </header>
  );
}

export function Page({ title, to, children, wide }: { title?: string; to?: string; children: ReactNode; wide?: boolean }) {
  return (
    <>
      <TopBar title={title} to={to} />
      <main className={`page ${wide ? 'wide' : ''}`}>{children}</main>
    </>
  );
}

export function Footer() {
  return (
    <p className="muted small center" style={{ marginTop: 12 }}>
      <span><Link to="/zasebnost">{t('auth.privacy_title')}</Link> · <Link to="/pogoji">{t('auth.terms_title')}</Link></span>
    </p>
  );
}
