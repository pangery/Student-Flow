const test = require('node:test');
const assert = require('node:assert/strict');

// Re-implement or test pure logic functions from bookKitService
function parseBookUrl(urlOrAwid) {
  if (!urlOrAwid) return null;
  const str = urlOrAwid.trim();
  if (/^[0-9a-fA-F]{32}$/.test(str)) {
    return {
      awid: str.toLowerCase(),
      baseUri: `https://uuapp.plus4u.net/uu-bookkit-maing01/${str.toLowerCase()}/`,
      pageCode: null,
    };
  }
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

function lsi(value, language = 'cs') {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[language] ?? value.cs ?? value.en ?? Object.values(value)[0] ?? '';
}

function toPageList(structure, language = 'cs') {
  const map = structure?.itemMap ?? {};
  const codes = Object.keys(map);
  const ordered = [];
  const seen = new Set();
  let code = codes.find((c) => !map[c]?.previous || !map[map[c].previous]);
  while (code && map[code] && !seen.has(code)) {
    seen.add(code);
    ordered.push(code);
    code = map[code].next;
  }
  codes.filter((c) => !seen.has(c)).forEach((c) => ordered.push(c));
  return ordered
    .filter((c) => map[c]?.visible !== false)
    .map((c) => ({
      code: c,
      title: lsi(map[c]?.label ?? map[c]?.name, language) || '(bez názvu)',
      indent: Number(map[c]?.indent ?? 0),
    }));
}

function parseUu5Sections(rawUu5) {
  if (!rawUu5) return [];
  const unescaped = rawUu5.replace(/\\"/g, '"');
  const sections = [];
  const sectionRegex = /<UU5\.Bricks\.Section[^>]*header="([^"]+)"[^>]*>([\s\S]*?)<\/UU5\.Bricks\.Section>/g;
  let match;
  while ((match = sectionRegex.exec(unescaped)) !== null) {
    const header = match[1] || '';
    const rawBody = match[2] || '';
    let codeSnippet;
    const codeMatch = rawBody.match(/<UU5\.Bricks\.Code[^>]*>([\s\S]*?)<\/UU5\.Bricks\.Code>/);
    if (codeMatch && codeMatch[1]) {
      codeSnippet = codeMatch[1].replace(/<[^>]+>/g, '').trim();
    }
    const cleanBody = rawBody
      .replace(/<UU5\.Bricks\.Code[\s\S]*?<\/UU5\.Bricks\.Code>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (header && (cleanBody || codeSnippet)) {
      sections.push({
        heading: header,
        body: cleanBody,
        codeSnippet,
      });
    }
  }
  return sections;
}

test('parseBookUrl extracts baseUri and awid correctly from standard uuBookKit URLs and bare AWID', () => {
  const rawAwid = '8962d5830fac414698f0d1ade5b2ca2c';
  const res1 = parseBookUrl(rawAwid);
  assert.ok(res1);
  assert.equal(res1.awid, rawAwid);
  assert.equal(res1.baseUri, `https://uuapp.plus4u.net/uu-bookkit-maing01/${rawAwid}/`);

  const fullUrl = 'https://uuapp.plus4u.net/uu-bookkit-maing01/8962d5830fac414698f0d1ade5b2ca2c/book/page?code=59871216';
  const res2 = parseBookUrl(fullUrl);
  assert.ok(res2);
  assert.equal(res2.awid, rawAwid);
  assert.equal(res2.pageCode, '59871216');

  assert.equal(parseBookUrl('invalid-url-string'), null);
});

test('toPageList creates correctly chained and ordered table of contents', () => {
  const structure = {
    itemMap: {
      p2: { label: { cs: 'Kapitola 2' }, previous: 'p1', next: 'p3', indent: 0 },
      p1: { label: { cs: 'Úvod' }, next: 'p2', indent: 0 },
      p3: { label: { cs: 'Závěr' }, previous: 'p2', indent: 0 },
    },
  };
  const list = toPageList(structure, 'cs');
  assert.equal(list.length, 3);
  assert.equal(list[0].code, 'p1');
  assert.equal(list[0].title, 'Úvod');
  assert.equal(list[1].code, 'p2');
  assert.equal(list[1].title, 'Kapitola 2');
  assert.equal(list[2].code, 'p3');
  assert.equal(list[2].title, 'Závěr');
});

test('parseUu5Sections strips XML tags and produces clean chapter sections and code blocks', () => {
  const sample = `<uu5string/><UU5.Bricks.Section header="Architektura mikroslužeb"><UU5.Bricks.P>Základní principy komunikace mezi službami.</UU5.Bricks.P><UU5.Bricks.Code>const app = express();</UU5.Bricks.Code></UU5.Bricks.Section>`;
  const sections = parseUu5Sections(sample);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].heading, 'Architektura mikroslužeb');
  assert.equal(sections[0].body, 'Základní principy komunikace mezi službami.');
  assert.equal(sections[0].codeSnippet, 'const app = express();');
});
