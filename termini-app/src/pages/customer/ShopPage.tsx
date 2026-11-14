import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCatalog, getShopBySlug } from '../../lib/api';
import { t, tList } from '../../lib/i18n';
import { fmtDuration, fmtPrice, hhmm } from '../../lib/time';
import type { Catalog, Shop } from '../../lib/types';
import { Footer, Page } from '../../components/Layout';
import { Empty, ErrorNote, Spinner } from '../../components/ui';

export function useShop(slug?: string) {
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let alive = true;
    setShop(undefined); setCatalog(null); setError(null);
    (async () => {
      try {
        const s = await getShopBySlug(slug || '');
        if (!alive) return;
        setShop(s);
        if (s) { const c = await getCatalog(s.id); if (alive) setCatalog(c); }
      } catch (e) { if (alive) { setError(e); setShop(null); } }
    })();
    return () => { alive = false; };
  }, [slug]);
  return { shop, catalog, error };
}

const WEEK = [1, 2, 3, 4, 5, 6, 0];

export default function ShopPage() {
  const { slug } = useParams();
  const { shop, catalog, error } = useShop(slug);

  if (shop === undefined) return <Page><Spinner /></Page>;
  if (!shop) return <Page><ErrorNote error={error} /><Empty title={t('shop.not_found_title')} text={t('shop.not_found_text')} /></Page>;

  const services = catalog?.services.filter(s => s.active) || [];
  const locations = catalog?.locations.filter(l => l.active) || [];
  const days = tList('weekdays_short');
  const ready = services.length > 0 && locations.length > 0 && (catalog?.barbers.some(b => b.active) ?? false);

  return (
    <Page title={shop.name} to={`/${shop.slug}`}>
      <section className="card stack center">
        {shop.logo_url && <img className="logo" src={shop.logo_url} alt="" />}
        <h1>{shop.name}</h1>
        {shop.description && <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{shop.description}</p>}
        {(shop.phone || shop.email) && (
          <p className="muted">
            {shop.phone && <a href={`tel:${shop.phone.replace(/\s/g, '')}`}>{shop.phone}</a>}
            {shop.phone && shop.email && ' · '}
            {shop.email && <a href={`mailto:${shop.email}`}>{shop.email}</a>}
          </p>
        )}
      </section>

      {!catalog ? <Spinner /> : !ready ? <Empty title={t('shop.not_ready_title')} text={t('shop.not_ready_text')} /> : <>
        <Link to={`/${shop.slug}/rezervacija`} className="btn btn-primary big block">{t('shop.book')}</Link>

        <section className="stack-sm">
          <h2>{t('shop.services')}</h2>
          <div className="list">
            {services.map(s => (
              <Link key={s.id} className="item" to={`/${shop.slug}/rezervacija?storitev=${s.id}`}>
                {s.image_url && <img className="thumb" src={s.image_url} alt="" />}
                <span className="grow"><span className="title">{s.name}</span><span className="sub">{fmtDuration(s.duration_min)}</span></span>
                <span className="end">{fmtPrice(s.price)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="stack-sm">
          <h2>{t(locations.length > 1 ? 'shop.locations' : 'shop.location')}</h2>
          {locations.map(l => {
            const hours = catalog.hours.filter(h => h.location_id === l.id);
            return (
              <div className="card stack-sm" key={l.id}>
                <b>{l.name}</b>
                <span className="muted">{[l.address, l.city].filter(Boolean).join(', ')}{l.phone && ` · ${l.phone}`}</span>
                <div className="small" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 14px' }}>
                  {WEEK.map(d => {
                    const h = hours.find(x => x.weekday === d);
                    return [<span key={d} className="muted">{days[d]}</span>, <span key={d + 'h'}>{h ? `${hhmm(h.opens)}–${hhmm(h.closes)}` : t('shop.closed')}</span>];
                  })}
                </div>
              </div>
            );
          })}
        </section>
      </>}
      <Footer />
    </Page>
  );
}
