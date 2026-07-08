




'use client';

import { useEffect, useRef } from 'react';
import AppIcon from './AppIcon';

const services = [
  {
    id: 1,
    title: 'Príspevky z ÚPSVaR',
    icon: 'BanknotesIcon',
    description: 'Prejdeme s vami možnosti získania príspevkov pre vašich zamestnancov. Snažíme sa o to, aby vaše mzdové náklady boli čo najnižšie.',
    tag: 'Zamestnávatelia',
  },
  {
    id: 2,
    title: 'Eurofondy',
    icon: 'GlobeEuropeAfricaIcon',
    description: 'Pozrieme sa s vami na možnosti čerpania Eurofondov pre vaše podnikanie a celú administratívu vyriešime za vás.',
    tag: 'Financovanie',
  },
  {
    id: 3,
    title: 'Verejné obstarávanie',
    icon: 'DocumentCheckIcon',
    description: 'Finančné prostriedky musíte minúť v súlade s pravidlami. Spoločne predídeme tomu, aby ste peniaze museli vracať.',
    tag: 'Compliance',
  },
  {
    id: 4,
    title: 'Personálna agentúra',
    icon: 'UsersIcon',
    description: 'Vytvoríme pracovný inzerát a oslovíme vhodných kandidátov. Postavíme pred vás tých najlepších, z ktorých si vyberiete.',
    tag: 'HR & Nábor',
  },
  {
    id: 5,
    title: 'Účtovníctvo',
    icon: 'CalculatorIcon',
    description: 'Vyriešime za vás účtovníctvo individuálne alebo spoločne s inými službami, pri ktorých môžeme informácie využívať vo váš prospech.',
    tag: 'Financie',
  },
];

export default function ServicesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.querySelectorAll('.reveal, .bento-card').forEach((el, i) => {
            setTimeout(() => el.classList.add('active'), i * 80);
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
      id="sluzby"
      ref={sectionRef}
      className="w-full py-24 px-6 bg-cream relative"
      aria-label="Naše služby"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/images/office-3.jpg"
          alt="Job & Dues služby"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/85 via-navy/80 to-navy-dark/85" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="section-label text-gold">Naše služby</span>
          <h2 className="font-display text-5xl md:text-6xl font-light mt-4 mb-6 text-white">
            ČO VŠETKO ROBÍME?
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Komplexné riešenia pre váš úspech
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.slice(0, 4).map((service, i) => (
            <article
              key={service.id}
              className="bento-card service-card reveal group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 cursor-default"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {/* Glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              
              <div className="relative z-10 flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-gold/15 flex items-center justify-center">
                    <AppIcon name={service.icon} size={22} className="text-gold" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/40 border border-white/15 px-3 py-1 rounded-full">
                    {service.tag}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">{service.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{service.description}</p>
                </div>

                <a
                  href="#kontakt"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center gap-2 text-gold text-xs font-semibold uppercase tracking-wider group-hover:gap-4 transition-all duration-300"
                >
                  <span>Viac informácií</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </article>
          ))}

          {/* Last card — col-span-full */}
          <article className="bento-card service-card reveal group relative overflow-hidden rounded-2xl border border-gold/30 bg-white/10 backdrop-blur-sm p-8 md:col-span-2 cursor-default">
            <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-14 h-14 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
                <AppIcon name="CalculatorIcon" size={26} className="text-gold" />
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white">{services[4].title}</h3>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gold-dark border border-gold/30 px-3 py-1 rounded-full">
                    {services[4].tag}
                  </span>
                </div>
                <p className="text-sm text-white/60 leading-relaxed max-w-2xl">{services[4].description}</p>
              </div>

              <a
                href="#kontakt"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex-shrink-0 bg-gold text-navy-dark px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-gold-light transition-colors rounded-sm"
              >
                Mám záujem
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}







