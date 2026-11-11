# StudentFlow

Multiplatformní klientská aplikace pro studijní agendu Unicorn University. Běží nativně na iOS, Androidu, macOS, Windows i Linuxu ze společného TypeScript základu.

Kompletní technická a architekturní dokumentace je k dispozici v souboru **[DOKUMENTACE.md](DOKUMENTACE.md)**.

---

## Přehled funkcionality

- **Autentizace a správa sezení (Plus4U OIDC):**
  - Implementace protokolu OAuth 2.0 / OIDC Authorization Code Flow s PKCE.
  - Hardwarové zabezpečení klíčů v Apple Keychain (iOS) a Android Keystore (Android).
  - Tichá obnova JWT sezení na pozadí přes `offline_access` a `refresh_token` eliminující samovolné odhlašování studenta.
- **Denní a týdenní rozvrh:**
  - Synchronizace s diářem Plus4U Digital Workspace s automatickou detekcí učeben (*P301, LAB1, Teams*).
  - Živý indikátor probíhající hodiny s odpočtem zbývajícího času a ukazatelem průběhu.
  - Tlačítko rychlého návratu na dnešní den a přepínání denního a týdenního zobrazení.
- **Úkoly a hodnocení (uuStudyEngine):**
  - Autoritativní synchronizace zadání a známek se školním systémem.
  - Vizuální prioritizace termínů (po termínu, dnes, zítra, dokončeno).
  - Zvláštní označení pro distanční písemky zadané formou assignmentu.
  - Filtrace semestru vylučující minulé ročníky z aktivních přehledů.
- **Zkoušky a rezervace (uuBookingEngine):**
  - Interaktivní zápis a odhlášení ze zkouškových termínů na 1 klik přímo z aplikace.
  - Živé sledování kapacity termínů a volných míst v reálném čase.
  - Automatické naplánování systémové 24hodinové notifikace po úspěšném zápisu.
  - Osobní harmonogram zapsaných zkoušek, odpočet dnů a interaktivní checklisty přípravy.
- **Offline knihovna a studijní materiály (uuBookKit):**
  - Katalog učebnic organizovaný podle jednotlivých předmětů.
  - Funkce rychlého stažení materiálů předmětu pro offline studium.
  - Kontrola integrity stažených souborů pomocí 32bitového FNV-1a hashe s kryptografickou solí zařízení.
  - Integrovaná čtečka s pamatováním naposledy čtené kapitoly a nastavením velikosti písma.
- **Desktopové rozhraní:**
  - Responzivní levý navigační panel s podporou macOS ovládacích prvků okna.
  - Dvousloupcové zobrazení pro široké monitory (až 1440 px).
  - Integrovaný lokální HTTP daemon pro rychlé načítání zdrojů v Electronu.

---

## Spuštění a vývoj

### Požadavky
- Node.js v20+ nebo v22+ LTS
- npm v10+

### Mobilní platformy (iOS & Android)
```bash
npm install
npm run ios        # Spuštění na iOS simulátoru
npm run android    # Spuštění na Android emulátoru nebo připojeném zařízení
```

### Desktopová aplikace (macOS, Windows, Linux)
```bash
npm run desktop        # Spuštění okna aplikace v Electronu
npm run desktop:dev    # Vývojový režim s live reloadem
```

### Webová verze
```bash
npx expo start --web
```

### Sestavení instalačních balíčků
```bash
npm run dist:mac      # Sestaví .dmg a .zip pro macOS
npm run dist:win      # Sestaví instalátor .exe pro Windows
npm run dist:linux    # Sestaví .AppImage a .deb balíčky pro Linux
npm run dist:all      # Sestaví distribuční balíčky pro všechny platformy
```

---

## Testy a statická analýza

Sada 39 automatických integračních a jednotkových testů běžících v nativním testovacím runneru Node.js:

```bash
npm test
npm run typecheck
```

---

## Licence a autorství

- **Autor:** Jan Gergel
- **Platforma:** Unicorn University student ecosystem
- **Licence:** MIT
