import React from 'react';

const Home: React.FC = () => {
  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', overflow: 'hidden', background: '#fff' }} dir="rtl" lang="ar">
      <iframe
        src="/api/booking-shell"
        title="سات | حجز الرحلات"
        style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#fff' }}
        allow="clipboard-write; geolocation"
      />
    </div>
  );
};

export default Home;
