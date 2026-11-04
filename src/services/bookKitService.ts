/**
 * Integrace s Unicorn uuBookKit pro stahování a offline čtení
 * reálných univerzitních učebnic studenta.
 *
 * Každá učebnice v ekosystému Unicorn běží na bázi uuBookKit s unikátním AWID:
 * https://uuapp.plus4u.net/uu-bookkit-maing01/<awid>/
 */

import type { Textbook, TextbookChapter } from '../types/models';

export type BookUrlParsed = {
  baseUri: string;
  awid: string;
  pageCode?: string | null;
};

/**
 * Předpřipravené reálné univerzitní učebnice Unicorn University
 */
export const KNOWN_UNICORN_BOOKS = [
  {
    awid: '8962d5830fac414698f0d1ade5b2ca2c',
    subjectCode: 'SWQ',
    subjectName: 'Backend Systems & Vývoj aplikací',
    baseUri: 'https://uuapp.plus4u.net/uu-bookkit-maing01/8962d5830fac414698f0d1ade5b2ca2c/',
    startPage: '59871216',
    title: 'Backend Systems & Architecture',
  },
];

/**
 * Parsuje odkaz na uuBookKit nebo přímo 32-znakový hex AWID.
 * Podporuje standardní Plus4U uuBookKit URL formáty:
 * - https://uuapp.plus4u.net/uu-bookkit-maing01/<awid>/...
 * - https://plus4u.net/ues/ses/book/<awid>...
 * - čistý 32-znakový hex kód
 */
