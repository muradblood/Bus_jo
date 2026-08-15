import { Routes, Route } from 'react-router'

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
  return <Frame src="/api/admin-shell" title="لوحة التحكم" />
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
      <Route path="*" element={<PublicApp />} />
    </Routes>
  )
}
