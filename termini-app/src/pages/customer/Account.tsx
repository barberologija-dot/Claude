import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { deleteMyAccount, updateProfile } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { t } from '../../lib/i18n';
import { Page, Footer } from '../../components/Layout';
import { Button, ErrorNote, Field, Flash, Sheet, Spinner, Toggle, useFlash } from '../../components/ui';

export default function Account() {
  const { user, profile, shops, loading, refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [flash, setFlash] = useFlash();

  useEffect(() => {
    if (profile) { setName(profile.full_name); setPhone(profile.phone); setNotify(profile.notify_email); }
  }, [profile]);

  if (loading) return <Page><Spinner /></Page>;
  if (!user) return <Navigate to="/prijava?nazaj=/racun" replace />;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await updateProfile(user!.id, { full_name: name.trim(), phone: phone.trim(), notify_email: notify, notify_consent_at: notify ? new Date().toISOString() : null });
      await refresh(); setFlash(t('common.saved'));
    } catch (err) { setError(err); }
    setBusy(false);
  }
  async function remove() {
    setBusy(true); setError(null);
    try { await deleteMyAccount(); await signOut(); navigate('/'); } catch (err) { setError(err); setConfirmDelete(false); }
    setBusy(false);
  }

  return (
    <Page>
      <h1>{t('nav.account')}</h1>
      <form className="card stack" onSubmit={save}>
        <p className="muted">{user.email}</p>
        <Field label={t('auth.name')}><input id="acc-name" type="text" required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label={t('auth.phone')}><input id="acc-phone" type="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} /></Field>
        <Toggle checked={notify} onChange={setNotify} label={t('account.notify')} />
        <p className="muted small">{t('account.notify_hint')}</p>
        <ErrorNote error={error} />
        <Button type="submit" busy={busy} className="block">{t('common.save')}</Button>
      </form>
      {shops.length > 0 && <Link to="/admin" className="btn btn-soft block">{t('account.open_admin')}</Link>}
      <Button variant="ghost" className="block" onClick={async () => { await signOut(); navigate('/'); }}>{t('auth.logout')}</Button>
      <section className="card stack">
        <h2>{t('account.delete_title')}</h2>
        <p className="muted">{t('account.delete_text')}</p>
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>{t('account.delete_button')}</Button>
      </section>
      <Sheet open={confirmDelete} title={t('account.delete_title')} onClose={() => setConfirmDelete(false)}>
        <p>{t('account.delete_confirm')}</p>
        <Button variant="danger" className="block" busy={busy} onClick={remove}>{t('account.delete_yes')}</Button>
        <Button variant="ghost" className="block" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
      </Sheet>
      <Flash msg={flash} />
      <Footer />
    </Page>
  );
}
