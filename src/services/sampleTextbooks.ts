import type { Textbook } from '../types/models';

export const sampleTextbooks: Textbook[] = [
  {
    id: 'book-vma',
    subjectId: '1',
    subjectName: 'Vývoj mobilních aplikací',
    code: 'UU.APP.DEV',
    title: 'Vývoj mobilních aplikací v React Native & Expo',
    author: 'Katedra softwarového inženýrství Unicorn University',
    version: '2.4.0',
    updatedAt: '2026-10-20T10:00:00.000Z',
    sizeKb: 1420,
    chapters: [
      {
        id: 'vma-ch1',
        title: '1. Architektura React Native & Expo SDK 57',
        order: 1,
        readTimeMinutes: 8,
        summary: 'Pochopení principů moderní architektury (Hermes engine, TurboModules a Fabric renderer) v multiplatformních aplikacích.',
        sections: [
          {
            heading: 'Základní stavební kameny',
            body: 'React Native umožňuje psát aplikace v TypeScriptu, které se kompilují a renderují jako nativní prvky operačních systémů iOS a Android. Na rozdíl od hybridních WebView frameworků (jako Cordova či Ionic) používá React Native nativní UI hierarchii.',
            tip: 'Vždy dbejte na oddělení prezentační logiky od datových služeb, aby bylo možné komponenty snadno testovat.',
          },
          {
            heading: 'Nový renderovací engine Fabric a Hermes',
            body: 'V Expo SDK 57 je výchozím JavaScriptovým enginem Hermes, optimalizovaný speciálně pro mobilní zařízení: rychlý start aplikace (TTI - Time to Interactive), nízká paměťová stopa a předkompilovaný bytecode (AOT - Ahead-of-Time).',
            codeSnippet: `// Ověření přítomnosti Hermes engine za běhu\nconst isHermesEnabled = Boolean(global.HermesInternal);\nconsole.log('Hermes runtime:', isHermesEnabled);`,
          },
        ],
      },
      {
        id: 'vma-ch2',
        title: '2. Offline-First architektura a lokální cache',
        order: 2,
        readTimeMinutes: 10,
        summary: 'Jak navrhnout mobilní aplikaci, která funguje bezchybně i v suterénu školy či v metru s nulovým internetovým signálem.',
        sections: [
          {
            heading: 'Princip Stale-While-Revalidate',
            body: 'Aplikace v offline-first architektuře nikdy nečeká na síťový požadavek při vykreslování obrazovky. Okamžitě zobrazí naposledy uložená data z lokálního úložiště (AsyncStorage / SQLite) a na pozadí provede kontrolu změn na serveru.',
            tip: 'Klíčové je uživatele nezahltit chybovými dialogy při výpadku spojení – stačí decentní stavový indikátor.',
          },
          {
            heading: 'Implementace lokální perzistence',
            body: 'V React Native využíváme @react-native-async-storage/async-storage pro strukturovaná data a expo-file-system pro média a rozsáhlejší soubory.',
            codeSnippet: `// Ukázka bezpečného uložení dat\nawait AsyncStorage.setItem('studentflow.cache.v1', JSON.stringify(data));\nconst cached = await AsyncStorage.getItem('studentflow.cache.v1');`,
          },
        ],
      },
      {
        id: 'vma-ch3',
        title: '3. Zabezpečení mobilních aplikací a Plus4U OIDC',
        order: 3,
        readTimeMinutes: 7,
        summary: 'Autentizační standard OpenID Connect s PKCE a hardwarové šifrování tokenů na úrovni čipu zařízení.',
        sections: [
          {
            heading: 'Proč je PKCE nutností',
            body: 'V mobilních aplikacích nelze bezpečně utajit klientské tajemství (client_secret). Proto se používá rozšíření PKCE (Proof Key for Code Exchange), kde klient dynamicky generuje kryptografický code_verifier a code_challenge.',
            tip: 'Nikdy neukládejte citlivé tokeny do obyčejného AsyncStorage. Vždy používejte expo-secure-store.',
          },
          {
            heading: 'Hardware Keychain & Keystore',
            body: 'Na iOS ukládáme tokeny do Apple Keychain chráněného Secure Enclave čipem, na Androidu do Android Keystore s AES-256 šifrováním svázaným s biometrickým zámkem obrazovky.',
          },
        ],
      },
    ],
  },
  {
    id: 'book-dbs',
    title: 'Databázové systémy a moderní persistence',
    subjectId: '2',
    subjectName: 'Databázové systémy',
    code: 'UU.DB.SYS',
    author: 'Katedra databázových technologií Unicorn University',
    version: '1.9.2',
    updatedAt: '2026-10-18T14:30:00.000Z',
    sizeKb: 1180,
    chapters: [
      {
        id: 'dbs-ch1',
        title: '1. Relační algebra a indexování v PostgreSQL',
        order: 1,
        readTimeMinutes: 9,
        summary: 'Jak fungují B-Tree indexy, EXPLAIN ANALYZE a optimalizace dotazů nad velkými tabulkami.',
        sections: [
          {
            heading: 'B-Tree a indexační strategie',
            body: 'B-Tree indexy udržují data v seřazeném stromu s logaritmickou složitostí vyhledávání O(log N). Bez indexu musí databáze provést sekvenční scan celé tabulky (Seq Scan).',
            codeSnippet: `EXPLAIN ANALYZE\nSELECT * FROM student_tasks\nWHERE due_date >= CURRENT_DATE AND is_completed = false;`,
            tip: 'Pozor na over-indexing: každý index zrychluje čtení (SELECT), ale zpomaluje zápisy (INSERT, UPDATE, DELETE).',
          },
        ],
      },
      {
        id: 'dbs-ch2',
        title: '2. ACID vlastnosti a distribuované transakce',
        order: 2,
        readTimeMinutes: 8,
        summary: 'Atomicity, Consistency, Isolation, Durability a CAP teorém v moderních cloudových architekturách.',
        sections: [
          {
            heading: 'Izolační úrovně transakcí',
            body: 'Od Read Uncommitted po Serializable. Zvolená izolační úroveň řeší anomálie jako Dirty Read, Non-repeatable Read a Phantom Read.',
          },
        ],
      },
    ],
  },
  {
    id: 'book-arc',
    title: 'Softwarové architektury v praxi',
    subjectId: '5',
    subjectName: 'Softwarové architektury',
    code: 'UU.ARC.DES',
    author: 'Katedra softwarového inženýrství Unicorn University',
    version: '1.8.0',
    updatedAt: '2026-10-18T14:00:00.000Z',
    sizeKb: 1210,
    chapters: [
      {
        id: 'arc-ch1',
        title: '1. Modulární monolit vs. mikroslužby',
        order: 1,
        readTimeMinutes: 9,
        summary: 'Výhody a limity monolitických a distribuovaných architektur v kontextu škálování.',
        sections: [
          {
            heading: 'Dekompozice domény',
            body: 'Rozdělení systému na kontextové hranice (Bounded Contexts) podle Domain-Driven Design (DDD).',
            tip: 'Začínejte vždy modulárním monolitem, dokud organizační velikost týmu nevyžaduje distribuované nasazení.',
          },
        ],
      },
    ],
  },
  {
    id: 'book-swe',
    title: 'Softwarové inženýrství & Architektura systémů',
    subjectId: '3',
    subjectName: 'Softwarové inženýrství',
    code: 'UU.SWE.ENG',
    author: 'Katedra softwarového inženýrství Unicorn University',
    version: '3.1.0',
    updatedAt: '2026-10-15T09:15:00.000Z',
    sizeKb: 980,
    chapters: [
      {
        id: 'swe-ch1',
        title: '1. Návrhové vzory a Clean Architecture',
        order: 1,
        readTimeMinutes: 7,
        summary: 'Oddělení odpovědností, SOLID principy a dependency injection v moderním TypeScript vývoji.',
        sections: [
          {
            heading: 'Inverze závislostí (Dependency Inversion)',
            body: 'Vysokoúrovňové moduly by neměly záviset na nízkoúrovňových modulech. Oba by měly záviset na abstrakcích (rozhraních).',
            tip: 'Díky rozhraním můžete snadno vyměnit síťovou službu za offline mock během testování.',
          },
        ],
      },
      {
        id: 'swe-ch2',
        title: '2. CI/CD automatizace a kvalita kódu',
        order: 2,
        readTimeMinutes: 6,
        summary: 'Statická analýza, TypeScript typová kontrola a automatizované release pipeline.',
        sections: [
          {
            heading: 'Nepřetržitá integrace',
            body: 'Každý commit prochází automatickými lintery, TypeScript ověřením a sadou unit testů před nasazením do testovacího prostředí.',
          },
        ],
      },
    ],
  },
];
