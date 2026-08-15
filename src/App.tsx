import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Install from './pages/Install'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Home />} />
      <Route path="/services" element={<Home />} />
      <Route path="/fleet" element={<Home />} />
      <Route path="/destinations" element={<Home />} />
      <Route path="/testimonials" element={<Home />} />
      <Route path="/faq" element={<Home />} />
      <Route path="/install" element={<Install />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
