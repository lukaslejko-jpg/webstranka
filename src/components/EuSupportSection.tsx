



'use client';

import { useEffect, useRef } from 'react';
import AppIcon from './AppIcon';

const features = [
  {
    icon: 'BuildingOffice2Icon',
    title: 'Priestory',
    description: 'Rekonštrukcie a modernizácia priestorov.',
  },
  {
    icon: 'HeartIcon',
    title: 'Podpora pre klientov',
    description: 'Vypracovanie projektov pre ľudí s ktorými pracujete.',
  },
  {
    icon: 'UserIcon',
    title: 'Tvorba pracovných miest',
    description: 'Dotácia na vytvorenie nových pracovných miest.',
  },
  {
    icon: 'BuildingLibraryIcon',
    title: 'Materiálno-technické vybavenie',
    description: 'Nákup nábytku, techniky a zariadenia do kancelárie.',
  },
  {
    icon: 'SparklesIcon',
    title: 'Rozvoj služieb',
    description: 'Zlepšenie kvality poskytovaných služieb.',
  },
  {
    icon: 'ArrowTrendingUpIcon',
    title: 'Rozvoj podnikania',
    description: 'Podpora rastu malých a stredných podnikov.',
  },
];

export default function EuSupportSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => el.classList.add('active'));
        }
      }),
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="podpora-eu"
      className="w-full py-24 px-6 bg-gradient-to-br from-navy to-navy-dark text-white"
      aria-label="Podpora z eurofondov"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-light">
            Financovanie z EÚ
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-light mt-4 mb-6">
            Eurofondy a <span className="font-semibold">príspevky</span>
          </h2>
          <p className="text-lg text-cream max-w-2xl mx-auto leading-relaxed">
            Pomôžeme vám získať financovanie pre vaše projekty
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`reveal delay-${Math.min((i + 1) * 100, 500)} group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-7 hover:bg-white/10 hover:border-gold/40 transition-all duration-300`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0 group-hover:bg-gold group-hover:scale-110 transition-all duration-300">
                  <AppIcon name={f.icon} size={22} className="text-gold group-hover:text-navy-dark transition-colors" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{f.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="reveal delay-300 mt-12 text-center">
          <a
            href="#kontakt"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-block bg-gold text-navy-dark px-8 py-4 text-sm font-bold uppercase tracking-widest hover:bg-gold-light transition-colors rounded-sm shadow-xl shadow-gold/10"
          >
            Zistite, či máte nárok
          </a>
        </div>
      </div>
    </section>
  );
}




