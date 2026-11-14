import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { t } from '../lib/i18n';
import { errKey, uploadImage } from '../lib/api';

export function Button({ variant = 'primary', busy, children, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft'; busy?: boolean }) {
  return (
    <button {...rest} disabled={rest.disabled || busy} className={`btn btn-${variant} ${className}`}>
      {busy ? <span className="spinner small" aria-hidden /> : children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export const Spinner = () => <div className="center pad"><span className="spinner" role="status" aria-label={t('common.loading')} /></div>;

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <div className="note note-error" role="alert">{typeof error === 'string' ? error : t(errKey(error))}</div>;
}

export function Empty({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return <div className="empty"><b>{title}</b>{text && <p>{text}</p>}{children}</div>;
}

/** Panel that slides up from the bottom of the screen. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

export function Avatar({ src, name, size = 48 }: { src?: string | null; name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  return src
    ? <img className="avatar" src={src} alt="" style={{ width: size, height: size }} />
    : <span className="avatar avatar-text" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>{initials || '?'}</span>;
}

/** Choose a photo; it is shrunk and uploaded straight away. */
export function ImagePicker({ shopId, value, onChange, label, round }:
  { shopId: string; value: string | null; onChange: (url: string | null) => void; label: string; round?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true); setError(null);
    try { onChange(await uploadImage(shopId, file)); } catch (e) { setError(e); }
    setBusy(false);
  }
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="image-picker">
        {value
          ? <img src={value} alt="" className={round ? 'round' : ''} />
          : <div className={`image-empty ${round ? 'round' : ''}`} aria-hidden>＋</div>}
        <div className="row">
          <Button type="button" variant="soft" busy={busy} onClick={() => input.current?.click()}>{value ? t('common.change_photo') : t('common.add_photo')}</Button>
          {value && <Button type="button" variant="ghost" onClick={() => onChange(null)}>{t('common.remove')}</Button>}
        </div>
        <input ref={input} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <ErrorNote error={error} />
    </div>
  );
}

/** Small "saved" message that disappears by itself. */
export function useFlash(): [string, (msg: string) => void] {
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const id = setTimeout(() => setMsg(''), 2500); return () => clearTimeout(id); }, [msg]);
  return [msg, setMsg];
}
export const Flash = ({ msg }: { msg: string }) => (msg ? <div className="flash" role="status">{msg}</div> : null);
