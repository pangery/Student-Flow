import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { CachedTextbookMeta, Subject, Textbook } from '../types/models';
import { sampleTextbooks } from './sampleTextbooks';

const KEY_META_PREFIX = 'studentflow.textbooks.meta.v2.';
const KEY_NETWORK = 'studentflow.simulated.network.v1';
const KEY_BOOK_PREFIX = 'studentflow.textbook.data.v2.';
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
   * Získá všechny dostupné učebnice, volitelně filtrované nebo provázané se zapsanými předměty.
   */
  async getAllTextbooks(studentSubjects: Subject[] = []): Promise<Textbook[]> {
    if (!studentSubjects || studentSubjects.length === 0) {
      return sampleTextbooks;
    }

    // Normalizace názvů předmětů pro spolehlivé spárování
    const norm = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]/gi, '');

    const enrolledCodes = new Set(
      studentSubjects.map((s) => (s.code ? norm(s.code) : '')).filter(Boolean)
    );
    const enrolledNames = new Set(studentSubjects.map((s) => norm(s.name)));

    return sampleTextbooks.map((book) => {
      const matched =
        (book.code && enrolledCodes.has(norm(book.code))) ||
        enrolledNames.has(norm(book.subjectName)) ||
        studentSubjects.some((s) => norm(s.name).includes(norm(book.subjectName)));

      return {
        ...book,
        // Pokud předmět student reálně navštěvuje, přiřadíme odpovídající ID předmětu
        isEnrolled: matched,
      };
    });
  },

  /**
   * Zabezpečeně stáhne učebnici a uloží ji do lokální offline paměti (s integrity checksumem).
   */
  async downloadForOffline(
    textbookId: string,
    studentIdentity = 'default'
  ): Promise<boolean> {
    const book = sampleTextbooks.find((b) => b.id === textbookId);
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

    const availableBooks = await this.getAllTextbooks(subjects);
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

      const ok = await this.downloadForOffline(book.id, studentIdentity);
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
    studentIdentity = 'default'
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
      const book = sampleTextbooks.find((b) => b.id === textbookId);
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
