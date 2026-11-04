# Technická dokumentace semestrálního projektu: StudentFlow

**Projekt:** StudentFlow – Multiplatformní studentský asistent pro Unicorn University  
**Autor:** Jan Gergel  
**Předmět:** Vývoj mobilních aplikací / Semestrální projekt  
**Akademický rok:** 2025/2026  
**Technologický stack:** React Native, TypeScript, Expo SDK 58, Electron  
**Repozitář:** https://github.com/pangery/Student-Flow  

---

## 1. Motivace a cíl projektu

Informační ekosystém Unicorn University je postaven na platformě **Plus4U** a skládá se z několika samostatných specializovaných aplikací:
* **uuStudyEngine**: Správa studijních skupin, zadání úkolů (assignments) a certifikačních zkoušek.
* **uuPlus4UPeople / Digital Workspace**: Správa osobní karty studenta, kalendáře a denního rozvrhu výuky.
* **uuBookingEngine**: Rezervace a zápis termínů ústních zkoušek.
* **uuBookKit**: Výukové elektronické knihy a studijní materiály předmětů.

Pro studenta v denní praxi (zejména na mobilním telefonu) znamená používání těchto webových aplikací neustálé přepínání mezi záložkami prohlížeče, opakované přihlašování a závislost na stabilním internetovém připojení.

**Cíl projektu StudentFlow:**  
Vytvořit jednotného, rychlého a offline-first klienta, který ze školních rozhraní agreguje rozvrh, úkoly, zkoušky i učebnice do jednoho přehledného prostředí. Aplikace je navržena tak, aby fungovala na **iOS, Androidu i na desktopových operačních systémech (macOS, Windows, Linux)** ze společného zdrojového kódu.

---

## 2. Architektura systému

Projekt využívá komponentovou architekturu postavenou na React Native s typovou kontrolou TypeScriptu.

```
┌─────────────────────────────────────────────────────────────┐
│                    Prezentační vrstva                       │
│  Dashboard | Rozvrh | Úkoly | Zkoušky | Učebnice | Modal čtečky│
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Navigační vrstva                         │
│  AdaptiveTabBar (iOS Floating Glass / Android Material 3)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                  Servisní a integrační vrstva               │
│  auth.ts       – Správa OIDC relace a tokenů                │
│  plus4uSync.ts – Centrální synchronizační orchestrátor       │
│  studyEngine.ts– Adaptér pro uuStudyEngine (úkoly & zkoušky)│
│  bookingEngine.ts – Adaptér pro uuBookingEngine (ústní zk.) │
│  textbookService.ts – Správa a integrita offline učebnic    │
│  notifications.ts – Lokální push notifikace a ranní digest  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     Úložiště a hardware                     │
│  expo-secure-store (Apple Keychain / Android Keystore)      │
│  AsyncStorage (perzistence rozvrhu, stavů a metadat)        │
└─────────────────────────────────────────────────────────────┘
```

### Přehled adresářové struktury:
* `src/components/`: Znovupoužitelné UI komponenty (AdaptiveHeader, Screen, BottomSheet, SchoolPortalModal, TextbookReaderModal).
* `src/navigation/`: Platformně adaptivní spodní navigace (`AdaptiveTabBar.tsx`).
* `src/screens/`: Obrazovky aplikace (`DashboardScreen`, `ScheduleScreen`, `TasksScreen`, `ExamScreen`, `TextbooksScreen`, `OnboardingScreen`).
* `src/services/`: Datové a integrační služby (`auth.ts`, `plus4uOidc.ts`, `studyEngine.ts`, `bookingEngine.ts`, `plus4uSync.ts`, `textbookService.ts`, `semester.ts`, `notifications.ts`).
* `src/theme/`: Definice barevných témat, rozměrů a platformních detektorů (`platform.ts`, `theme.ts`).
* `src/types/`: TypeScript rozhraní datových modelů (`models.ts`).
* `electron/`: Hlavní proces (`main.cjs`) a preload skript (`preload.cjs`) pro desktopové sestavení.
* `tests/`: Sada unit testů pro Node.js test runner.

---

## 3. Autentizace a bezpečnostní model

### 3.1 OIDC Authorization Code Flow s PKCE
Přihlašování probíhá přes standardní protokol **OAuth 2.0 / OpenID Connect (OIDC)**:
1. Aplikace načte metadata z OIDC discovery endpointu:
   `https://uuidentity.plus4u.net/uu-oidc-maing02/bb977a99f4cc4c37a2afce3fd599d0a7/oidc/.well-known/openid-configuration`
