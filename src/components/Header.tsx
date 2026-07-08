




'use client';

import { useState, useEffect } from 'react';
import AppLogo from './AppLogo';

const navLinks = [
  { label: 'O nás', href: '#o-nas' },
  { label: 'Naše služby', href: '#sluzby' },
  { label: 'Klienti', href: '#klienti' },
  { label: 'Referencie', href: '#preco-my' },
  { label: 'Kontakt', href: '#kontakt' },
  { label: 'Podpora EÚ', href: '#podpora-eu', isEU: true },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/70 backdrop-blur-xl shadow-lg shadow-navy-dark/10 py-3'
            : 'bg-white/20 backdrop-blur-md py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            className="flex items-center gap-3 group"
            aria-label="Job & Dues - späť na začiatok"
          >
            <img 
              src="/assets/images/logo.png" 
              alt="Job & Dues" 
              className="w-20 h-20 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            />
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Hlavná navigácia">
            {navLinks?.map((link) => (
              link.isEU ? (
                <a
                  key={link?.href}
                  href={link?.href}
                  onClick={(e) => {
                    e?.preventDefault();
                    document?.getElementById(link?.href?.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="eu-badge px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase"
                >
                  ★ {link?.label}
                </a>
              ) : (
                <a
                  key={link?.href}
                  href={link?.href}
                  onClick={(e) => {
                    e?.preventDefault();
                    document?.getElementById(link?.href?.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="nav-link text-sm text-navy-dark hover:text-gold transition-colors duration-300"
                >
                  {link?.label}
                </a>
              )
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className={`md:hidden p-2 z-50 relative transition-colors ${
              scrolled ? 'text-navy-dark' : 'text-white'
            }`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Zatvoriť menu' : 'Otvoriť menu'}
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span
                className={`block h-0.5 transition-all duration-300 ${scrolled ? 'bg-navy-dark' : 'bg-white'} ${
                  menuOpen ? 'rotate-45 translate-y-2.5' : ''
                }`}
              />
              <span
                className={`block h-0.5 transition-all duration-300 ${scrolled ? 'bg-navy-dark' : 'bg-white'} ${
                  menuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`block h-0.5 transition-all duration-300 ${scrolled ? 'bg-navy-dark' : 'bg-white'} ${
                  menuOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 bg-navy-dark z-40 flex flex-col justify-center items-center transition-transform duration-500 ${
          menuOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <nav className="flex flex-col gap-8 text-center">
          {navLinks.map((link, i) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className={`font-display text-4xl font-light italic transition-colors ${
                link.isEU 
                  ? 'eu-badge mx-auto px-6 py-3 rounded-lg text-sm font-bold tracking-wider uppercase not-italic'
                  : 'text-white hover:text-gold'
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {link.isEU ? `★ ${link.label}` : link.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}





















