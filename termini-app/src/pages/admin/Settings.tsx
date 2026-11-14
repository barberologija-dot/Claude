import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateRow } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { t } from '../../lib/i18n';
import { Button, ErrorNote, Field, Flash, ImagePicker, useFlash } from '../../components/ui';
import { useAdmin } from './Admin';

export default function AdminSettings() {
  const { shop } = useAdmin();
  const { refresh, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ ...shop });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [flash, setFlash] = useFlash();
  const set = (patch: Partial<typeof f>) => setF(x => ({ ...x, ...patch }));
  const link = `${location.origin}/${shop.slug}`;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await updateRow('shops', shop.id, {
        name: f.name.trim(), description: f.description, logo_url: f.logo_url, phone: f.phone, email: f.email,
        max_days_ahead: f.max_days_ahead, min_notice_minutes: f.min_notice_minutes,
        cancel_deadline_hours: f.cancel_deadline_hours, slot_minutes: f.slot_minutes,
      });
      await refresh(); setFlash(t('common.saved'));
    } catch (err) { setError(err); }
    setBusy(false);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(link); setFlash(t('admin.link_copied')); } catch { /* the link is visible and can be selected */ }
  }

  return (
    <>
      <h1>{t('admin.tab_settings')}</h1>
      <section className="card stack">
        <h2>{t('admin.public_link')}</h2>
        <p className="muted">{t('admin.public_link_text')}</p>
        <div className="note" style={{ wordBreak: 'break-all', userSelect: 'all' }}>{link}</div>
        <Button variant="soft" onClick={copy}>{t('admin.copy_link')}</Button>
      </section>

      {/* Reserved for later: "Shop" button and banner for barbers (links to the webshop). Never shown to customers. */}

      <form className="stack" onSubmit={save}>
        <section className="card stack">
          <h2>{t('admin.profile')}</h2>
          <ImagePicker shopId={shop.id} value={f.logo_url} onChange={logo_url => set({ logo_url })} label={t('admin.logo')} />
          <Field label={t('admin.shop_name')}><input id="set-name" type="text" required minLength={2} maxLength={80} value={f.name} onChange={e => set({ name: e.target.value })} /></Field>
          <Field label={t('admin.description')}><textarea id="set-desc" maxLength={1000} value={f.description} onChange={e => set({ description: e.target.value })} /></Field>
          <Field label={t('admin.shop_phone')}><input id="set-phone" type="tel" maxLength={30} value={f.phone} onChange={e => set({ phone: e.target.value })} /></Field>
          <Field label={t('admin.shop_email')}><input id="set-email" type="email" maxLength={120} value={f.email} onChange={e => set({ email: e.target.value })} /></Field>
        </section>
        <section className="card stack">
          <h2>{t('admin.rules')}</h2>
          <Field label={t('admin.rule_ahead')} hint={t('admin.rule_ahead_hint')}>
            <select id="set-ahead" value={f.max_days_ahead} onChange={e => set({ max_days_ahead: +e.target.value })}>
              {[7, 14, 21, 30, 45, 60, 90].map(d => <option key={d} value={d}>{t('admin.n_days', { n: d })}</option>)}
            </select>
          </Field>
          <Field label={t('admin.rule_notice')} hint={t('admin.rule_notice_hint')}>
            <select id="set-notice" value={f.min_notice_minutes} onChange={e => set({ min_notice_minutes: +e.target.value })}>
              {[0, 30, 60, 120, 180, 360, 720, 1440].map(m => <option key={m} value={m}>{m === 0 ? t('admin.no_limit') : m < 60 ? t('admin.n_minutes', { n: m }) : t('admin.n_hours', { n: m / 60 })}</option>)}
            </select>
          </Field>
          <Field label={t('admin.rule_cancel')} hint={t('admin.rule_cancel_hint')}>
            <select id="set-cancel" value={f.cancel_deadline_hours} onChange={e => set({ cancel_deadline_hours: +e.target.value })}>
              {[0, 1, 2, 3, 6, 12, 24, 48].map(h => <option key={h} value={h}>{h === 0 ? t('admin.no_limit') : t('admin.n_hours', { n: h })}</option>)}
            </select>
          </Field>
          <Field label={t('admin.rule_grid')} hint={t('admin.rule_grid_hint')}>
            <select id="set-grid" value={f.slot_minutes} onChange={e => set({ slot_minutes: +e.target.value })}>
              {[10, 15, 20, 30, 60].map(m => <option key={m} value={m}>{t('admin.n_minutes', { n: m })}</option>)}
            </select>
          </Field>
        </section>
        <ErrorNote error={error} />
        <Button type="submit" busy={busy} className="block big">{t('common.save')}</Button>
      </form>

      <section className="card stack">
        <p className="muted">{t('admin.logged_in_as', { email: user?.email || '' })}</p>
        <Button variant="ghost" onClick={async () => { await signOut(); navigate('/admin'); }}>{t('auth.logout')}</Button>
      </section>
      <Flash msg={flash} />
    </>
  );
}
