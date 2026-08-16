import { Routes, Route } from 'react-router'

function Frame({ src, title }: { src: string; title: string }) {
  return <iframe src={src} title={title} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0, background: '#fff' }} />
}

const PublicApp=()=> <Frame src="/api/booking-shell" title="حجز الرحلات" />
const AdminApp=()=> <Frame src="/api/admin-shell" title="لوحة التحكم" />
const AdminLocationsApp=()=> <Frame src="/api/admin-locations" title="إدارة المدن والمسارات" />
const AdminCommerceApp=()=> <Frame src="/api/admin-commerce" title="إدارة التسعير" />
const AdminPricingRulesApp=()=> <Frame src="/api/admin-pricing-rules" title="قواعد الأسعار المتقدمة" />
const AdminPricingPreviewApp=()=> <Frame src="/api/admin-pricing-preview" title="معاينة السعر قبل الحفظ" />
const AdminInternationalApp=()=> <Frame src="/api/admin-international" title="إدارة الرحلات الدولية" />
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
    <Route path="/admin-pricing-preview" element={<AdminPricingPreviewApp />} />
    <Route path="/admin-international" element={<AdminInternationalApp />} />
    <Route path="/international" element={<InternationalApp />} />
    <Route path="*" element={<PublicApp />} />
  </Routes>
}
