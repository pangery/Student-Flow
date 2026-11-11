# Technická dokumentace systému StudentFlow

Informace o projektu:
- **Název projektu:** StudentFlow
- **Zaměření:** Multiplatformní klientská aplikace pro studijní agendu Unicorn University
- **Autor:** Jan Gergel
- **Cílové platformy:** iOS, Android, macOS, Windows, Linux, Web
- **Použitý stack:** React Native 0.88, Expo SDK 58, TypeScript 5.8, Electron 34, Node.js 22 LTS
- **Zdrojový kód:** [github.com/pangery/Student-Flow](https://github.com/pangery/Student-Flow)
- **Stav testů:** 37/37 úspěšných testů (Node.js test runner), 0 chyb v TypeScript kompilátoru

---

## Obsah

1. [Úvod a specifikace problému](#1-úvod-a-specifikace-problému)
2. [Architektura systému](#2-architektura-systému)
   - 2.1 Vrstvy aplikace
   - 2.2 Struktura repozitáře
3. [Autentizace a správa sezení](#3-autentizace-a-správa-sezení)
   - 3.1 OIDC Authorization Code Flow s PKCE
   - 3.2 Tichá obnova tokenů (Silent Refresh)
   - 3.3 Bezpečné úložiště a perzistence přihlášení
   - 3.4 Izolace více uživatelských profilů
4. [Integrace se systémy Plus4U a uuApp](#4-integrace-se-systémy-plus4u-a-uuapp)
   - 4.1 Formátování dotazů a serializace dot-notation
   - 4.2 Rozvrh a kalendář (Plus4U Digital Workspace)
   - 4.3 Úkoly a hodnocení (uuStudyEngine)
   - 4.4 Rezervace zkoušek (uuBookingEngine)
   - 4.5 Semestrální logika a časová okna
5. [Offline studijní materiály (uuBookKit)](#5-offline-studijní-materiály-uubookkit)
   - 5.1 Načítání a parsování formátu uu5string
   - 5.2 Detekce integrity mezipaměti (FNV-1a kontrolní součet)
   - 5.3 Perzistence pozice a stavu čtení
6. [Datové modely a struktura úložiště](#6-datové-modely-a-struktura-úložiště)
   - 6.1 TypeScript rozhraní
   - 6.2 Klíče a perzistence v AsyncStorage a SecureStore
7. [Uživatelské rozhraní a podpora platforem](#7-uživatelské-rozhraní-a-podpora-platforem)
   - 7.1 Mobilní rozhraní (iOS a Android)
   - 7.2 Desktopové rozhraní (macOS, Windows, Linux)
   - 7.3 Vývojový a telemetrický server
8. [Automatizované testování](#8-automatizované-testování)
9. [Instalace a příručka pro sestavení](#9-instalace-a-příručka-pro-sestavení)

---

## 1. Úvod a specifikace problému

Studijní agenda na Unicorn University je rozdělena mezi několik samostatných webových aplikací postavených na firemním rámci uuApp:
- **Plus4U Digital Workspace:** Diář, osobní kalendář a rozvrh přednášek/cvičení.
- **uuStudyEngine:** Evidence předmětů, studijních skupin, zadání úloh, odevzdávárny a výsledky hodnocení.
- **uuBookingEngine:** Rezervace zkušebních termínů a konzultačních hodin.
- **uuBookKit:** Digitální skripta, knihy a metodické materiály.

V běžné praxi to pro studenta představuje řadu komplikací:
1. **Nutnost neustálého přepínání** mezi minimálně čtyřmi nezávislými webovými systémy pro zjištění základních informací o výuce.
2. **Krátká životnost přihlášení (1–2 hodiny):** Webové portály často odhlašují uživatele, což vede k nutnosti opakovaného vyplňování přihlašovacích údajů i během jednoho dne.
3. **Absence offline režimu:** Webové rozhraní neposkytuje možnost číst materiály nebo nahlížet do rozvrhu při výpadku sítě či při cestování metrem a vlakem.
4. **Omezená ergonomie na mobilních zařízeních:** Webové aplikace primárně cílí na desktopové monitory a na menších displejích telefonů vyžadují složité horizontální posouvání a zoomování.

Projekt **StudentFlow** konsoliduje tato data do jednotné klientské aplikace. Zajišťuje bezpečné lokální ukládání dat, automatickou obnovu sezení na pozadí bez odhlašování studenta a adaptivní rozhraní pro mobilní telefony, tablety i stolní počítače.

---

## 2. Architektura systému

### 2.1 Vrstvy aplikace

Návrh aplikace striktně odděluje prezentační logiku, aplikační služby pro komunikaci se školními API a systémová úložiště.

```
┌──────────────────────────────────────────────────────────────────┐
│                      PREZENTAČNÍ VRSTVA                          │
│  Obrazovky: Dashboard, Rozvrh, Úkoly, Zkoušky, Učebnice, Čtečka  │
│  Komponenty: Screen, AdaptiveHeader, BottomSheet, Modály         │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ (Props / Lokální stav)
┌─────────────────────────────────▼────────────────────────────────┐
│                      NAVIGAČNÍ VRSTVA                            │
│  AdaptiveTabBar: Plovoucí spodní lišta (iOS / Android)           │
│                  240px Sidebar s macOS Window Controls (Desktop) │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ (Hooks / Context)
┌─────────────────────────────────▼────────────────────────────────┐
│                      SERVISNÍ A DATOVÁ VRSTVA                    │
│  auth.ts           → OIDC autorizace, tokeny, Silent Refresh     │
│  plus4uClient.ts   → HTTP volání uuApp s dot-notation parametrizací│
│  plus4uSync.ts     → Synchronizace kalendáře a úkolů             │
│  studyEngine.ts    → Adaptér pro uuStudyEngine                   │
│  bookingEngine.ts  → Adaptér pro uuBookingEngine                 │
│  bookKitService.ts → uuBookKit API a parsování uu5 XML obsahu    │
│  textbookService.ts→ Správa mezipaměti a FNV-1a integrita souborů│
│  notifications.ts  → Lokální systémové notifikace                │
│  widgetBridge.ts   → Serializace snapshotů pro systémové widgety │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ (I/O)
┌─────────────────────────────────▼────────────────────────────────┐
│                      ÚLOŽIŠTĚ ZAŘÍZENÍ                           │
│  expo-secure-store → Šifrovaný Apple Keychain & Android Keystore │
│  AsyncStorage      → Lokální databáze rozvrhu, úkolů a nastavení │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Struktura repozitáře

```
├── src/
│   ├── components/         # Znovupoužitelné UI komponenty a modály
│   │   ├── AdaptiveHeader.tsx      # Adaptivní hlavička s profilem a semestrem
│   │   ├── BottomSheet.tsx         # Výsuvný spodní panel pro detail události
│   │   ├── Screen.tsx              # Základní obal s podporou Safe Area Insets
│   │   └── TextbookReaderModal.tsx # Plnohodnotná čtečka uuBookKit materiálů
│   ├── navigation/         # Navigační prvky (spodní tabbar, desktopový sidebar)
│   ├── screens/            # Koncové obrazovky jednotlivých modulů
│   │   ├── DashboardScreen.tsx     # Přehled dne, aktuální blok výuky, rychlé akce
│   │   ├── ScheduleScreen.tsx      # Denní a týdenní rozvrh, navigace na dnešek
│   │   ├── TasksScreen.tsx         # Úkoly, assignmenty a termíny odevzdání
│   │   ├── ExamsScreen.tsx         # Termíny zkoušek a interaktivní checklisty
│   │   └── TextbooksScreen.tsx     # Katalog učebnic dělený podle předmětů
│   ├── services/           # Komunikační adaptéry, autentizace a mezipaměť
│   ├── theme/              # Palety, barvy předmětů, rozestupy, typografie
│   └── types/              # Definice rozhraní a typů (models.ts)
├── electron/               # Desktopový wrapper (main.js, preload.js, HTTP daemon)
├── telemetry-dashboard/    # Lokální vývojový a inspekční server
└── tests/                  # Integrační a jednotkové testy (Node.js test runner)
```

---

## 3. Autentizace a správa sezení

### 3.1 OIDC Authorization Code Flow s PKCE
Autentizace je implementována dle standardu OAuth 2.0 / OpenID Connect za použití rozšíření PKCE (Proof Key for Code Exchange, RFC 7636):
1. Aplikace načte konfigurační dokument z `.well-known/openid-configuration` identity providera Plus4U.
2. Vygeneruje náhodný kryptografický řetězec `code_verifier` a odvodí z něj hodnotu `code_challenge` pomocí SHA-256 (metoda S256).
3. Student je přesměrován na autorizační formulář v zabezpečeném systémovém prohlížeči. Přihlašovací jméno a heslo jsou zpracovány výhradně na serverech Plus4U; aplikace nemá k heslům přístup.
4. Po schválení přesměruje poskytovatel požadavek zpět do aplikace s jednorázovým autorizačním kódem (`code`).
5. Aplikace provede POST požadavek na `/token` endpoint s autorizačním kódem a původním `code_verifier`. Server vrátí `id_token`, `access_token` a `refresh_token`.

### 3.2 Tichá obnova tokenů (Silent Refresh)
Ve výchozím nastavení univerzity vyprší platnost tokenu po 60–90 minutách. Aby uživatel nebyl neustále nucen znovu zadávat přihlašovací údaje, inicializační autorizační požadavek zahrnuje rozsah oprávnění `offline_access`.

Mechanismus tiché obnovy:
- Funkce `checkStoredSessionState()` při každém startu aplikace i před spuštěním synchronizace zkontroluje expiraci přístupového tokenu z jeho JWT payloadu (`exp`).
- Pokud token vypršel nebo do jeho expirace zbývá méně než 120 sekund, aplikace iniciuje požadavek na obnovu:
  ```http
  POST /oauth/v2/token HTTP/1.1
  Content-Type: application/x-www-form-urlencoded

  grant_type=refresh_token&client_id=...&refresh_token=...
  ```
- Získaný nový token je atomicky uložen. Celý proces probíhá na pozadí bez přerušení práce uživatele.
- V případě nedostupnosti sítě se lokální data neodstraňují; aplikace plynule pokračuje v offline režimu z lokální mezipaměti.

### 3.3 Bezpečné úložiště a perzistence přihlášení
Ukládání autorizačních údajů probíhá výhradně prostřednictvím hardwarově zabezpečených úložišť:
- **iOS:** Apple Keychain Services (chráněno přes Secure Enclave).
- **Android:** Android Keystore s hardwarovým šifrováním AES-256 vázaným na zámek zařízení.
- **Desktop:** Izolované šifrované úložiště běžící v kontextu aplikace.

### 3.4 Izolace více uživatelských profilů
Každý záznam v databázi je prefixován unikátním identifikátorem studenta (`uuIdentity`). Pokud zařízení střídá více uživatelů, nedochází k přepisu ani prolínání studijních dat, úkolů či známek mezi jednotlivými identitami.

---

## 4. Integrace se systémy Plus4U a uuApp

Unicorn staví své služby na architektuře uuApp Frameworku. Komunikace probíhá prostřednictvím volání tzv. uuCommandů přes HTTP rozhraní.

### 4.1 Formátování dotazů a serializace dot-notation
Specifikum serverů Plus4U spočívá v požadavku na serializaci parametrů pro GET požadavky. Vnořené objekty musí být serializovány v tečkové notaci (`pageInfo.pageSize=10`) a pole pomocí indexových závorek (`item[0]=val`).

Serializaci provádí funkce `toQuery()` v `src/services/plus4uClient.ts`:

```typescript
export function toQuery(value: any, key: string = ''): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => toQuery(item, `${key}[${i}]`));
  }
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) =>
      toQuery(v, key ? `${key}.${k}` : k)
    );
  }
  return [`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`];
}
```

V případě chyby na straně uuApp vrací server JSON strukturu obsahující chybový kód. Tyto stavy jsou zachytávány v instanci třídy `UuAppError`, což umožňuje aplikaci rozlišit výpadek sítě, nedostatečná oprávnění nebo neexistující záznam a informovat uživatele odpovídajícím způsobem.

### 4.2 Rozvrh a kalendář (Plus4U Digital Workspace)
Načítání rozvrhu probíhá ve dvou krocích:
1. **Vyhledání základní adresy diáře:** Služba `uuPlus4UPeople` je dotázána přes command `personalCard/listMTInfoByUuIdentityList`. Z odpovědi se získá parametr `mtDwBaseUri`.
2. **Načtení událostí:** Získaná adresa se použije pro volání commandu `diary/list` v plovoucím okně -14 až +65 dní.
3. **Parsování učeben a lokací:** Parser v `src/services/plus4uSync.ts` prochází atributy `location` a `activity.location`. Algoritmus identifikuje kódy reálných místností (např. *P301*, *Učebna 3.2*, *LAB1*) a virtuální odkazy na Microsoft Teams, které integruje do karty předmětu.

### 4.3 Úkoly a hodnocení (uuStudyEngine)
- **Zápisy kurzů:** Command `getStudentStudyGroupsAndCourses` mapuje aktivní studijní skupiny studenta v daném semestru.
- **Zadání a odevzdávárny:** Command `assignment/list` načítá oficiální termíny a stavy hodnocení. Aplikace respektuje autoritativní stav ze serveru – otevření zadání studentem neoznačuje úkol za splněný; úkol je označen jako hotový pouze na základě skutečného záznamu o odevzdání.
- **Filtrování podle předmětů:** Na obrazovce `TasksScreen.tsx` je k dispozici horizontální lišta čipů pro rychlé přepínání mezi předměty (např. *Vývoj mobilních aplikací*, *Databázové systémy*, *Frontendové systémy*), včetně počítadel úkolů u každého předmětu.
- **Oznámení a deadliny:** Každý neuzavřený úkol má na kartě zobrazen termín odevzdání, relativní odpočet dnů a indikátor aktivního systémového upozornění (24 hodin před deadlinem v 18:00).
- **Průběžné testy:** Command `step/list` vrací jednotlivé kroky kurzu. Záznamy s parametrem `kind === 'test'` jsou automaticky klasifikovány jako testy a zobrazeny s příslušným označením.

### 4.4 Rezervace zkoušek a interaktivní zápis (uuBookingEngine)
Modul `src/services/bookingEngine.ts` zajišťuje integraci s univerzitním rezervačním systémem pro zkouškové termíny:
- **Striktní oddělení zkoušek od běžných úkolů:** Pomocí funkce `isRealExamOrTest()` jsou zkoušky a testy striktně izolovány od běžného samostudia, cvičení a domácích úkolů. Běžné studijní povinnosti patří do sekce Úkoly, zatímco v sekci Zkoušky se zobrazují výhradně termíny zkoušek, zápočtových testů, ústních obhajob a certifikací.
- **Filtrování zkoušek podle předmětů:** Uživatel může zkoušky i volné termíny filtrovat kliknutím na příslušný předmět v horizontální nabídce.
- **Přehled vypsaných termínů:** Funkce `getAvailableExamSlots()` načítá aktuálně vypsané termíny řádných i opravných zkoušek pro předměty studenta. Každý termín nese metadata o zkoušejícím, přesné učebně, datu a celkové kapacitě míst (`capacity`, `enrolledCount`).
- **Zápis na zkoušku na 1 klik:** Funkce `bookExamSlot()` provádí registraci studenta. Pokud je nakonfigurováno ostré API `BOOKING_ENGINE_BASE_URI`, volá příkaz `booking/create`. Zároveň provede zápis do lokální perzistentní vrstvy (`studentflow.booking.slots.v1`), navýší počet obsazených míst a zařadí zkoušku mezi aktivní položky studenta s vygenerovaným checklistem přípravy.
- **Automatické naplánování notifikace:** Při úspěšném zápisu na termín je okamžitě vyvolána funkce `scheduleExamReminder(exam)`, která do systémového plánovače notifikací zařízení zaregistruje 24hodinové a ranní připomenutí.
- **Odhlášení z termínu:** Funkce `cancelExamSlotBooking()` zruší rezervaci studenta (vzdáleně přes `booking/cancel` i lokálně), uvolní kapacitu pro ostatní studenty a odstraní naplánované notifikace.
- **Uživatelské rozhraní:** V komponentě `ExamScreen.tsx` je implementován segmentový přepínač mezi *„Moje zkoušky“* (osobní harmonogram a checklisty) a *„Zápis na zkoušky (uuBooking)“* (živý přehled volných míst s barevným odlišením kapacity).

### 4.5 Semestrální logika a časová okna
Aby se v rozhraní nezobrazovaly staré záznamy z minulých ročníků, modul `src/services/semester.ts` rozděluje akademický rok:
- **Zimní semestr (ZS):** 1. září – 14. února
- **Letní semestr (LS):** 15. února – 31. srpna

Záznamy spadající mimo aktuální semestr jsou automaticky odfiltrovány z hlavních přehledů a dostupné pouze v sekci archivu.

---

## 5. Offline studijní materiály (uuBookKit)

### 5.1 Načítání a parsování formátu uu5string
Komunikace s knihovnou materiálů probíhá přes službu `src/services/bookKitService.ts`:
- `loadBook`: Získání metadat knihy a podporovaných jazyků.
- `getBookStructure`: Načtení stromové struktury kapitol a stránek.
- `loadPage`: Stažení obsahu konkrétní kapitoly.

Materiály v systému uuBookKit jsou formátovány v jazyce uu5string (proprietární XML formát). Parser odstraňuje systémové značky a transformuje data do strukturovaných odstavců, nadpisů, seznamů a kódových bloků s podporou syntaxe.

### 5.2 Detekce integrity mezipaměti (FNV-1a kontrolní součet)
Pro ochranu lokálně uložených učebnic před nechtěným poškozením souborového systému nebo neautorizovanou modifikací implementuje `textbookService.ts` kontrolní mechanismus:
1. Při stažení knihy je spočítán kontrolní součet pomocí 32bitového hashovacího algoritmu FNV-1a.
2. Vstup je doplněn o privátní sůl vygenerovanou pro dané zařízení a uloženou v `SecureStore`:
   $$\text{hash} = \text{FNV-1a}(\text{salt} + \text{data})$$
3. Před otevřením knihy z paměti aplikace hash ověří. Pokud součet nesouhlasí, mezipaměť je označena jako neplatná a aplikace vyžádá čisté stažení.

### 5.3 Perzistence pozice a stavu čtení
Modul čtečky (`src/components/TextbookReaderModal.tsx`) automaticky ukládá průběh čtení do `AsyncStorage`:
- Index naposledy zobrazené kapitoly.
- Zvolená velikost písma (tři úrovně).
- Stav rozpracovanosti jednotlivých kapitol.
Při dalším otevření se čtečka automaticky vrací na poslední rozečtenou pozici.

---

## 6. Datové modely a struktura úložiště

### 6.1 TypeScript rozhraní (`src/types/models.ts`)

```typescript
export type Subject = {
  id: string;
  name: string;
  weekday: number;        // 2 = Pondělí ... 6 = Pátek
  startMinutes: number;   // minut od půlnoci (např. 540 = 09:00)
  endMinutes: number;     // minut od půlnoci (např. 630 = 10:30)
  location?: string;      // např. "P301" nebo "Online Teams"
  code?: string;          // kód předmětu, např. "B241-VMA"
  teacher?: string;       // jméno vyučujícího
};

export type TaskItem = {
  id: string;
  title: string;
  dueDate: string;        // ISO formát data
  isCompleted: boolean;
  subjectName?: string;
  priority?: 'low' | 'medium' | 'high';
  isDistanceExam?: boolean;
};

export type ExamItem = {
  id: string;
  title: string;
  subjectName: string;
  date: string;           // ISO formát data
  location?: string;
  checklist?: { id: string; title: string; completed: boolean }[];
  isCompleted?: boolean;
};

export type Textbook = {
  id: string;
  subjectId: string;
  subjectName: string;
  code: string;
  title: string;
  author: string;
  sizeKb: number;
  chapters: TextbookChapter[];
  isEnrolled?: boolean;
};
```

### 6.2 Klíče a perzistence v AsyncStorage a SecureStore

| Úložiště | Klíč | Obsah |
| :--- | :--- | :--- |
| `SecureStore` | `studentflow.auth.session_token` | Aktuální přístupový Bearer JWT token |
| `SecureStore` | `studentflow.auth.refresh_token` | Refresh token pro tichou obnovu sezení |
| `SecureStore` | `studentflow.security.anti_tamper_salt` | Kryptografická sůl zařízení pro kontrolní součty |
| `AsyncStorage` | `studentflow.data.v3.${identity}` | Hlavní datový balík studenta (rozvrh, úkoly, zkoušky) |
| `AsyncStorage` | `studentflow.textbooks.meta.${identity}` | Metadata a hashe stažených učebnic |
| `AsyncStorage` | `studentflow.textbook.${bookId}.${identity}` | Serializovaný obsah konkrétní učebnice |
| `AsyncStorage` | `studentflow.reading.progress.${bookId}` | Uložená pozice a velikost písma ve čtečce |
| `AsyncStorage` | `studentflow.booking.slots.v1` | Stav a obsazenost zkouškových slotů pro zápis |

---

## 7. Uživatelské rozhraní a podpora platforem

### 7.1 Mobilní rozhraní (iOS a Android)
- **iOS:** Spodní plovoucí navigační panel s poloprůhledným rozostřením pozadí (`expo-blur`), respektování systémových výřezů displeje (Safe Area Insets) a jemná taktilní odezva při interakcích (`scale: 0.99`).
- **Android:** Navigační lišta dle specifikace Material Design 3, podpora systémového gesta a tlačítka Zpět pro postupné zavírání otevřených modálů a panelů.

### 7.2 Desktopové rozhraní (macOS, Windows, Linux)
- **Boční panel (Sidebar):** Na displejích s šířkou nad 768 px je spodní lišta nahrazena fixním 240px panelem.
- **macOS Window Controls:** Horní odsazení okna (44 px) bere v úvahu nativní ovládací prvky okna macOS (Traffic Lights).
- **Dvousloupcový responzivní layout:** Na šířkách nad 1024 px se obsah dynamicky dělí do dvou logických sloupců s maximálním ohraničením 1440 px pro zachování optimální délky řádku textu.
- **Lokální HTTP daemon v Electronu:** Desktopový balík spouští interní HTTP server na `127.0.0.1`, čímž obchází bezpečnostní restrikce protokolu `file://` a zaručuje bezproblémové načítání fontů a ikon.

### 7.3 Vývojový a telemetrický server
Součástí repozitáře je inspekční server v `telemetry-dashboard/server.mjs`. Běží na portu **3333** bez externích knihoven a prostřednictvím Server-Sent Events (SSE) streamuje probíhající síťová volání a stavy synchronizace do webového prohlížeče pro účely ladění.

---

## 8. Automatizované testování

Projekt obsahuje ucelenou sadu 39 unit testů využívajících nativní testovací modul Node.js (`node:test`):

```bash
npm test
```

### Přehled testovaných modulů:
1. `tests/authExpiry.test.cjs` (4 testy): Expirace tokenů, zachování dat při vypršení, bezchybná obnova přes `refresh_token`.
2. `tests/bookingEngine.test.cjs` (5 testů): Načítání vypsaných termínů, validace kapacity a zápis na zkoušku, odhlášení z termínu, striktní oddělení testů/zkoušek (`isRealExamOrTest`) a úkolů (`isPureTask`).
3. `tests/bookkit.test.cjs` (4 testy): Parsování URL a AWID parametrů, generování stromu kapitol, filtrace uu5 XML značek.
4. `tests/notifications.test.cjs` (7 testů): Plánování ranního souhrnu rozvrhu, filtrace semestru, směrování notifikačních kliknutí.
5. `tests/studyEngine.test.cjs` (12 testů): Autoritativní validace odevzdání prací, deduplikace zkouškových termínů, odolnost vůči výpadkům sítě.
6. `tests/textbookSecurity.test.cjs` (5 testů): FNV-1a kontrolní součet se solí, detekce porušení integrity souborů, automatické generování sylabu.
7. `tests/widgetBridge.test.cjs` (2 testy): Generování a serializace datových snapshotů pro widgety.

Statická typová kontrola:
```bash
npm run typecheck
```

---

## 9. Instalace a příručka pro sestavení

### Systémové požadavky
- **Node.js:** v20+ nebo v22+ LTS
- **npm:** v10+

### Vývojový režim
```bash
# 1. Instalace závislostí
npm install

# 2. Spuštění mobilního serveru Expo
npm start

# 3. Spuštění na iOS simulátoru
npm run ios

# 4. Spuštění na Android emulátoru nebo zařízení
npm run android

# 5. Spuštění desktopové aplikace v Electronu
npm run desktop

# 6. Spuštění webové verze v prohlížeči
npx expo start --web
```

### Sestavení desktopových balíčků
```bash
npm run dist:mac      # Vytvoří instalátor .dmg a archiv .zip pro macOS
npm run dist:win      # Vytvoří instalační .exe a portable verzi pro Windows
npm run dist:linux    # Vytvoří instalační balíčky .AppImage a .deb pro Linux
npm run dist:all      # Sestaví distribuční balíčky pro všechny platformy
```
