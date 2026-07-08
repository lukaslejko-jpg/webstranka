





'use client';

import { useEffect, useRef } from 'react';

const team = [
  {
    name: 'Ing. Jaroslava Lejková, MBA',
    role: 'Managing Director & CEO',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_ac3a38f2d-1768348278370.png',
  },
  {
    name: 'Mgr. Lukáš Lejko, MBA',
    role: 'Business Development Director',
    image: 'https://img.rocket.new/generatedImages/rocket_gen_img_8b51c092c-1768348278399.png',
  },
];

export default function TeamSection() {
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
      id="team"
      ref={sectionRef}
      className="w-full py-24 px-6 bg-cream relative"
      aria-label="Náš tím"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/images/office-4.jpg"
          alt="Job & Dues tím"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-cream/75" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <p className="section-label mb-4">ĽUDIA</p>
          <h2 className="font-display text-5xl md:text-6xl font-light text-navy mb-6">
            Náš tím
          </h2>
          <p className="text-lg text-charcoal/70 max-w-3xl mx-auto leading-relaxed">
            Na čele spoločnosti stojí skúsené vedenie s dlhoročnými skúsenosťami v oblasti príspevkov, eurofondov a poradenstva. Okolo nich pracuje tím odborníkov, ktorí sa starajú o každý detail vášho projektu.
          </p>
        </div>

        {/* Team Names - Simple Text Only */}
        <div className="text-center space-y-8">
          {team.map((member, i) => (
            <div
              key={member.name}
              className={`reveal ${i === 0 ? 'reveal-left' : 'reveal-right'} delay-${(i + 1) * 100}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <div className="text-center">
                <h3 className="font-display text-2xl md:text-3xl font-light text-navy mb-2">
                  {member.name}
                </h3>
                <p className="text-gold-dark font-medium mb-4">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}








