# StudentFlow

Multiplatformní studentská aplikace pro studenty Unicorn University postavená na React Native, Expo, TypeScriptu a Electronu pro **iOS, Android, macOS, Windows i Linux**.

---

## Podporované platformy a spuštění

### 1. Mobilní aplikace (iOS & Android)
```bash
npm install
npm run ios        # Spuštění na iOS simulátoru / zařízení
npm run android    # Spuštění na Android emulátoru / zařízení
```

### 2. Desktopové aplikace (macOS, Windows, Linux)
Spuštění nativního desktopového okna:
```bash
npm run desktop        # Produkční desktopové okno
npm run desktop:dev    # Vývojářský režim s live reloadem
```

Sestavení instalačních balíčků:
* **macOS**: `npm run dist:mac` (vytvoří `.dmg` a `.zip`)
* **Windows**: `npm run dist:win` (vytvoří `.exe` instalátor i přenosnou portable verzi)
* **Linux**: `npm run dist:linux` (vytvoří `.AppImage` a `.deb`)

### 3. Webový prohlížeč
```bash
npx expo start --web
```

---

## Architektura a klíčové funkce

### 1. Autentizace a bezpečnost
* Využívá standardní **Plus4U OIDC** (OpenID Connect) Authorization Code Flow s PKCE.
* Tokeny se v mobilních zařízeních ukládají do hardwarově šifrovaného úložiště (`expo-secure-store` – Apple Keychain / Android Keystore), na desktopu do zabezpečeného perzistentního úložiště s oddělením relace.
* Do repozitáře nejsou vloženy žádné soukromé osobní přístupy ani cizí tokeny.

### 2. Synchronizace rozvrhu a učeben
* Rozvrh se načítá přes Plus4U Digital Workspace.
* Automaticky extrahuje a zobrazuje kód a název učebny (včetně indikace virtuální učebny / Teams).
* Karty rozvrhu zobrazují přesný čas, kód předmětu, vyučujícího i učebnu.

### 3. Zadání, úkoly a zkoušky
* Úkoly a testy se synchronizují s oficiálním systémem `uuStudyEngine`.
* **Autoritativní synchronizace**: Otevření odkazu na úkol v portálu neoznačí úkol automaticky jako hotový – stav se ověřuje přímo ze školního systému po skutečném odevzdání studentem.
* Úkoly jsou řazeny podle termínu odevzdání (nejbližší termíny nahoře).
* Automatické filtrování podle aktuálního semestru s možností nahlédnout do archivu.

### 4. Učebnice s offline režimem a kontrolou integrity
* Učebnice vázané na zapsané předměty studenta.
* Integrovaná čtečka kapitol se sledováním postupu, odhadem času čtení, nastavením velikosti písma a zvýrazněním kódu.
* Funkce **Stáhnout semestr** pro kompletní přípravu offline studia.
* **Kryptografická ochrana integrity (FNV-1a hash)**: Stažené soubory v lokálním úložišti jsou chráněny kontrolním součtem a hardwarovou solí, která zabraňuje neautorizovaným zásahům.

### 5. Nativní rozhraní
* Responzivní design optimalizovaný jak pro mobilní telefony, tak pro tablety i širokoúhlé monitory (až do 1040 px šířky).
* Na iOS a desktopu plovoucí skleněné navigační menu (frosted glass) s efektem rozostření pozadí.
* Na Androidu čistý Material 3 navigační panel.

---

## Ověření a testy

V projektu je připravená sada unit testů pokrývající synchronizační engine, notifikace, integritu učebnic a expiraci relace:

```bash
# Kontrola typové správnosti TypeScriptu (0 chyb):
npm run typecheck

# Spuštění kompletní testovací sady (27 testů):
npm test
```
