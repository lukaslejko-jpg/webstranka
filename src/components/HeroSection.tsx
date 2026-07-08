

'use client';

import { useRef } from 'react';

export default function HeroSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScrollDown = () => {
    const next = document.getElementById('klienti');
    if (next) next?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      className="relative w-full min-h-screen flex items-end justify-between px-6 pb-16 overflow-hidden bg-navy-dark text-white"
      aria-label="Úvodná sekcia"
    >
      {/* Full-bleed background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/images/hero.jpg"
          alt="Job & Dues kancelária"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/70 via-navy-dark/60 to-navy-dark/70" />
      </div>

      {/* Hero Content — centered */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center text-center min-h-[70vh] pt-28 pb-32">
        {/* Main headline */}
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-light text-white mb-8 leading-tight">
            Potrebujete realizovať{' '}
            <span className="font-semibold">Vaše podnikateľské plány?</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
            Sme tu pre vás!
          </p>
          <p className="text-base md:text-lg text-white/80 leading-relaxed mb-12 max-w-2xl mx-auto">
            Príspevky, eurofondy, účtovníctvo a HR — všetko pod jednou strechou.
            Bez papierovačiek, bez stresu.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <a
            href="#kontakt"
            onClick={(e) => {
              e?.preventDefault();
              document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-block bg-gold text-navy-dark px-8 py-4 text-sm font-bold uppercase tracking-widest hover:bg-gold-light transition-all duration-300 shadow-xl shadow-gold/20 text-center"
          >
            Bezplatná konzultácia
          </a>
          <a
            href="#o-nas"
            onClick={(e) => {
              e?.preventDefault();
              document.getElementById('o-nas')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-block border-2 border-white/40 text-white px-8 py-4 text-sm font-semibold uppercase tracking-widest hover:bg-white hover:text-navy-dark transition-all duration-300 text-center backdrop-blur-sm"
          >
            Zistiť viac
          </a>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={handleScrollDown}
          className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center mt-12 hover:border-gold hover:bg-gold/10 transition-all duration-300 backdrop-blur-sm"
          aria-label="Scrollovať nadol"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Stats bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-navy-dark/90 backdrop-blur-md border-t border-white/10 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-3 gap-6">
          {[
            { value: '600+', label: 'Príspevky vybavené' },
            { value: '500+', label: 'Eurofondové projekty' },
            { value: '€2M+', label: 'Získaných fondov' },
          ]?.map((stat) => (
            <div key={stat?.label} className="text-center">
              <span className="block text-xl md:text-2xl font-display font-semibold text-gold">{stat?.value}</span>
              <span className="block text-xs text-white/50 uppercase tracking-wider">{stat?.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}






