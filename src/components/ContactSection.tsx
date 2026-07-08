

'use client';

import { useState, useEffect, useRef } from 'react';
import AppIcon from './AppIcon';

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  newsletter: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export default function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
    newsletter: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting)
            e.target.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => el.classList.add('active'));
        }),
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Meno je povinné';
    if (!formData.email.trim()) {
      newErrors.email = 'E-mail je povinný';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Zadajte platný e-mail';
    }
    if (!formData.message.trim()) newErrors.message = 'Správa je povinná';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('submitting');
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);

    try {
      const res = await fetch('https://formspree.io/f/mvzvarwo', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', phone: '', message: '', newsletter: false });
        setErrors({});
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <section
      id="kontakt"
      ref={sectionRef}
      className="w-full py-24 px-6 relative overflow-hidden"
      aria-label="Kontaktujte nás"
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/images/office-4.jpg"
          alt="Office background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-navy/95 via-navy/90 to-navy-dark/95" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="section-label text-gold-light">Spojme sa</span>
          <h2 className="font-display text-5xl md:text-6xl font-light mt-4 mb-6 text-white">
            KONTAKT
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Radi zodpovieme vaše otázky a pomôžeme vám s vašimi potrebami
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-stretch">
          {/* Left: Contact Info */}
          <div className="reveal-left flex flex-col">
            <div className="flex-1 flex flex-col gap-8">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/20 flex-1">
                <h3 className="font-display text-2xl font-semibold text-white mb-8">Firemné údaje</h3>
                <div className="space-y-6">
                  {[
                    { icon: 'BuildingOfficeIcon', label: 'Prevádzkovateľ', value: 'JOB & DUES s.r.o.' },
                    { icon: 'HomeIcon', label: 'Sídlo', value: 'Demjata 307, 082 13' },
                    { icon: 'MapPinIcon', label: 'Prevádzka', value: 'Vranovská 41, 08006 Prešov', isLink: true },
                    { icon: 'PhoneIcon', label: 'Telefón', value: '+421 918 833 154', isPhone: true },
                    { icon: 'EnvelopeIcon', label: 'Email', value: 'info@jobdues.sk', isEmail: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gold/20 flex items-center justify-center flex-shrink-0">
                        <AppIcon name={item.icon as any} size={20} className="text-gold" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-gold mb-1">{item.label}</p>
                        {item.isLink ? (
                          <a
                            href="https://www.google.com/maps/search/?api=1&query=Vranovsk%C3%A1+41%2C+08006+Pre%C5%A1ov"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base text-white hover:text-gold transition-colors duration-200 flex items-center gap-2"
                          >
                            {item.value}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                              <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                            </svg>
                          </a>
                        ) : item.isEmail ? (
                          <a href={`mailto:${item.value}`} className="text-base text-white hover:text-gold transition-colors">
                            {item.value}
                          </a>
                        ) : item.isPhone ? (
                          <a href={`tel:${item.value.replace(/\s/g, '')}`} className="text-base text-white hover:text-gold transition-colors">
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-base text-white">{item.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-gold/20 via-gold-dark/20 to-gold/10 backdrop-blur-xl rounded-3xl p-10 border border-gold/30 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gold/20 flex items-center justify-center">
                    <AppIcon name="ClockIcon" size={20} className="text-gold" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-white">Otváracie hodiny</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-base text-white/80">Pondelok - Piatok</span>
                    <span className="text-base font-semibold text-white">7:00 - 15:30</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-base text-white/80">Sobota - Nedeľa</span>
                    <span className="text-base font-semibold text-white/50">Zatvorené</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="reveal-right delay-200 flex">
            <div className="relative bg-white/10 backdrop-blur-2xl rounded-3xl p-8 md:p-10 shadow-2xl border border-white/30 overflow-hidden flex-1 flex flex-col">
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-gold/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-navy/20 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10 flex-1 flex flex-col">
                {status === 'success' ? (
                  <div className="text-center py-12 flex-1 flex flex-col justify-center">
                    <div className="w-20 h-20 bg-green-100/90 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <AppIcon name="CheckIcon" size={36} className="text-green-600" />
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-white mb-3">Správa odoslaná!</h3>
                    <p className="text-white/90 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                      Ďakujeme za váš záujem. Ozveme sa vám čo najskôr.
                    </p>
                    <button
                      onClick={() => setStatus('idle')}
                      className="text-sm font-semibold text-gold hover:text-gold-light transition-colors underline underline-offset-4"
                    >
                      Odoslať ďalšiu správu
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="mb-8">
                      <h3 className="font-display text-3xl md:text-4xl font-light text-white mb-2">
                        Napíšte nám
                      </h3>
                      <div className="w-20 h-1 bg-gradient-to-r from-gold to-gold-light rounded-full mb-3" />
                      <p className="text-white/80 text-sm">
                        Tešíme sa na vašu správu
                      </p>
                    </div>

                    <div className="space-y-4 mb-5">
                      <div>
                        <label htmlFor="name" className="block text-xs font-bold text-white mb-2">
                          Meno a priezvisko <span className="text-gold">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Ján Novák"
                          className={`w-full px-4 py-3 border-2 ${errors.name ? 'border-red-400' : 'border-white/30'} rounded-xl text-sm bg-white/95 backdrop-blur-sm placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-gold/30 focus:border-gold transition-all duration-200`}
                          aria-describedby={errors.name ? 'name-error' : undefined}
                        />
                        {errors.name && (
                          <p id="name-error" className="mt-1.5 text-xs text-red-300 flex items-center gap-1">
                            <AppIcon name="ExclamationCircleIcon" size={14} />
                            {errors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-xs font-bold text-white mb-2">
                          E-mail <span className="text-gold">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="jan@firma.sk"
                          className={`w-full px-4 py-3 border-2 ${errors.email ? 'border-red-400' : 'border-white/30'} rounded-xl text-sm bg-white/95 backdrop-blur-sm placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-gold/30 focus:border-gold transition-all duration-200`}
                          aria-describedby={errors.email ? 'email-error' : undefined}
                        />
                        {errors.email && (
                          <p id="email-error" className="mt-1.5 text-xs text-red-300 flex items-center gap-1">
                            <AppIcon name="ExclamationCircleIcon" size={14} />
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="phone" className="block text-xs font-bold text-white mb-2">
                          Telefónne číslo
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+421 9XX XXX XXX"
                          className="w-full px-4 py-3 border-2 border-white/30 rounded-xl text-sm bg-white/95 backdrop-blur-sm placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-gold/30 focus:border-gold transition-all duration-200"
                        />
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-xs font-bold text-white mb-2">
                          Text správy <span className="text-gold">*</span>
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows={4}
                          placeholder="Popíšte nám vašu situáciu alebo otázku..."
                          className={`w-full px-4 py-3 border-2 ${errors.message ? 'border-red-400' : 'border-white/30'} rounded-xl text-sm bg-white/95 backdrop-blur-sm placeholder:text-gray-400 resize-none focus:outline-none focus:ring-4 focus:ring-gold/30 focus:border-gold transition-all duration-200`}
                          aria-describedby={errors.message ? 'message-error' : undefined}
                        />
                        {errors.message && (
                          <p id="message-error" className="mt-1.5 text-xs text-red-300 flex items-center gap-1">
                            <AppIcon name="ExclamationCircleIcon" size={14} />
                            {errors.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Newsletter checkbox */}
                    <div className="mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          name="newsletter"
                          checked={formData.newsletter}
                          onChange={handleChange}
                          className="mt-0.5 w-4 h-4 accent-gold rounded"
                        />
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-gold transition-colors">Buďte v obraze</p>
                          <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                            Nezmeškajte novinky, ktoré môžu pomôcť vášmu podnikaniu rásť.
                          </p>
                        </div>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="w-full bg-gradient-to-r from-gold to-gold-dark text-navy py-4 text-sm font-bold uppercase tracking-widest rounded-xl hover:from-gold-light hover:to-gold transition-all duration-300 shadow-2xl hover:shadow-gold/50 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                      {status === 'submitting' ? (
                        <>
                          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Odosielam...
                        </>
                      ) : (
                        <>
                          Odoslať správu
                          <AppIcon name="PaperAirplaneIcon" size={16} />
                        </>
                      )}
                    </button>

                    {status === 'error' && (
                      <div className="mt-4 p-3 bg-red-500/20 backdrop-blur-sm border-2 border-red-400/50 rounded-xl">
                        <p className="text-xs text-white text-center flex items-center justify-center gap-2">
                          <AppIcon name="ExclamationTriangleIcon" size={14} />
                          Chyba pri odoslaní. Skúste to prosím znova.
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-white/60 text-center mt-4 leading-relaxed">
                      Odoslaním formulára súhlasíte so spracovaním osobných údajov v súlade s GDPR.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}






