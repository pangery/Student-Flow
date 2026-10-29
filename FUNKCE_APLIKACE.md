# Technický a funkční popis aplikace StudentFlow

Tento dokument obsahuje detailní popis všech funkcí mobilní aplikace **StudentFlow** (pro Unicorn University). Popisuje jak uživatelskou funkčnost (co student vidí a může dělat), tak přesnou technickou implementaci v kódu (komponenty, datové modely, výpočty a stav).

---

## Přehled architektury a datového modelu

Aplikace je postavena na **React Native (0.86)**, **Expo SDK 57** a **TypeScriptu**. Veškerá data jsou typově jištěna v souboru `src/types/models.ts`:

- **`Subject`**: Předmět rozvrhu (`id`, `name`, `weekday`, `startMinutes`, `endMinutes`, `location`).
- **`TaskItem`**: Studijní úkol (`id`, `title`, `dueDate`, `isCompleted`).
- **`StudentData`**: Hlavní agregát dat studenta (`subjects`, `tasks`, `examDate`).

---

## 1. Hlavní komponenta a stav aplikace (`App.tsx`)

Hlavní řídicí bod aplikace, který spravuje globální stav, persistenci a navigaci.

### Funkce a stav:
- **`useState<StudentData>(sampleData)`**: Uchovává aktuální data rozvrhu, úkolů a zkoušek. Výchozí stav se plní ze `sampleData.ts`.
- **`useState<boolean>(connected)`**: Indikuje, zda je student přihlášen ke školnímu účtu Plus4U.
- **`useState<boolean | null>(showOnboarding)`**: Řídí zobrazení úvodního průvodce.
- **`saveData(nextData: StudentData)`**:
  - Pomocná asynchronní funkce pro ukládání dat.
  - Provádí `setData(nextData)` pro okamžitou reaktivitu v UI.
  - Volá `AsyncStorage.setItem('studentflow.data.v1', JSON.stringify(nextData))` pro trvalé uložení na disku zařízení.
- **`handleToggleTask(id: string)`**:
  - Přepíná stav úkolu (splněno / nesplněno).
  - V poli `tasks` vyhledá odpovídající ID a invertuje hodnotu `isCompleted: !task.isCompleted`.
  - Následně volá `saveData()`.
- **`handleSetExamDate(date?: string)`**:
  - Aktualizuje cílové datum zkoušky (`examDate`) a uloží jej přes `saveData()`.

### Životní cyklus a inicializace (`useEffect`):
Při spuštění aplikace se paralelně přes `Promise.all` provedou 3 asynchronní operace:
1. `AsyncStorage.getItem('studentflow.data.v1')` – načte uložená data studenta.
2. `AsyncStorage.getItem('studentflow.onboarding.seen.v1')` – zjistí, zda student už viděl Onboarding.
3. `tokenStore.load()` – načte šifrovaný token z Keychainu/Keystore a nastaví `connected = Boolean(token)`.

---

## 2. Dashboard & Denní přehled (`src/screens/DashboardScreen.tsx`)

Centrální obrazovka aplikace, která studentovi poskytuje okamžitý přehled o aktuálním dni.

### Uživatelská funkcionalita:
1. **Unicorn University Hero Banner:** Dynamické přivítání se zelenou/oranžovou tečkou indikující stav propojení se školním účtem Plus4U.
2. **Karty rychlých metrik:**
   - **Počet hodin dnes:** Kolik vyučovacích hodin studenta dnes čeká.
   - **Úkolů zbývá:** Počet aktivních nesplněných úkolů.
3. **Widget dnešního rozvrhu:** Náhled nejbližší dnešní výuky s tlačítkem *„Celý rozvrh“*, které přepne na záložku Rozvrh. Pokud dnes výuka není, zobrazí zprávu *„Dnes nemáš žádnou výuku.“*.
4. **Widget nejbližšího termínu:** Zobrazuje úkol s nejkratším termínem odevzdání a tlačítkem *„Všechny úkoly“*.
5. **Tlačítko „Průvodce“:** V horní liště umožňuje kdykoliv znovu otevřít úvodní Onboarding.
6. **Autentizační akce:** Možnost připojit nebo odpojit školní účet Plus4U.

### Technická logika v kódu:
- **Výpočet dnešního dne:**
  ```typescript
  const today = new Date().getDay() + 1; // Převod z JS indexu (0-6) na modelové číslování dnů
  const todaySubjects = data.subjects.filter((s) => s.weekday === today);
  ```
- **Výpočet nejbližšího úkolu:**
  ```typescript
  const activeTasks = data.tasks.filter((t) => !t.isCompleted);
  const nextTask = [...activeTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  ```
