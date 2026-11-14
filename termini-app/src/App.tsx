import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { configured } from './lib/supabase';
import { t } from './lib/i18n';
import Admin from './pages/admin/Admin';
import Account from './pages/customer/Account';
import Booking from './pages/customer/Booking';
import { Landing, Legal, LoginPage, NewPassword, NotFound } from './pages/customer/Misc';
import MyAppointments from './pages/customer/MyAppointments';
import ShopPage from './pages/customer/ShopPage';

export default function App() {
  const { recovery } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // arriving from a "reset password" email
  useEffect(() => { if (recovery) navigate('/novo-geslo', { replace: true }); }, [recovery, navigate]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  if (!configured) return <main className="page"><div className="note note-error">{t('errors.not_configured')}</div></main>;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/prijava" element={<LoginPage initial="login" />} />
      <Route path="/registracija" element={<LoginPage initial="signup" />} />
      <Route path="/novo-geslo" element={<NewPassword />} />
      <Route path="/moji-termini" element={<MyAppointments />} />
      <Route path="/racun" element={<Account />} />
      <Route path="/zasebnost" element={<Legal kind="privacy" />} />
      <Route path="/pogoji" element={<Legal kind="terms" />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="/:slug" element={<ShopPage />} />
      <Route path="/:slug/rezervacija" element={<Booking />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
