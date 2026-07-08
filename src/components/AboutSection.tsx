

'use client';

import { useEffect, useRef } from 'react';

export default function AboutSection() {
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
    if (sectionRef?.current) obs?.observe(sectionRef?.current);
    return () => obs?.disconnect();
  }, []);

  return (
    <section
      id="o-nas"
      ref={sectionRef}
      className="w-full py-24 px-6 bg-white relative"
      aria-label="O spoločnosti Job & Dues"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/images/office-2.jpg"
          alt="Job & Dues kancelária"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-white/70" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="section-label">Spoznajte nás</span>
          <h2 className="font-display text-5xl md:text-6xl font-light mt-4 text-navy-dark">
            AKO VÁM POMÔŽEME
          </h2>
        </div>

        {/* Text Content */}
        <div className="max-w-5xl mx-auto space-y-8 reveal">
          <p className="text-lg md:text-xl text-gray-800 leading-relaxed">
            Podnikáte v oblasti výroby, obchodu či služieb? Radi by ste rástli, inovovali,
            vytvárali nové pracovné miesta a rozvíjali svoj región? Alebo si svoj podnikateľský nápad
            nosíte zatiaľ len v hlave? Nemáte čas ani chuť venovať sa papierovačkám a byrokracii?
          </p>

          <p className="text-lg md:text-xl text-gray-800 leading-relaxed font-semibold text-navy">
            Tak potom ste tu správne. V Job&Dues sa sústredíme na vaše podnikanie.
          </p>

          <p className="text-lg md:text-xl text-gray-800 leading-relaxed">
            Chceme vám uľahčiť vašu prácu tak, aby ste sa mohli venovať tomu, v čom ste dobrí
            a realizovať vaše podnikateľské plány či projekty. My sa postaráme o ostatné.
          </p>

          <p className="text-lg md:text-xl text-gray-800 leading-relaxed">
            Komunikujeme s úradmi, vybavujeme finančné príspevky, vyznáme sa v spleti byrokracie
            a všetky potrebné informácie vám radi pretĺmočime pri káve v našej kancelárii alebo cez telefón.
            Postaráme sa aj o vaše účtovníctvo a pomôžeme vám nájsť tých najlepších zamestnancov.
          </p>
        </div>
      </div>
    </section>
  );
}


