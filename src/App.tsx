import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ServicesPage from './pages/ServicesPage'
import FleetPage from './pages/FleetPage'
import DestinationsPage from './pages/DestinationsPage'
import TestimonialsPage from './pages/TestimonialsPage'
import FaqPage from './pages/FaqPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/fleet" element={<FleetPage />} />
      <Route path="/destinations" element={<DestinationsPage />} />
      <Route path="/testimonials" element={<TestimonialsPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