- **Adaptivní rozhraní pro platformu:**
  Komponenta importuje `isIOS` z `src/theme/platform.ts`. Na iOS renderuje jablečný odznak *„Optimalizováno pro iOS 27“* s tmavým safírovým gradientem, na Androidu Material badge s neonově zeleným akcentem.

---

## 3. Týdenní rozvrh výuky (`src/screens/ScheduleScreen.tsx`)

Kompletní akademický rozvrh strukturovaný podle dnů v týdnu.

### Uživatelská funkcionalita:
- Rozdělení na pracovní dny (Pondělí až Pátek).
- Každá lekce obsahuje:
  - Přesný časový rozsah (např. `09:00 - 10:30`).
  - Barevnou vertikální linku oddělující čas od obsahu.
  - Název předmětu (např. *Vývoj mobilních aplikací*).
  - Umístění výuky (učebna, kód budovy nebo příznak *Online*).
- Dny bez předmětů mají čistou kartu s textem *„Bez výuky“*.

### Technická logika v kódu:
- **Matematická funkce pro formátování času (`formatTime`):**
  Časy předmětů jsou v datech uloženy jako celočíselné minuty od půlnoci (např. 540 minut pro 9:00). Funkce provádí matematický přepočet:
  ```typescript
  const formatTime = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  ```
- **Mapování dnů:** Pole dnů `[2, 3, 4, 5, 6]` odpovídá pondělí až pátku. Předměty se pro každý den dynamicky filtrují:
  ```typescript
  const items = subjects.filter((subject) => subject.weekday === day);
  ```

---

## 4. Správa studijních úkolů (`src/screens/TasksScreen.tsx`)

Interaktivní seznam úkolů, projektů a deadlinů.

### Uživatelská funkcionalita:
1. **Souhrnná karta postupu (Overview):**
   - Kruhový/čtvercový ukazatel s celkovým procentem dokončení (např. `33 %`).
   - Dynamický text: Pokud jsou splněny všechny úkoly, napíše *„Všechno máš hotové!“*, jinak *„Plň úkoly krok po kroku“*.
   - Počítadlo: *„X aktivních · Y dokončených“*.
2. **Interaktivní položky úkolů:**
   - Možnost kliknout na zaškrtávátko u kteréhokoliv úkolu.
   - Okamžitá změna ikony na zelenou fajfku.
   - Přeškrtnutí názvu splněného úkolu.
   - Zobrazení termínu odevzdání ve formátu lokalizovaného českého data.

### Technická logika v kódu:
- **Výpočet procentuálního postupu:**
  ```typescript
  const done = tasks.filter((task) => task.isCompleted).length;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  ```
- **Platformní přepínání ikon:**
  Na iOS se renderují ikony SF/Apple stylu (`checkmark-circle` vs `ellipse-outline`), na Androidu čtvercové checkboxy (`checkbox` vs `square-outline`).
- **Odezva na dotyk:**
  Na iOS se využívá plynulé zesvětlení `opacity: 0.6`, na Androidu nativní vlnový efekt `android_ripple={{ color: colors.ripple }}`.

---

## 5. Zkouškový modul & Odpočet (`src/screens/ExamScreen.tsx`)

Modul pro přehled zkouškového období a psychickou přípravu studenta.

### Uživatelská funkcionalita:
1. **Velká hero karta odpočtu:**
   - Zobrazuje velkou číslovku zbývajících dnů (např. `24 dní`) nebo nápis *„Dnes“*.
   - Štítek stavu: Pokud je termín do 3 dnů, svítí varovný štítek `BRZY`, jinak klidný `NAPLÁNOVÁNO`.
   - Plné české datum zkoušky (např. *čtvrtek 1. listopadu 2026*).
2. **Rychlá volba termínu:**
   - Interaktivní tlačítka pro nastavení zkoušky za **7 dní**, **14 dní** nebo **21 dní**.
   - Tlačítko pro vymazání termínu.

### Technická logika v kódu:
- **Přepočet zbývajících dní v milisekundách:**
  ```typescript
  const date = examDate ? new Date(examDate) : undefined;
  const days = date
    ? Math.ceil((date.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
    : undefined;
  ```
  Díky `setHours(0, 0, 0, 0)` se eliminují nepřesnosti způsobené konkrétní denní hodinou a počítají se čisté kalendářní dny ($1\text{ den} = 86\,400\,000\text{ ms}$).
- **Pomocná funkce pro posun data (`setAfter`):**
  ```typescript
  const setAfter = (count: number) => {
    const next = new Date();
    next.setDate(next.getDate() + count);
    onSetDate(next.toISOString());
  };
  ```

---

## 6. Úvodní průvodce – Onboarding (`src/screens/OnboardingScreen.tsx`)

Vizuální seznámení nového studenta s možnostmi aplikace.

