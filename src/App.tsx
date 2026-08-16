import { Routes, Route, useNavigate } from 'react-router'

function Frame({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      title={title}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0, background: '#fff' }}
    />
  )
}

function PublicApp() {
  return <Frame src="/api/booking-shell" title="حجز الرحلات" />
}

function AdminApp() {
  const navigate = useNavigate()
  return (
    <>
      <Frame src="/api/admin-shell" title="لوحة التحكم" />
      <button
        type="button"
        onClick={() => navigate('/admin-locations')}
        style={{
          position: 'fixed', left: 18, bottom: 18, zIndex: 20,
          border: 0, borderRadius: 12, padding: '12px 16px',
          background: '#b58a24', color: '#fff', fontWeight: 800,
          boxShadow: '0 8px 24px rgba(0,0,0,.18)', cursor: 'pointer',
        }}
      >
        المدن والمسارات
      </button>
    </>
  )
}

function AdminLocationsApp() {
  return <Frame src="/api/admin-locations" title="إدارة المدن والمسارات" />
}

function InstallApp() {
  return <Frame src="/api/admin-install-shell" title="تثبيت لوحة التحكم" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/install" element={<InstallApp />} />
      <Route path="/admin-login" element={<AdminApp />} />
      <Route path="/admin" element={<AdminApp />} />
      <Route path="/admin-locations" element={<AdminLocationsApp />} />
      <Route path="*" element={<PublicApp />} />
    </Routes>
  )
}
