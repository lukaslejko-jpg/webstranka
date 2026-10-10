# Tesla Home — izolovaná Tuya integrácia

Stav: ROZPRACOVANÉ / TESTUJEME (2026-10-10)

## Schválený rozsah
- Samostatná testovacia integrácia Tuya Smart Life cez GitHub + Vercel.
- Žiadny zásah do produkčných aplikácií Music, Waze ani existujúcich nasadení.
- Prvé testy iba čítanie; ovládanie zariadení až po osobitnom schválení.
- Zaznamenávať reálne vykonané kroky, testy, chyby a stav nasadenia.

## Overené z používateľských snímok
- Cloud projekt Tesla Home, región Central Europe Data Center.
- Smart Life účet je autorizovaný a zariadenia sú viditeľné.
- Detská izba: W601, device ID 741200882cf432860a94, online.
- Funkčné kódy zariadenia: switch_1 (Boolean), countdown_1 (Integer 0..86400 sekúnd).
- Tuya API Explorer vygeneroval GET /v2.0/cloud/thing/{device_id}/state.
- API dashboard zobrazil dve volania a 0 % zlyhaní; konkrétna odpoveď GET nebola doložená.

## Bezpečnosť
- Client Secret a access token neukladať do GitHubu, logov ani dokumentácie.
- Už zdieľaný access token považovať za exponovaný; obnoviť alebo nechať expirovať podľa možností Tuya.
- Client ID nie je náhrada za autentifikáciu.
- Vercel tajné premenné len server-side; endpoint nesmie umožniť neautorizované ovládanie domácnosti.

## Ďalšie kroky
1. Implementovať server-side podpisovanie Tuya HMAC-SHA256 a získavanie tokenu.
2. Pripraviť iba read-only test zariadenia a ochranu endpointu.
3. Vytvoriť samostatný Vercel projekt, nasadiť testovaciu vetvu, overiť reálnu odpoveď.
4. Až potom navrhnúť MCP a ovládanie s explicitným potvrdením.