2. Vygeneruje autorizační požadavek s klientským ID (`F64b643R05xQ62696875W1j2`) z veřejného balíku `uuAppDevKit`.
3. Využívá scope `openid https:// http://localhost`, což zajišťuje, že vydaný id_token má obecnou audience použitelnou pro všechny školní aplikace.
4. Přihlášení probíhá v zabezpečeném okně (systémový prohlížeč nebo WebView), kde student zadá své přihlašovací údaje přímo do Plus4U. Aplikace nikdy nemá přístup k heslu studenta.
5. Po úspěšném ověření OIDC server přesměruje na návratovou adresu s autorizačním kódem (`?code=...`), který aplikace okamžitě na token endpointu vymění za `id_token`.

### 3.2 Bezpečné ukládání tokenů
* **iOS a Android:** Token je ukládán do hardwarově chráněného úložiště přes `expo-secure-store` (na iOS v Apple Keychain chráněném Secure Enclave čipem, na Androidu v Android Keystore s AES-256 šifrováním svázaným se zámkem zařízení).
* **Desktop / Web:** Využívá se izolované perzistentní úložiště aplikace s validací expirace relace (`authExpiry.ts`).

---

## 4. Datové integrace a zpracování školních dat

### 4.1 Denní rozvrh a detekce učeben
Synchronizace rozvrhu probíhá ve dvou krocích:
1. Zjištění adresy osobního kalendáře: Volání `uuPlus4UPeople` příkazu `personalCard/listMTInfoByUuIdentityList`, odkud se získá `mtDwBaseUri` (báze Digital Workspace pro danou `uuIdentity`).
2. Stažení záznamů: Z Digital Workspace se načte diář v časovém okně -14 až +65 dní.
3. Extrakce učeben: Parser v `plus4uSync.ts` prochází vlastnosti `tileProps.location` i `tileProps.activity.location`. Pokud záznam obsahuje kód místnosti (např. *P301*, *LAB1* nebo odkaz na *Teams*), přiřadí jej k předmětu.

### 4.2 Kategorizace úkolů a zkoušek
Aplikace striktně odděluje běžné studijní povinnosti od zkoušek na základě systémových dat ze serveru:

| Typ položky | Zdrojový příkaz / entita | Rozpoznávací kritérium | Umístění v aplikaci |
| :--- | :--- | :--- | :--- |
| **Běžné úkoly (Assignments)** | `assignment/list` | Položka ze seznamu zadání bez zkouškových klíčových slov | Záložka **Úkoly** (s termínem odevzdání a odkazem na odevzdávárnu) |
| **Distanční písemné testy** | `assignment/list` | Assignment obsahující v názvu *test, zkouška, zápočet, písemka* | Záložka **Úkoly** se zlatým odznakem + propsáno do **Zkoušek** |
| **Certifikační zkoušky** | `certificationExam/list` | Entita certifikační zkoušky | Sekce **Zkoušky** (zkouškový odpočet, checklist přípravy) |
| **Průběžné testy** | `step/list` | Atribut položky `kind === 'test'` | Sekce **Zkoušky** (pokud již není součástí certifikace) |
| **Ústní zkoušky** | `uuBookingEngine` (`booking/list`) | Rezervované sloty z rezervačního systému | Sekce **Zkoušky** (s uvedením zkoušejícího vyučujícího a učebny) |

### 4.3 Ochrana proti neoprávněnému dokončení úkolů
V dřívějších konceptech mohlo dojít k tomu, že pouhé otevření odkazu na úkol označilo úkol v klientské aplikaci za hotový. Ve StudentFlow je stav úkolu striktně **autoritativní**:
* Otevření zadání v prohlížeči / Unicorn portálu stav nemění.
* Skutečný stav (`completed`, `readyForEvaluation`, `needsRevision`) se vyhodnocuje výhradně z `studentResultCacheMap` v datech vrácených ze školy při synchronizaci.

### 4.4 Semestrální filtrování
Aby student nebyl zahlcen starými položkami z předchozích ročníků, modul `semester.ts` implementuje oficiální harmonogram Unicorn University:
* **Zimní semestr:** 1. září – 14. února
* **Letní semestr:** 15. února – 31. srpna
Všechny aktivní obrazovky (Dashboard, Úkoly, Zkoušky) automaticky zobrazují data aktuálního semestru s možností nahlédnout do archivu.

---

## 5. Offline učebnice a kontrola integrity (uuBookKit)

Podle podnětu z konzultace byla do aplikace integrována offline čtečka výukových učebnic.

### 5.1 Režim offline ukládání
* Student si může stáhnout jednotlivé knihy svých předmětů nebo použít funkci **Stáhnout semestr**, která jedním kliknutím připraví všechny knihy zapsaných předmětů pro offline studium.
* V rozhraní je k dispozici přepínač *Offline režim* simulující stav bez připojení k síti (režim letadlo).

