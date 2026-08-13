import React, { useState, useEffect } from 'react';

const CookieConsentBanner: React.FC = () => {
  const [consent, setConsent] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cookie-consent');
    if (stored) {
      setConsent(stored);
    } else {
      // Delay showing the banner
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setConsent('accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setConsent('declined');
    setIsVisible(false);
  };

  if (consent || !isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[200] max-w-[420px] animate-fade-up">
      <div className="bg-charcoal rounded-xl p-5 shadow-dropdown">
        <p className="text-sm text-white/80 mb-4 leading-relaxed">
          نستخدم ملفات تعريف الارتباط لتحسين تجربتك. باستخدامك للموقع، فإنك
          توافق على{' '}
          <a href="/#privacy" className="text-brand-gold hover:underline">
            سياسة الخصوصية
          </a>
          .
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDecline}
            className="px-5 py-2 border border-white/10 text-white/80 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
          >
            رفض
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2 gold-gradient text-white rounded-lg text-sm font-semibold shadow-button hover:shadow-button-hover transition-all"
          >
            قبول
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
