# Route alternatives UI fix — 2026-10-18

## Rozsah
Oprava sa týka iba projektu `tesla-sk-waze-lab`.
Produkcia `tesla-sk` bola použitá iba ako read-only referencia a nebola menená.

## Zistená regresia
Po clean/full audit rebuilde boli alternatívne trasy funkčne zachované, ale UI bolo chybne presunuté do veľkého spoločného tmavého panelu pod horný manévrový banner.

Pôvodné LAB správanie bolo iné:
- `Trasa 1`, `Trasa 2` atď. boli samostatné tlačidlá,
- boli umiestnené dole, tesne nad spodným trip/ETA panelom,
- nemali spoločný čierny panel/okno.

## Obnovený vzhľad
Aktuálne:
- `#routeAlternatives` nemá triedu `panel`,
- kontajner je transparentný,
- tlačidlá ostávajú samostatné,
- pozícia je dole nad trip barom,
- aktívna trasa je modrá,
- ostatné trasy ostávajú tmavé.

## Čas automatického skrytia
Pôvodné a aktuálne nastavenie:
- `60000 ms` = **60 sekúnd**.

Timer sa spúšťa:
1. po prvom zobrazení alternatív po výpočte trasy,
2. znova po manuálnom prepnutí trasy,
3. znova po otvorení cez `••• → Trasy`.

Po skrytí:
- na mape nezostáva samostatné tlačidlo `Trasy`,
- alternatívy sa znovu otvoria iba cez `••• → Trasy`.

## Release
Testovaný preview:
- `dpl_Gp4mwm4cG6dLXh4XEauvLyiYCdTu`

Production LAB:
- `dpl_79yKXi6QWM5x1xgUyDMMLyyE2LhX`
- URL: `tesla-sk-waze-86zla04xy-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Preview vs production:
- 16/16 source files zhodných
- rozdiely: 0

Rozdiel oproti predchádzajúcemu LAB production:
- menil sa iba `api/lab-main.js`
- backend Waze/GPS/traffic/alerts/QR/TTS/chargers ostal bez zmeny.

Rollback:
- `dpl_HuM6uhGntoq9GfVPbqfvyLkWcezt`

## Produkcia tesla-sk
Počas tejto opravy ostala nezmenená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