### 5.2 Ochrana proti poškození a neautorizované modifikaci (Anti-tamper)
Při stažení učebnice se obsah zabezpečuje:
1. Ze `SecureStore` se načte privátní kryptografická sůl unikátní pro dané zařízení.
2. Vypočítá se deterministický kontrolní součet obsahu (algoritmus FNV-1a hash):
   $$\text{hash} = \text{FNV-1a}(\text{salt} + \text{content})$$
3. Kontrolní součet je uložen do metadat knihy svázaných s `studentUuIdentity`.
4. Při každém otevření knihy ze souborové cache aplikace přepočítá kontrolní součet. Pokud součet nesouhlasí (např. soubor na disku byl poškozen nebo externě upraven), aplikace cache okamžitě zneplatní, upozorní uživatele a nabídne nové stažení.

### 5.3 Ergonomie čtečky
Čtečka (`TextbookReaderModal.tsx`) obsahuje:
* Dynamickou navigaci mezi kapitolami a odhadovaný čas čtení.
* Přepínání velikosti textu (`aA`).
* Typografické bloky pro syntaxově zvýrazněný kód s možností **kopírování do schránky** na jeden dotyk.
* Zvýrazněné karty tipů a praktických poznámek.
* Ukládání postupu studenta (tlačítko *Označit jako přečtené*).
* Responzivní šířku (max 860 px), která zabraňuje nečitelně dlouhým řádkům na širokoúhlých monitorech.

### 5.4 Napojení na reálný Unicorn uuBookKit
Aplikace obsahuje přímé napojení na univerzitní systém **uuBookKit** (`src/services/bookKitService.ts`):
* **Protokol uuCommandů:** Volá standardní rozhraní `loadBook` (veřejná metadata), `getBookStructure` (hierarchie kapitol vázaná na autorizaci) a `loadPage` (obsah jednotlivých stránek).
* **Autorizace:** K požadavkům na chráněné stránky a strukturu se přikládá Bearer OIDC token přihlášeného studenta (se scope `https://`).
* **LSI a řetězená struktura:** Zpracovává vícejazyčné texty (`cs`/`en`) a ze slovníku `itemMap` skládá přes vazby `previous` a `next` přesné pořadí kapitol (`toPageList`).
* **Parsování uu5:** Bloky a sekce z formátu uu5string převádí na čistý text a kódové ukázky pro offline čtečku.
* **Import libovolné knihy:** Student může zadat odkaz nebo 32místný AWID libovolné knihy ze školního portálu, případně vybrat z předpřipravených univerzitních knih. Kniha se stáhne, ověří a uloží do zabezpečené lokální mezipaměti.

---

## 6. Uživatelské rozhraní a platformní specifika

Aplikace se plně přizpůsobuje specifikům jednotlivých platforem:

### Desktop (macOS, Windows, Linux)
* **Nativní levý navigační panel (Sidebar, šířka 240 px):** Nahrazuje mobilní spodní lištu. Obsahuje logo a název aplikace, označení univerzity, vertikální seznam záložek s aktivními indikátory a stavový panel synchronizace Plus4U.
* **macOS Traffic Lights:** Respektuje umístění systémových tlačítek pro zavření/minimalizaci okna (`paddingTop: 44 px`).
* **Roztažení obsahu:** Hlavní kontejner `Screen.tsx` dynamicky přechází z úzkého mobilního sloupce na plnohodnotný desktopový layout o šířce až 1380 px s odstraněným spodním odsazením určeným původně pro mobilní dock.

### iOS
* Plovoucí dock navigační panel s efektem matného skla (`expo-blur` s intenzitou 75–90 %).
* Plynulý fyzikální bounce efekt při scrollování a podpora haptické odezvy.
* Respektování výřezu displeje (Safe Area Insets) pro Dynamic Island i spodní Home Indicator.

### Android
* Navigační lišta podle standardu **Material 3** s pevnou výškou a barvami pozadí.
* Nativní ripple efekty při stisku tlačítek a karet.
* Hardwarové tlačítko Zpět bezpečně zavírá otevřené modály a spodní listy (Bottom Sheets).

### Desktop (macOS, Windows, Linux)
* Společný bundle exportovaný přes Expo Web je zapouzdřen do nativního Electron okna (výchozí 1200×820 px).
* Na macOS jsou integrována nativní tlačítka okna (*hiddenInset* traffic lights) a systémové aplikační menu (Zpět, Znovu, Kopírovat, Vložit, Celá obrazovka).
* **Lokální HTTP daemon:** Electron spouští lehký lokální server na `127.0.0.1:<random_port>`, který servíruje statické assety, čímž eliminuje bezpečnostní a CORS omezení protokolu `file://`.
* **Responzivní layout:** Maximální šířka obsahu je pro desktop nastavena na 1040 px, takže rozvrh a přehled efektivně využívají plochu širokoúhlých monitorů.

