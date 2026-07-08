



'use client';

import { useEffect, useRef } from 'react';
import AppIcon from './AppIcon';

const reasons = [
  {
    icon: 'PuzzlePieceIcon',
    title: 'Poradíme vám komplexne',
    description: 'Aj keď naše služby ponúkame individuálne, na vás a vaše podnikanie sa pozeráme ako na celok. Spoločne budeme hľadať spôsoby, ako by mohla vaša firma rásť a prosperovať.',
  },
  {
    icon: 'ChatBubbleBottomCenterTextIcon',
    title: 'Budeme k vám úprimní',
    description: 'Vieme odhadnúť potenciál vášho rastu a rovno vám to povieme. Nebudeme vám sľubovať príspevky a Eurofondy, ktoré sa vám pravdepodobne nepodarí získať.',
  },
  {
    icon: 'AcademicCapIcon',
    title: 'Máme niekoľko rokov praxe',
    description: 'Odborné skúsenosti sme získali za viac než desať rokov praxe nielen u nás, ale aj v iných firmách či na úradoch. Vďaka tomu vieme, ako zrozumiteľne prepojiť legislatívu s vašim podnikaním.',
  },
];

export default function WhyUsSection() {
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
      id="preco-my"
      ref={sectionRef}
      className="w-full py-24 px-6 bg-white overflow-hidden"
      aria-label="Prečo si vybrať Job & Dues"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="section-label">Naša hodnota</span>
          <h2 className="font-display text-5xl md:text-6xl font-light mt-4 mb-6 text-navy-dark">
            PREČO S NAMI SPOLUPRACOVAŤ?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Viac ako len administratívna podpora
          </p>
        </div>

        {/* Asymmetric layout: 60/40 */}
        <div className="grid md:grid-cols-5 gap-8 items-start">
          {/* Left 60%: reason cards */}
          <div className="md:col-span-3 space-y-5">
            {reasons.map((r, i) => (
              <div
                key={r.title}
                className={`reveal delay-${(i + 1) * 100} group flex gap-6 bg-white rounded-2xl p-7 border border-cream-dark hover:border-gold/40 hover:shadow-lg hover:shadow-navy/5 transition-all duration-400`}
              >
                <div className="w-12 h-12 rounded-xl bg-navy/10 flex items-center justify-center flex-shrink-0 group-hover:bg-navy group-hover:text-white transition-colors duration-300">
                  <AppIcon name={r.icon} size={22} className="text-navy group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-navy mb-2">{r.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{r.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Right 40%: sticky summary card */}
          <div className="md:col-span-2 reveal-right delay-200">
            <div className="bg-navy rounded-2xl p-8 text-white sticky top-28">
              <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center mb-6">
                <AppIcon name="StarIcon" size={24} className="text-gold" variant="solid" />
              </div>
              
              <h3 className="font-display text-2xl font-light italic mb-4">
                Podnikateľské plány,<br />
                <span className="not-italic font-semibold">ktoré sme zrealizovali</span>
              </h3>

              <div className="space-y-4 mb-8">
                {[
                  { label: 'Príspevky vybavené', value: '600+' },
                  { label: 'Eurofondové projekty', value: '500+' },
                  { label: 'Zamestnaní kandidáti', value: '300+' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-sm text-white/60">{stat.label}</span>
                    <span className="font-display text-2xl font-semibold text-gold">{stat.value}</span>
                  </div>
                ))}
              </div>

              <a
                href="#kontakt"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="block w-full text-center bg-gold text-navy-dark py-4 text-sm font-bold uppercase tracking-widest hover:bg-gold-light transition-colors rounded-sm"
              >
                Bezplatná konzultácia
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}




