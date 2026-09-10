from pathlib import Path
p=Path('docs/TESLA_MUSIC_MOBILE_SINGLE_SOURCE_OF_TRUTH.md')
s=p.read_text()
if '## 15. AirPlay / systémový výstup – V29' not in s:
    s += '''\n\n---\n\n## 15. AirPlay / systémový výstup – V29\n\nMobilná Tesla Music obsahuje tlačidlo **AirPlay** bez potreby prihlásenia.\n\nPri lokálnom alebo offline audiu používa natívny iOS/Safari playback-target picker cez `webkitShowPlaybackTargetPicker()` a povoľuje AirPlay na HTML audio elemente cez `x-webkit-airplay=allow`.\n\nPri online YouTube zostáva prehrávanie výhradne cez oficiálny YouTube IFrame Player. Aplikácia nastaví iframe pre kompatibilné systémové prehrávanie, ale nemá prístup k internému `<video>` elementu vo cross-origin YouTube iframe. Ak Safari neposkytne natívny picker priamo, používateľ vyberie AirPlay cez ovládanie YouTube alebo Ovládacie centrum iPhonu.\n\nV29 nemení YouTube Search, účet, Offline resolver ani Tesla Waze navigáciu.\n'''
p.write_text(s)
