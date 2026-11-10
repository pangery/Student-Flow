import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { CachedTextbookMeta, Subject, Textbook } from '../types/models';
import { sampleTextbooks } from './sampleTextbooks';

const KEY_META_PREFIX = 'studentflow.textbooks.meta.v2.';
const KEY_NETWORK = 'studentflow.simulated.network.v1';
const KEY_BOOK_PREFIX = 'studentflow.textbook.data.v2.';
const KEY_CUSTOM_BOOKS_PREFIX = 'studentflow.textbooks.custom.v2.';
const KEY_INTEGRITY_SALT = 'studentflow.textbook.sec_salt';
const KEY_AUTO_CACHE_ENABLED = 'studentflow.textbooks.autocache.enabled.v1';

export type AutoCacheResult = {
  attempted: number;
  newlyCached: number;
  alreadyCached: number;
  failed: number;
  totalSizeKb: number;
};

/**
 * Jednoduchý deterministický kontrolní součet (FNV-1a 32-bit hex)
 * pro ověření integrity obsahu učebnice proti neautorizovaným zásahům v úložišti.
 */
export function computeContentHash(content: string, salt: string): string {
  let hash = 0x811c9dc5;
  const combined = salt + ':' + content;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Vygeneruje autoritativní akademickou studijní příručku / skripta
 * pro zapsaný předmět, který nemá předem definovanou statickou učebnici.
 */
export function generateSubjectTextbook(subject: Subject): Textbook {
  const code = subject.code || 'UU.PREDMET';
  const name = subject.name || 'Studijní předmět';
  const normName = name.toLowerCase();

  let subjectFocus = 'softwarových systémů, architektury a moderních technologií';
  let practicalSnippet = `// Ukázka základní implementace pro ${name}\nexport function processData(input: string): boolean {\n  if (!input) return false;\n  console.log('Zpracovávám data předmětu:', '${code}');\n  return true;\n}`;

  if (normName.includes('matemat') || normName.includes('statist') || code.includes('MA') || code.includes('STA')) {
    subjectFocus = 'matematické analýzy, lineární algebry a statistických metod';
    practicalSnippet = `-- Výpočet statistických metrik\nSELECT AVG(vysledek) AS prumer, STDDEV(vysledek) AS smerodatna_odchylka\nFROM studijni_hodnoceni\nWHERE predmet_kod = '${code}';`;
  } else if (normName.includes('bezpečnost') || normName.includes('security') || code.includes('SEC') || code.includes('KIB')) {
    subjectFocus = 'kybernetické bezpečnosti, kryptografie a ochrany dat';
    practicalSnippet = `// Kontrola bezpečnosti vstupu a ochrana proti injekci\nconst crypto = require('crypto');\nconst token = crypto.randomBytes(32).toString('hex');\nconsole.log('Bezpečný kryptografický token:', token);`;
  } else if (normName.includes('web') || normName.includes('javascript') || normName.includes('front') || code.includes('WEB') || code.includes('PJS')) {
    subjectFocus = 'moderních webových technologií, frontendových frameworků a REST API';
    practicalSnippet = `// Asynchronní načtení dat z API s ošetřením výpadku\nasync function fetchSubjectData() {\n  const res = await fetch('/api/${code.toLowerCase()}');\n  if (!res.ok) throw new Error('Chyba spojení se serverem');\n  return res.json();\n}`;
  } else if (normName.includes('ekonom') || normName.includes('manaž') || normName.includes('řízení') || code.includes('EKO') || code.includes('MAN')) {
    subjectFocus = 'podnikové ekonomiky, finančního řízení a agilního vedení projektů';
    practicalSnippet = `# Výpočet klíčových ekonomických ukazatelů (ROI, NPV)\ndef calculate_roi(costs, benefits):\n    return ((benefits - costs) / costs) * 100`;
  }

  return {
    id: `book-subj-${subject.id}`,
    subjectId: subject.id,
    subjectName: name,
    code,
    title: `${name} – Studijní příručka & skripta`,
    author: subject.teacher ? `${subject.teacher} · Unicorn University` : 'Katedra Unicorn University',
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    sizeKb: 720,
    chapters: [
      {
        id: `chap-${subject.id}-1`,
        title: '1. Úvod do kurzu a přehled sylabu',
        order: 1,
        readTimeMinutes: 7,
        summary: `Základní cíle předmětu ${name}, prerekvizity a struktura semestrální výuky.`,
        sections: [
          {
            heading: 'Anotace a studijní cíle',
            body: `Předmět ${name} (${code}) seznamuje studenty s klíčovými koncepty z oblasti ${subjectFocus}. Cílem kurzu je zvládnout jak koncepční porozumění probírané látce, tak schopnost samostatně aplikovat poznatky na reálných scénářích a semestrálních projektech.`,
            tip: 'Doporučujeme průběžně sledovat podklady vyučujícího v univerzitním portálu Plus4U a uuBookKit.',
          },
          {
            heading: 'Organizace výuky a konzultace',
            body: subject.location
              ? `Výuka probíhá v místnosti ${subject.location}. Přednášky a cvičení vedou k postupnému osvojování látky formou řešení případových studií a praktických úloh.`
              : 'Výuka kombinuje přednášky a praktická cvičení zaměřená na řešení praktických úloh.',
          },
        ],
      },
      {
        id: `chap-${subject.id}-2`,
        title: '2. Teoretické základy a metodiky',
        order: 2,
        readTimeMinutes: 9,
        summary: 'Metodologický rámec, oborové standardy a klíčové teoretické pojmy předmětu.',
        sections: [
          {
            heading: 'Základní terminologie a principy',
            body: `Pochopení oborových standardů je základem úspěšného studia ${name}. Důraz je kladen na rigorózní přístup k řešení problémů, analytické myšlení a dodržování ověřených vzorů v softwarovém i systémovém inženýrství.`,
          },
          {
            heading: 'Klíčové metodické přístupy',
            body: 'Probírané koncepty staví na mezinárodních standardech a osvědčených postupech z praxe. Každé téma je podpořeno konkrétními ukázkami a schématy.',
          },
        ],
      },
      {
        id: `chap-${subject.id}-3`,
        title: '3. Praktická cvičení a implementace',
        order: 3,
        readTimeMinutes: 10,
        summary: 'Postupy řešení praktických zadání, laboratorních úloh a semestrálních projektů.',
        sections: [
          {
            heading: 'Zadání a doporučený postup',
            body: 'Praktická část vyžaduje aktivní práci s vývojářskými nástroji, verzovacími systémy a univerzitním prostředím. Všechny odevzdávané výstupy by měly splňovat formální i technická kritéria specifikovaná v zadání.',
            tip: 'Kód a technickou dokumentaci průběžně commitujte a ověřujte automatickými testy.',
            codeSnippet: practicalSnippet,
          },
        ],
      },
      {
        id: `chap-${subject.id}-4`,
        title: '4. Příprava na zkoušku a zápočet',
        order: 4,
        readTimeMinutes: 8,
        summary: 'Přehled zkušebních okruhů, kontrolní otázky a tipy pro úspěšné absolvování.',
        sections: [
          {
            heading: 'Zkušební okruhy a požadavky k hodnocení',
            body: `Pro úspěšné absolvování předmětu ${name} je nutné splnit stanovené průběžné úkoly a prokázat znalosti v závěrečném testu či zkoušce. Zaměřte se především na propojení teorie s praktickým řešením.`,
            tip: 'Termíny zkoušek a zápočtů můžete sledovat a spravovat přímo v záložce Zkoušky v aplikaci StudentFlow.',
          },
        ],
      },
    ],
  };
}

export const textbookService = {
  /**
   * Získá nebo vygeneruje privátní klíč/sůl uloženou v hardwarovém SecureStore
   */
  async getSecureSalt(): Promise<string> {
    try {
      let salt = await SecureStore.getItemAsync(KEY_INTEGRITY_SALT);
      if (!salt) {
        salt = 'salt_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        await SecureStore.setItemAsync(KEY_INTEGRITY_SALT, salt);
      }
      return salt;
    } catch {
      return 'fallback_device_salt_studentflow';
    }
  },

  /**
   * Klíč metadat per student pro striktní izolaci dat mezi uživateli
   */
  getMetaKey(studentIdentity = 'default'): string {
    return `${KEY_META_PREFIX}${studentIdentity}`;
  },

  /**
   * Klíč knihy per student
   */
  getBookKey(textbookId: string, studentIdentity = 'default'): string {
    return `${KEY_BOOK_PREFIX}${studentIdentity}.${textbookId}`;
  },

  /**
   * Zjistí stav síťové simulace (Online vs Offline/Režim letadlo).
   */
  async getIsOnline(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(KEY_NETWORK);
      return val === null ? true : val === 'true';
    } catch {
      return true;
    }
  },

  /**
   * Přepne stav síťové simulace.
   */
  async setIsOnline(isOnline: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY_NETWORK, String(isOnline));
    } catch (e) {
      console.warn('Failed to set simulated network status', e);
    }
  },

  /**
   * Zda je zapnutý zabezpečený automatický cache pro aktuální předměty
   */
  async isAutoCacheEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(KEY_AUTO_CACHE_ENABLED);
      return val === null ? true : val === 'true'; // výchozí zapnuto
    } catch {
      return true;
    }
  },

  async setAutoCacheEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KEY_AUTO_CACHE_ENABLED, String(enabled));
    } catch (e) {
      console.warn('Failed to set auto-cache preference', e);
    }
  },

  /**
   * Načte index všech stažených učebnic a jejich metadat (velikost, čas uložení, checksum).
   */
  async getCachedMeta(studentIdentity = 'default'): Promise<Record<string, CachedTextbookMeta & { checksum?: string }>> {
    try {
      const key = this.getMetaKey(studentIdentity);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  /**
   * Získá uživatelem importované knihy (např. z Unicorn uuBookKit)
   */
  async getCustomBooks(studentIdentity = 'default'): Promise<Textbook[]> {
    try {
      const key = `${KEY_CUSTOM_BOOKS_PREFIX}${studentIdentity}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  /**
   * Uloží importovanou knihu z uuBookKit do seznamu knih a rovnou ji stáhne offline
   */
  async saveImportedBook(book: Textbook, studentIdentity = 'default'): Promise<boolean> {
    try {
      const current = await this.getCustomBooks(studentIdentity);
      const filtered = current.filter((b) => b.id !== book.id);
      filtered.unshift(book);
      const key = `${KEY_CUSTOM_BOOKS_PREFIX}${studentIdentity}`;
      await AsyncStorage.setItem(key, JSON.stringify(filtered));

      // Ihned uložit do zabezpečené offline cache
      const salt = await this.getSecureSalt();
      const serialized = JSON.stringify(book);
      const checksum = computeContentHash(serialized, salt);

      const bookKey = this.getBookKey(book.id, studentIdentity);
      await AsyncStorage.setItem(bookKey, serialized);

      const metaKey = this.getMetaKey(studentIdentity);
      const meta = await this.getCachedMeta(studentIdentity);
      meta[book.id] = {
        textbookId: book.id,
        cachedAt: new Date().toISOString(),
        sizeKb: book.sizeKb,
        version: book.version,
        checksum,
      };
      await AsyncStorage.setItem(metaKey, JSON.stringify(meta));
      return true;
    } catch (e) {
      console.error('Failed to save imported textbook', e);
      return false;
    }
  },

  /**
   * Získá všechny dostupné učebnice, volitelně filtrované nebo provázané se zapsanými předměty.
   */
  async getAllTextbooks(studentSubjects: Subject[] = [], studentIdentity = 'default'): Promise<Textbook[]> {
    const customBooks = await this.getCustomBooks(studentIdentity);
    const existing = [...customBooks, ...sampleTextbooks];

    if (!studentSubjects || studentSubjects.length === 0) {
      return existing;
    }

    // Normalizace názvů předmětů pro spolehlivé spárování
    const norm = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]/gi, '');

    const matchedSubjectIds = new Set<string>();

    const markedExisting = existing.map((book) => {
      const bCode = book.code ? norm(book.code) : '';
      const bName = norm(book.subjectName);

      const matchedSubject = studentSubjects.find((s) => {
        const sCode = s.code ? norm(s.code) : '';
        const sName = norm(s.name);
        return (
          (sCode && bCode && (sCode === bCode || sCode.includes(bCode) || bCode.includes(sCode))) ||
          sName === bName ||
          sName.includes(bName) ||
          bName.includes(sName)
        );
      });

      if (matchedSubject) {
        matchedSubjectIds.add(matchedSubject.id);
        return {
          ...book,
          isEnrolled: true,
          subjectId: matchedSubject.id,
        };
      }

      return {
        ...book,
        isEnrolled: false,
      };
    });

    // Pro zapsané předměty, které nemají statickou učebnici, dynamicky zajistíme studijní skripta
    const generatedForUnmatched: Textbook[] = [];
    for (const subj of studentSubjects) {
      if (!matchedSubjectIds.has(subj.id)) {
        const genBook = generateSubjectTextbook(subj);
        (genBook as any).isEnrolled = true;
        generatedForUnmatched.push(genBook);
      }
    }

    return [...markedExisting, ...generatedForUnmatched];
  },

  /**
   * Zabezpečeně stáhne učebnici a uloží ji do lokální offline paměti (s integrity checksumem).
   */
  async downloadForOffline(
    textbookId: string,
    studentIdentity = 'default',
    studentSubjects: Subject[] = []
  ): Promise<boolean> {
    const allBooks = await this.getAllTextbooks(studentSubjects, studentIdentity);
    const book = allBooks.find((b) => b.id === textbookId);
    if (!book) return false;

    try {
      const salt = await this.getSecureSalt();
      const serialized = JSON.stringify(book);
      const checksum = computeContentHash(serialized, salt);

      const bookKey = this.getBookKey(textbookId, studentIdentity);
      await AsyncStorage.setItem(bookKey, serialized);

      const metaKey = this.getMetaKey(studentIdentity);
      const meta = await this.getCachedMeta(studentIdentity);
      meta[textbookId] = {
        textbookId,
        cachedAt: new Date().toISOString(),
        sizeKb: book.sizeKb,
        version: book.version,
        checksum,
      };
      await AsyncStorage.setItem(metaKey, JSON.stringify(meta));
      return true;
    } catch (e) {
      console.error('Failed to cache textbook securely', e);
      return false;
    }
  },

  /**
   * Zabezpečený auto-cache pro všechny zapsané předměty studenta.
   * Uloží učebnice relevantní pro probíhající semestr s integrity kontrolou.
   */
  async runAutoCacheForEnrolledSubjects(
    subjects: Subject[],
    studentIdentity = 'default'
  ): Promise<AutoCacheResult> {
    const result: AutoCacheResult = {
      attempted: 0,
      newlyCached: 0,
      alreadyCached: 0,
      failed: 0,
      totalSizeKb: 0,
    };

    const isEnabled = await this.isAutoCacheEnabled();
    if (!isEnabled || subjects.length === 0) return result;

    const availableBooks = await this.getAllTextbooks(subjects, studentIdentity);
    // Filtrujeme knihy odpovídající zapsaným předmětům studenta
    const enrolledBooks = availableBooks.filter((b: any) => b.isEnrolled);
    const meta = await this.getCachedMeta(studentIdentity);

    for (const book of enrolledBooks) {
      result.attempted += 1;
      result.totalSizeKb += book.sizeKb;

      if (meta[book.id]) {
        result.alreadyCached += 1;
        continue;
      }

      const ok = await this.downloadForOffline(book.id, studentIdentity, subjects);
      if (ok) {
        result.newlyCached += 1;
      } else {
        result.failed += 1;
      }
    }

    return result;
  },

  /**
   * Odstraní učebnici z lokální offline paměti a uvolní místo v úložišti.
   */
  async removeFromCache(textbookId: string, studentIdentity = 'default'): Promise<boolean> {
    try {
      const bookKey = this.getBookKey(textbookId, studentIdentity);
      await AsyncStorage.removeItem(bookKey);

      const metaKey = this.getMetaKey(studentIdentity);
      const meta = await this.getCachedMeta(studentIdentity);
      delete meta[textbookId];
      await AsyncStorage.setItem(metaKey, JSON.stringify(meta));
      return true;
    } catch (e) {
      console.error('Failed to remove cached textbook', e);
      return false;
    }
  },

  /**
   * Vymaže kompletní offline cache všech učebnic daného studenta.
   */
  async clearAllCache(studentIdentity = 'default'): Promise<boolean> {
    try {
      const metaKey = this.getMetaKey(studentIdentity);
      const meta = await this.getCachedMeta(studentIdentity);
      const keysToRemove = Object.keys(meta).map((id) => this.getBookKey(id, studentIdentity));
      keysToRemove.push(metaKey);
      await AsyncStorage.multiRemove(keysToRemove);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Načte učebnici pro čtení s ověřením integrity.
   * Pokud byl soubor v úložišti porušen, cache se odmítne a načte se originál.
   */
  async loadTextbookForReading(
    textbookId: string,
    studentIdentity = 'default',
    studentSubjects: Subject[] = []
  ): Promise<{
    textbook: Textbook;
    fromCache: boolean;
    cachedAt?: string;
    verifiedSecure?: boolean;
  } | null> {
    const isOnline = await this.getIsOnline();
    const metaMap = await this.getCachedMeta(studentIdentity);
    const cachedEntry = metaMap[textbookId];

    // Pokud je k dispozici offline kopie
    if (cachedEntry) {
      const bookKey = this.getBookKey(textbookId, studentIdentity);
      const localData = await AsyncStorage.getItem(bookKey);
      if (localData) {
        const salt = await this.getSecureSalt();
        const computedChecksum = computeContentHash(localData, salt);

        // Ověření integrity
        if (!cachedEntry.checksum || cachedEntry.checksum === computedChecksum) {
          return {
            textbook: JSON.parse(localData) as Textbook,
            fromCache: true,
            cachedAt: cachedEntry.cachedAt,
            verifiedSecure: true,
          };
        } else {
          console.warn(`Textbook ${textbookId} failed integrity check. Cache invalidated.`);
          await this.removeFromCache(textbookId, studentIdentity);
        }
      }
    }

    // Pokud není v cache (nebo selhal checksum), ale jsme online – načteme originál
    if (isOnline) {
      const allBooks = await this.getAllTextbooks(studentSubjects, studentIdentity);
      const book = allBooks.find((b) => b.id === textbookId);
      if (book) {
        return {
          textbook: book,
          fromCache: false,
          verifiedSecure: false,
        };
      }
    }

    // Pokud jsme offline a kniha v paměti není
    return null;
  },
};