---

## 7. Automatické testování a ověření kvality

Projekt obsahuje sadu 31 automatických unit testů spouštěných přes nativní Node.js test runner (`node --test`), které pokrývají klíčovou business logiku:

```bash
npm test
```

### Přehled testovaných oblastí:
1. **Expirace a obnova relace (`tests/authExpiry.test.cjs`):**
   * Detekce vypršení platnosti JWT tokenu.
   * Zachování identity studenta a lokálních dat při expiraci (žádné nechtěné smazání rozvrhu).
   * Validace platné relace.
2. **Synchronizační engine a klasifikace (`tests/studyEngine.test.cjs`):**
   * Zachování názvů, předmětů a termínů zadání.
   * Správná klasifikace testů podle `kind === 'test'` bez spoléhání na náhodná slova v názvu.
   * Detekce distančních písemných testů v zadáních (`isDistanceExam` a `examType: 'distance'`).
   * Autoritativní vyhodnocení výsledků studenta (včetně revizí a neúspěšných pokusů).
   * Striktní izolace – výsledky jiných studentů se nikdy nezobrazují přihlášenému uživateli.
   * Deduplikace certifikačních zkoušek a jejich podkroků.
   * Odolnost proti výpadkům sítě – zachování posledních platných dat.
3. **Integrita učebnic a uuBookKit (`tests/textbookSecurity.test.cjs`, `tests/bookkit.test.cjs`):**
   * Deterministický výpočet FNV-1a hashe se solí a izolace per student.
   * Validace a parsování URL adres a AWID kódů z portálu Unicorn.
   * Sestavení správného pořadí kapitol ze zřetězené struktury `itemMap` (`toPageList`).
   * Parsování uu5string formátu (sekce, kódové ukázky a formátovaný text).
   * Automatické odmítnutí a invalidace mezipaměti při pokusu o podvržení či poškození obsahu.
4. **Notifikace a widget bridge (`tests/notifications.test.cjs`, `tests/widgetBridge.test.cjs`):**
   * Generování snapshotu pro widgety (dnešní hodiny, nejbližší úkol a zkouška).
   * Ranní souhrn výuky a směrování notifikačních deep-linků do správných záložek.

Typová kontrola celého TypeScript kódu prochází s **0 chybami**:
```bash
npm run typecheck
```

---

## 8. Příručka ke spuštění a sestavení

### Požadavky na prostředí:
* Node.js verze 20 nebo novější
* npm verze 10 nebo novější

### Spuštění vývojového prostředí:
```bash
# 1. Instalace závislostí
npm install

# 2. Spuštění na webu
npx expo start --web

# 3. Spuštění desktopové aplikace (macOS / Windows / Linux)
npm run desktop

# 4. Spuštění na mobilním simulátoru / zařízení
npm run ios        # vyžaduje macOS a Xcode
npm run android    # vyžaduje Android Studio & SDK
```

### Sestavení instalačních balíčků:
* **macOS:** `npm run dist:mac` (vytvoří `.dmg` instalátor a `.zip` v adresáři `release/`)
* **Windows:** `npm run dist:win` (vytvoří `.exe` instalátor i přenosnou portable verzi)
* **Linux:** `npm run dist:linux` (vytvoří `.AppImage` a `.deb` balíček)
* **Všechny platformy najednou:** `npm run dist:all`

---

## 9. Závěr a možná budoucí rozšíření

Aplikace StudentFlow v současné verzi plně pokrývá potřeby studenta Unicorn University pro každodenní organizaci studia:
* Integruje autentizaci Plus4U OIDC, denní rozvrh s učebnami, úkoly ze StudyEngine a termíny zkoušek.
* Řeší specifika distančního studia (ručně zadávané testy v assignments) a má připravený adaptér pro ústní zkoušky v `uuBookingEngine`.
* Nabízí bezpečné offline učebnice s kryptografickou kontrolou integrity.
* Poskytuje nativní zážitek na mobilních i desktopových platformách.

**Potenciální budoucí rozšíření:**
1. Zavedení interaktivních systémových widgetů na plochu iOS a Androidu s využitím existujícího `widgetBridge.ts`.
2. Doplnění přímého zápisu/odhlášení z termínů zkoušek v `uuBookingEngine` přímo z rozhraní aplikace po schválení oficiálního OIDC klienta školou.