export function parseBookUrl(urlOrAwid: string): BookUrlParsed | null {
  if (!urlOrAwid) return null;
  const str = urlOrAwid.trim();

  // Čistý 32-znakový hex awid
  if (/^[0-9a-fA-F]{32}$/.test(str)) {
    return {
      awid: str.toLowerCase(),
      baseUri: `https://uuapp.plus4u.net/uu-bookkit-maing01/${str.toLowerCase()}/`,
      pageCode: null,
    };
  }

  // URL uu-bookkit-maing01
  const m = str.match(/^(https:\/\/[^/]+\/uu-bookkit-maing01\/([0-9a-fA-F]{32}))(\/[^?#]*)?(\?[^#]*)?/i);
  if (m && m[2]) {
    const awid = m[2].toLowerCase();
    const query = new URLSearchParams(m[4] ?? '');
    const pageCode = query.get('code') || query.get('page');
    return {
      baseUri: `https://uuapp.plus4u.net/uu-bookkit-maing01/${awid}/`,
      awid,
      pageCode,
    };
  }

  return null;
}

/**
 * Text v aktuálním jazyce z LSI objektu { en: "...", cs: "..." }.
 */
export function lsi(value: any, language = 'cs'): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[language] ?? value.cs ?? value.en ?? Object.values(value)[0] ?? '';
}

/**
 * Převede uu5string/XML z uuBookKit do strukturovaných sekcí s nadpisem a čistým textem.
 */
export function parseUu5Sections(rawUu5: string): { heading: string; body: string; codeSnippet?: string; tip?: string }[] {
  if (!rawUu5) return [];

  // Nahradíme escapované uvozovky
  const unescaped = rawUu5.replace(/\\"/g, '"');
  const sections: { heading: string; body: string; codeSnippet?: string; tip?: string }[] = [];

  // 1. Zkusíme vytáhnout explicitní sekce <UU5.Bricks.Section header="...">
  const sectionRegex = /<UU5\.Bricks\.Section[^>]*header="([^"]+)"[^>]*>([\s\S]*?)<\/UU5\.Bricks\.Section>/g;
  let match;
  while ((match = sectionRegex.exec(unescaped)) !== null) {
    const header = match[1] || '';
    const rawBody = match[2] || '';

    // Detekce kódu uvnitř sekce
    let codeSnippet: string | undefined;
    const codeMatch = rawBody.match(/<UU5\.Bricks\.Code[^>]*>([\s\S]*?)<\/UU5\.Bricks\.Code>/);
    if (codeMatch && codeMatch[1]) {
      codeSnippet = codeMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Čistý text
    const cleanBody = rawBody
      .replace(/<UU5\.Bricks\.Code[\s\S]*?<\/UU5\.Bricks\.Code>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    if (header && (cleanBody || codeSnippet)) {
      sections.push({
        heading: header,
        body: cleanBody || 'Podrobnosti v materiálech předmětu.',
        codeSnippet,
      });
    }
  }

  // 2. Fallback pokud nejsou použity Section komponenty: odfiltrovat tagy a rozdělit po odstavcích
  if (sections.length === 0) {
    const paragraphs = unescaped
      .replace(/<UU5\.Bricks\.P[^>]*>/gi, '\n\n')
      .replace(/<\/UU5\.Bricks\.P>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .split(/\n\n+/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 15);

    if (paragraphs.length > 0) {
      paragraphs.forEach((p, idx) => {
        sections.push({
          heading: idx === 0 ? 'Úvod a přehled' : `Kapitola ${idx + 1}`,
          body: p,
        });
      });
    } else {
      const allText = unescaped.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (allText) {
        sections.push({
          heading: 'Obsah učebnice',
          body: allText,
        });
      }
    }
  }

  return sections;
}

/**
 * Sestaví seřazený seznam stránek podle vazeb previous/next v itemMap.
 */
export function toPageList(structure: any, language = 'cs'): { code: string; title: string; indent: number }[] {
  const map = structure?.itemMap ?? {};
  const codes = Object.keys(map);
  const ordered: string[] = [];
  const seen = new Set<string>();

  // Začátek řetězu: stránka bez předchozí v mapě
  let code = codes.find((c) => !map[c]?.previous || !map[map[c].previous]);
  while (code && map[code] && !seen.has(code)) {
    seen.add(code);
    ordered.push(code);
    code = map[code].next;
  }

  // Doplnění zbývajících stránek
  codes.filter((c) => !seen.has(c)).forEach((c) => ordered.push(c));

  return ordered
    .filter((c) => map[c]?.visible !== false)
    .map((c) => ({
      code: c,
      title: lsi(map[c]?.label ?? map[c]?.name, language) || '(bez názvu)',
      indent: Number(map[c]?.indent ?? 0),
    }));
}

/**
 * Klient pro volání uuBookKit příkazů
 */
export const bookKitService = {
  /**
   * Načte základní metadata knihy (loadBook je veřejný nebo autorizovaný)
   */
  async loadBook(baseUri: string, token?: string): Promise<any> {
    const url = baseUri.replace(/\/?$/, '/') + 'loadBook';
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Chyba načítání knihy (${res.status}): ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Načte strukturu knihy (vyžaduje Bearer token studenta)
   */
  async getBookStructure(baseUri: string, token?: string): Promise<any> {
    const url = baseUri.replace(/\/?$/, '/') + 'getBookStructure';
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Chyba struktury knihy (${res.status}): Vyžaduje přihlášení studenta k Plus4U.`);
    }
    const data = await res.json();
    if (data.uuAppErrorMap && Object.keys(data.uuAppErrorMap).length > 0) {
      const err = Object.values(data.uuAppErrorMap)[0] as any;
      throw new Error(err?.message || 'Chyba autorizace uuBookKit');
    }
    return data;
  },

  /**
   * Načte obsah konkrétní stránky knihy
   */
  async loadPage(baseUri: string, code: string, token?: string): Promise<any> {
    const url = baseUri.replace(/\/?$/, '/') + 'loadPage?code=' + encodeURIComponent(code);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Chyba stránky ${code} (${res.status})`);
    }
    return res.json();
  },

  /**
   * Stáhne kompletní učebnici z Unicorn uuBookKit a sestaví standardizovaný model Textbook
   */
  async fetchCompleteBook(
    urlOrAwid: string,
    token?: string,
    onProgress?: (done: number, total: number, title: string) => void
  ): Promise<Textbook> {
    const parsed = parseBookUrl(urlOrAwid);
    if (!parsed) {
      throw new Error('Neplatný odkaz nebo AWID učebnice. Zadej platnou adresu uuBookKit.');
    }

    const { baseUri, awid } = parsed;

    // 1. Načtení informací o knize
    const bookInfo = await this.loadBook(baseUri, token);
    const language = bookInfo.languages?.[0] ?? 'cs';
    const bookTitle = lsi(bookInfo.name, language) || 'Učebnice Unicorn University';
    const author = 'Unicorn University / uuBookKit';
    const version = `rev.${bookInfo.sys?.rev ?? 1}`;

    // 2. Načtení struktury kapitol
    let pages: { code: string; title: string; indent: number }[] = [];
    try {
      const structure = await this.getBookStructure(baseUri, token);
      pages = toPageList(structure, language);
    } catch (e: any) {
      // Pokud nemáme token nebo autorizaci ke kompletní struktuře, zkusíme intro
      console.warn('Nepodařilo se načíst getBookStructure, použije se intro:', e.message);
    }

    const chapters: TextbookChapter[] = [];

    // Pokud nemáme strukturu (např. nepodepsaný token), použijeme úvodní obsah z loadBook
    if (pages.length === 0) {
      const introUu5 = bookInfo.intro?.content || '';
      const introSections = parseUu5Sections(introUu5);

      chapters.push({
        id: `chap_${awid}_intro`,
        title: 'Úvod a přehled kurzu',
        order: 1,
        readTimeMinutes: Math.max(5, Math.ceil(introSections.reduce((acc, s) => acc + s.body.length, 0) / 700)),
        summary: `Základní přehled učebnice ${bookTitle}`,
        sections: introSections.length > 0 ? introSections : [
          {
            heading: 'O učebnici',
            body: 'Tato učebnice byla načtena přímo z Unicorn uuBookKit. Pro stažení všech kapitol se přihlas ke školnímu účtu.',
          },
        ],
      });
    } else {
      // 3. Stahování jednotlivých stránek s hlášením postupu
      const total = Math.min(pages.length, 30); // Bezpečnostní limit na max 30 stránek
      for (let i = 0; i < total; i++) {
        const page = pages[i];
        if (!page) continue;
        if (onProgress) {
          onProgress(i + 1, total, page.title);
        }

        try {
          const pageData = await this.loadPage(baseUri, page.code, token);
          const content = pageData.content || pageData.sys?.content || '';
          const sections = parseUu5Sections(content);

          chapters.push({
            id: `chap_${awid}_${page.code}`,
            title: page.title,
            order: i + 1,
            readTimeMinutes: Math.max(4, Math.ceil(sections.reduce((acc, s) => acc + s.body.length, 0) / 700)),
            summary: sections[0]?.body?.slice(0, 160) || `Kapitola ${page.title}`,
            sections: sections.length > 0 ? sections : [
              {
                heading: page.title,
                body: 'Kapitola byla úspěšně stažena z univerzitního portálu.',
              },
            ],
          });
        } catch {
          // Fallback pokud selže načtení konkrétní stránky
          chapters.push({
            id: `chap_${awid}_${page.code}`,
            title: page.title,
            order: i + 1,
            readTimeMinutes: 5,
            summary: page.title,
            sections: [
              {
                heading: page.title,
                body: 'Obsah kapitoly je dostupný v online studijním portálu předmětu.',
              },
            ],
          });
        }
      }
    }

    const totalChars = chapters.reduce((acc, c) => acc + c.sections.reduce((sAcc, s) => sAcc + s.body.length, 0), 0);
    const estimatedKb = Math.max(64, Math.round(totalChars / 1024));

    return {
      id: `uubook_${awid}`,
      subjectId: `subj_${awid.slice(0, 8)}`,
      subjectName: bookTitle,
      code: 'UU-BOOK',
      title: bookTitle,
      author,
      version,
      updatedAt: new Date().toISOString(),
      sizeKb: estimatedKb,
      chapters,
    };
  },
};
