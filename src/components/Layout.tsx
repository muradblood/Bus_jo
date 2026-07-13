import React from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';
import Footer from './Footer';
import CookieConsentBanner from './CookieConsentBanner';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'الرئيسية', href: '/', active: location.pathname === '/' },
    { label: 'خدماتنا', href: '/services', active: location.pathname === '/services' },
    { label: 'أسطولنا', href: '/fleet', active: location.pathname === '/fleet' },
    { label: 'الوجهات', href: '/destinations', active: location.pathname === '/destinations' },
    { label: 'الأسئلة الشائعة', href: '/faq', active: location.pathname === '/faq' },
  ];

  return (
    <div className="min-h-screen bg-surface-alt" dir="rtl" lang="ar">
      {/* ═══ HEADER ═══ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-[#E5E0D5]">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-[68px]">
            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 ${
                    link.active
                      ? 'text-brand-gold bg-brand-gold/10'
                      : 'text-charcoal hover:text-brand-gold hover:bg-brand-gold/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="hidden lg:flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border border-[#E5E0D5] text-charcoal hover:border-brand-gold">
                <img src="https://flagcdn.com/w20/sa.png" alt="KSA" className="w-5 h-auto rounded" />
                العربية
              </button>
              <Link to="/login" className="text-sm font-bold text-white bg-brand-gold hover:bg-brand-gold-dark px-6 py-2.5 rounded-full transition-all shadow-lg hover:shadow-xl">
                تسجيل الدخول
              </Link>
            </div>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src="/sat-logo.png" alt="سابتكو ألسا للنقل" className="h-10 w-auto object-contain" />
            </Link>

            {/* Mobile Hamburger */}
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 rounded-full text-brand-gold">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[68px]" />

      {/* Page Content */}
      <main>{children}</main>

      {/* Footer */}
      <Footer />
      <CookieConsentBanner />

      {/* Mobile Menu */}
      <div className={`fixed inset-0 z-[60] transition-all duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-[300px] bg-white shadow-2xl transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-5 border-b border-[#E5E0D5]">
            <img src="/sat-logo.png" alt="سات" className="h-10 w-auto object-contain" />
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-charcoal" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.label} to={link.href} onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3.5 rounded-xl text-base font-bold transition-colors ${link.active ? 'text-brand-gold bg-brand-gold/5' : 'text-charcoal hover:bg-[#F8F6F2]'}`}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Layout;
