


'use client';

import { useEffect, useRef } from 'react';

const clientTypes = [
  {
    id: 1,
    title: 'Podnikateľské subjekty',
    description: 'Pomôžeme vám získať príspevky, eurofondy a zamestnancov.',
  },
  {
    id: 2,
    title: 'Neziskové organizácie',
    description: 'Zabezpečíme vám financovanie projektov a personálnu podporu.',
  },
  {
    id: 3,
    title: 'Obce a mestá',
    description: 'Zrealizujeme verejné obstarávanie a získame eurofondy.',
  },
  {
    id: 4,
    title: 'SZČO a freelanceri',
    description: 'Vyriešime vám účtovníctvo a administratívu.',
  },
];

export default function ClientTypesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.querySelectorAll('.reveal, .client-tag').forEach((el, i) => {
            setTimeout(() => el.classList.add('active'), i * 100);
          });
        }
      }),
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="klienti"
      ref={sectionRef}
      className="w-full py-24 px-6 bg-cream"
      aria-label="Typy klientov"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="section-label">Pre koho pracujeme</span>
          <h2 className="font-display text-5xl md:text-6xl font-light mt-4 text-navy-dark">
            NAŠI KLIENTI
          </h2>
        </div>

        {/* Client types grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {clientTypes.map((type, i) => (
            <div
              key={type.id}
              className="client-tag opacity-0 translate-y-4 group relative overflow-hidden rounded-xl border border-cream-dark bg-cream p-6 hover:border-gold/60 hover:shadow-lg hover:shadow-navy/5 transition-all duration-300"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="relative z-10">
                <h3 className="text-base font-semibold text-navy mb-2 group-hover:text-gold transition-colors">{type.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{type.description}</p>
              </div>
              
              {/* Subtle gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