### Uživatelská funkcionalita:
- 3 prezentační karty:
  1. **Unicorn University:** Uvítání ve StudentFlow a představení kapesního asistenta.
  2. **Rozvrh & Úkoly:** Vysvětlení přehledu dne, rozvrhu a odpočtu ke zkouškám.
  3. **Plus4U Integrace:** Informace o zabezpečeném školním účtu.
- Krokový indikátor (tečky dole) a tlačítka *„Zpět“* / *„Další“* / *„Začít používat“*.

### Technická logika v kódu:
- **Řízení kroků:** Stav `useState(0)` pro `currentSlide`.
- **Uložení stavu dokončení:**
  Při kliknutí na *„Začít používat“* se zavolá `onComplete()`, která v `App.tsx` zapíše:
  ```typescript
  await AsyncStorage.setItem('studentflow.onboarding.seen.v1', 'true');
  setShowOnboarding(false);
  ```
  Tím je zajištěno, že se průvodce při dalším spuštění již sám neotevře.

---

## 7. Autentizace a bezpečnost Plus4U OIDC (`src/services/auth.ts`)

Zajišťuje bezpečné propojení s identitním systémem školy.

### Použité bezpečnostní standardy:
1. **OpenID Connect (OIDC) s PKCE (`expo-auth-session`):**
   - Využívá se standard **PKCE** (*Proof Key for Code Exchange*, `usePKCE: true`).
   - Mobilní aplikace nemusí obsahovat statický `client_secret`, který by mohl útočník reverzním inženýrstvím získat.
2. **Hardwarově šifrované úložiště (`tokenStore` přes `expo-secure-store`):**
   - Token se **nikdy** neukládá do obyčejného `AsyncStorage`.
   - Na **iOS** se ukládá do **Apple Keychain** chráněného Secure Enclave procesorem.
   - Na **Androidu** se ukládá do **Android Keystore** se systémovým AES šifrováním.

---

## 8. Offline-First architektura

Aplikace je navržena tak, aby student nebyl závislý na dostupnosti internetového připojení:
- Veškeré rozvrhy, úkoly i zkoušky jsou po načtení uloženy lokálně.
- Změna stavu úkolu (zaškrtnutí) se ihned zapíše lokálně, student může aplikaci používat i v suterénních učebnách školy nebo v metru bez signálu.

---

## 9. Modul Učebnice & Offline Cache (`src/screens/TextbooksScreen.tsx`)

Zcela nový modul řešící offline dostupnost výukových materiálů (knih a kurzů **uuBookKit / uuCourseKit**).

### Uživatelská funkcionalita:
1. **Interaktivní simulátor konektivity (Online / Offline přepínač):**
   - V horní kartě umožňuje jedním kliknutím přepnout aplikaci mezi **Online režimem** a **Offline režimem (letadlo)** bez nutnosti vypínat Wi-Fi v telefonu nebo počítači.
   - Demonstruje rozdíl mezi přímým čtením z cloudu a čtením z lokální mezipaměti.
2. **Přehled lokálního úložiště:**
   - Zobrazuje počet stažených knih a celkový objem zabraného místa (např. *1 ze 3 učebnic uložena · 1.4 MB*).
   - Tlačítko pro rychlé vyčištění mezipaměti.
3. **Katalog učebnic k předmětům:**
   - *Vývoj mobilních aplikací* (`UU.APP.DEV`)
   - *Databázové systémy* (`UU.DB.SYS`)
   - *Softwarové inženýrství* (`UU.SWE.ENG`)
4. **Stahování pro offline čtení:**
   - Pokud je aplikace online a kniha není stažena, svítí tlačítko *„Stáhnout“*.
   - Po stažení naskočí zelený štítek *„Dostupné offline“* s přesným časem uložení a ikona pro uvolnění místa.
5. **Integrovaná mobilní čtečka (`src/components/TextbookReaderModal.tsx`):**
   - Rychlé přepínání kapitol pomocí horizontálních záložek.
   - Odhad doby čtení (např. *8 min čtení*).
   - Bloky se shrnutím kapitoly, formátovaný výklad, bloky zdrojového kódu a zvýrazněné tipy.
   - V záhlaví jasně indikuje stav: *„Online verze (live)“* vs *„Offline kopie (uloženo v zařízení)“*.

### Technická logika v kódu:
- **`textbookService.ts`:**
  - `KEY_META = 'studentflow.textbooks.meta.v1'` – mapování stažených učebnic a časových razítek.
  - `KEY_BOOK_PREFIX = 'studentflow.textbook.data.'` – uložení kompletního stromu kapitol a textů v `AsyncStorage`.
  - `loadTextbookForReading(id)` – inteligentní rozhodovací logika: preferuje offline snapshot, při online stavu stahuje live data, při offline bez cache srozumitelně odmítne.

