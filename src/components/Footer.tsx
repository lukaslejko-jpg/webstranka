

'use client';

import AppLogo from './AppLogo';

export default function Footer() {
  const year = new Date()?.getFullYear();

  return (
    <footer className="w-full bg-navy-dark text-white py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          {/* Company Info */}
          <div>
            <h3 className="font-display text-2xl font-semibold mb-4 text-gold">Job & Dues</h3>
            <p className="text-sm text-white/70 leading-relaxed mb-4">
              Komplexné služby v oblasti príspevkov, eurofondov, účtovníctva a HR.
            </p>
            <div className="space-y-2 text-sm text-white/70">
              <p>IČO: 50841327</p>
              <p>DIČ: 2120495047</p>
              <p>IČ DPH: SK2120495047</p>
            </div>
          </div>

          {/* Right: Links */}
          <div className="flex flex-col items-start md:items-end gap-3">
            {[
              { label: 'O nás', href: '#o-nas' },
              { label: 'Služby', href: '#sluzby' },
              { label: 'Tím', href: '#tim' },
              { label: 'Kontakt', href: '#kontakt' },
              { label: 'Ochrana osobných údajov', href: '#' },
            ]?.map((link) => (
              <a
                key={link?.label}
                href={link?.href}
                className="text-sm font-medium text-white/60 hover:text-gold transition-colors"
              >
                {link?.label}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            © {year} JOB & DUES s.r.o. Všetky práva vyhradené.
          </p>
          <p className="text-xs text-white/30">IČO: 50841327 · Demjata 307, 082 13</p>
        </div>
      </div>
    </footer>
  );
}






