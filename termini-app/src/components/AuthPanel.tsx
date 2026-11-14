import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { t } from '../lib/i18n';
import { Button, ErrorNote, Field } from './ui';

const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** Invisible "are you human" check (Cloudflare Turnstile). Only shown when a site key is configured. */
function Captcha({ onToken }: { onToken: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!TURNSTILE_KEY) return;
    const w = window as unknown as { turnstile?: { render: (el: HTMLElement, o: object) => void } };
    const render = () => box.current && w.turnstile?.render(box.current, { sitekey: TURNSTILE_KEY, callback: onToken });
    if (w.turnstile) { render(); return; }
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.onload = render;
    document.head.appendChild(s);
  }, [onToken]);
  return TURNSTILE_KEY ? <div ref={box} /> : null;
}

type Mode = 'login' | 'signup' | 'forgot' | 'sent' | 'reset-sent';

/**
 * Log in / sign up. After sign-up the person must click the link in the
 * verification email; that link brings them back to `returnTo`.
 */
export function AuthPanel({ initial = 'login', returnTo, admin }: { initial?: 'login' | 'signup'; returnTo?: string; admin?: boolean }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [terms, setTerms] = useState(false);
  const [notify, setNotify] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const back = `${location.origin}${returnTo || location.pathname + location.search}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === 'signup' && !terms) { setError(t('auth.terms_required')); return; }
    if (mode === 'signup' && password.length < 8) { setError(t('errors.weak_password')); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captcha || undefined } });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: back, captchaToken: captcha || undefined, data: { full_name: name.trim(), phone: phone.trim(), notify_email: notify } },
        });
        if (error) throw error;
        // an address that already has an account comes back without identities
        if (data.user && data.user.identities?.length === 0) { setError(t('auth.already_registered')); setMode('login'); }
        else if (!data.session) setMode('sent');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/novo-geslo`, captchaToken: captcha || undefined });
        if (error) throw error;
        setMode('reset-sent');
      }
    } catch (err) { setError(err); }
    setBusy(false);
  }

  async function resend() {
    setBusy(true); setError(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: back } });
    if (error) setError(error);
    setBusy(false);
  }

  if (mode === 'sent' || mode === 'reset-sent') {
    return (
      <div className="card stack center">
        <div className="success-mark" aria-hidden>✉</div>
        <h2>{t(mode === 'sent' ? 'auth.check_email_title' : 'auth.reset_sent_title')}</h2>
        <p className="muted">{t(mode === 'sent' ? 'auth.check_email_text' : 'auth.reset_sent_text', { email })}</p>
        <ErrorNote error={error} />
        {mode === 'sent' && <Button variant="ghost" busy={busy} onClick={resend}>{t('auth.resend')}</Button>}
        <button className="link-btn" onClick={() => setMode('login')}>{t('auth.back_to_login')}</button>
      </div>
    );
  }

  return (
    <form className="card stack" onSubmit={submit}>
      {mode !== 'forgot' && (
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError(null); }}>{t('auth.login')}</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setError(null); }}>{t('auth.signup')}</button>
        </div>
      )}
      {mode === 'forgot' && <><h2>{t('auth.forgot_title')}</h2><p className="muted">{t('auth.forgot_text')}</p></>}
      {mode === 'signup' && <p className="muted">{t(admin ? 'auth.signup_intro_admin' : 'auth.signup_intro')}</p>}

      {mode === 'signup' && <>
        <Field label={t('auth.name')}><input id="auth-name" type="text" required maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label={t('auth.phone')}><input id="auth-phone" type="tel" required maxLength={30} autoComplete="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
      </>}
      <Field label={t('auth.email')}><input id="auth-email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
      {mode !== 'forgot' && (
        <Field label={t('auth.password')} hint={mode === 'signup' ? t('auth.password_hint') : undefined}>
          <input id="auth-password" type="password" required minLength={mode === 'signup' ? 8 : 1} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} />
        </Field>
      )}
      {mode === 'signup' && <>
        <label className="check">
          <input id="auth-terms" type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />
          <span>{t('auth.accept_1')} <Link to="/pogoji" target="_blank">{t('auth.terms')}</Link> {t('auth.accept_2')} <Link to="/zasebnost" target="_blank">{t('auth.privacy')}</Link>.</span>
        </label>
        <label className="check">
          <input id="auth-notify" type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
          <span>{t('auth.notify_consent')}</span>
        </label>
      </>}
      <Captcha onToken={setCaptcha} />
      <ErrorNote error={error} />
      <Button type="submit" busy={busy} className="block big">{t(mode === 'login' ? 'auth.login' : mode === 'signup' ? 'auth.create_account' : 'auth.send_reset')}</Button>
      {mode === 'login' && <button type="button" className="link-btn" onClick={() => { setMode('forgot'); setError(null); }}>{t('auth.forgot_link')}</button>}
      {mode === 'forgot' && <button type="button" className="link-btn" onClick={() => setMode('login')}>{t('auth.back_to_login')}</button>}
    </form>
  );
}
