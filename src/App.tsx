import { Routes, Route, useNavigate } from 'react-router'

function Frame({ src, title }: { src: string; title: string }) {
  return <iframe src={src} title={title} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0, background: '#fff' }} />
}

function PublicApp() {
  const navigate = useNavigate()
  return (
    <>
      <Frame src="/api/booking-shell" title="حجز الرحلات" />
      <button type="button" onClick={() => navigate('/international')} style={{ position:'fixed', left:18, bottom:78, zIndex:20, border:0, borderRadius:12, padding:'11px 15px', background:'#273142', color:'#fff', fontWeight:800, boxShadow:'0 8px 24px rgba(0,0,0,.18)', cursor:'pointer' }}>
        الرحلات الدولية
      </button>
    </>
  )
}

function AdminApp() {
  const navigate = useNavigate()
  return (
    <>
      <Frame src="/api/admin-shell" title="لوحة التحكم" />
      <div style={{ position:'fixed', left:18, bottom:18, zIndex:20, display:'flex', gap:8, flexWrap:'wrap' }}>
        <button type="button" onClick={() => navigate('/admin-locations')} style={{ border:0,borderRadius:12,padding:'12px 16px',background:'#b58a24',color:'#fff',fontWeight:800,boxShadow:'0 8px 24px rgba(0,0,0,.18)',cursor:'pointer' }}>المدن والمسارات</button>
        <button type="button" onClick={() => navigate('/admin-commerce')} style={{ border:0,borderRadius:12,padding:'12px 16px',background:'#273142',color:'#fff',fontWeight:800,boxShadow:'0 8px 24px rgba(0,0,0,.18)',cursor:'pointer' }}>التسعير والرحلات الدولية</button>
        <button type="button" onClick={() => navigate('/admin-pricing-rules')} style={{ border:0,borderRadius:12,padding:'12px 16px',background:'#5c6470',color:'#fff',fontWeight:800,boxShadow:'0 8px 24px rgba(0,0,0,.18)',cursor:'pointer' }}>قواعد الأسعار المتقدمة</button>
      </div>
    </>
  )
}

const AdminLocationsApp=()=> <Frame src="/api/admin-locations" title="إدارة المدن والمسارات" />
const AdminCommerceApp=()=> <Frame src="/api/admin-commerce" title="إدارة التسعير والرحلات الدولية" />
const AdminPricingRulesApp=()=> <Frame src="/api/admin-pricing-rules" title="قواعد الأسعار المتقدمة" />
const InternationalApp=()=> <Frame src="/api/international-booking" title="الرحلات الدولية" />
const InstallApp=()=> <Frame src="/api/admin-install-shell" title="تثبيت لوحة التحكم" />

export default function App() {
  return <Routes>
    <Route path="/install" element={<InstallApp />} />
    <Route path="/admin-login" element={<AdminApp />} />
    <Route path="/admin" element={<AdminApp />} />
    <Route path="/admin-locations" element={<AdminLocationsApp />} />
    <Route path="/admin-commerce" element={<AdminCommerceApp />} />
    <Route path="/admin-pricing-rules" element={<AdminPricingRulesApp />} />
    <Route path="/international" element={<InternationalApp />} />
    <Route path="*" element={<PublicApp />} />
  </Routes>
}
