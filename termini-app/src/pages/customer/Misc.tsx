import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { t } from '../../lib/i18n';
import { AuthPanel } from '../../components/AuthPanel';
import { Footer, Page } from '../../components/Layout';
import { Button, ErrorNote, Field, Spinner } from '../../components/ui';

/** Start page of the platform (not a shop). */
export function Landing() {
  const { shops } = useAuth();
  return (
    <Page>
      <section className="card stack">
        <h1>{t('landing.title')}</h1>
        <p className="muted">{t('landing.text')}</p>
        <Link to="/admin" className="btn btn-primary big block">{t(shops.length ? 'account.open_admin' : 'landing.register_shop')}</Link>
      </section>
      <section className="card stack-sm">
        <h2>{t('landing.customer_title')}</h2>
        <p className="muted">{t('landing.customer_text')}</p>
        <Link to="/moji-termini" className="btn btn-soft block">{t('nav.my_appointments')}</Link>
      </section>
      <Footer />
    </Page>
  );
}

/** Only allow returning to pages of this app. */
const safeBack = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/moji-termini');

export function LoginPage({ initial }: { initial: 'login' | 'signup' }) {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const back = safeBack(params.get('nazaj'));
  if (loading) return <Page><Spinner /></Page>;
  if (user) return <Navigate to={back} replace />;
  return <Page><h1>{t(initial === 'login' ? 'auth.login' : 'auth.signup')}</h1><AuthPanel initial={initial} returnTo={back} /><Footer /></Page>;
}

/** Opened from the "reset password" email. */
export function NewPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError(t('errors.weak_password')); return; }
    setBusy(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error); else navigate('/moji-termini');
  }
  if (loading) return <Page><Spinner /></Page>;
  if (!user) return <Page><div className="note note-error">{t('auth.reset_link_invalid')}</div><Link to="/prijava" className="btn btn-primary block">{t('auth.login')}</Link></Page>;
  return (
    <Page>
      <h1>{t('auth.new_password_title')}</h1>
      <form className="card stack" onSubmit={submit}>
        <Field label={t('auth.new_password')} hint={t('auth.password_hint')}>
          <input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
        </Field>
        <ErrorNote error={error} />
        <Button type="submit" busy={busy} className="block big">{t('common.save')}</Button>
      </form>
    </Page>
  );
}

export function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  return (
    <Page>
      <h1>{t(`legal.${kind}_title`)}</h1>
      <section className="card legal">{t(`legal.${kind}_text`)}</section>
      <Footer />
    </Page>
  );
}

export function NotFound() {
  return <Page><div className="empty"><b>{t('shop.not_found_title')}</b><Link to="/">{t('common.home')}</Link></div></Page>;
}
