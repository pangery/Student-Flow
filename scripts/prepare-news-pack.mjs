#!/usr/bin/env node

/**
 * Script pro přípravu novinky na portálu Unicorn University.
 * Verze 100% BEZ TABLE tagů (které způsobují chybu v uuApp parseru).
 * Používá výhradně stabilní UU5 komponenty: Section, Panel, Card, Header, Paragraph, Ul, Li.
 * Zahrnuje kompletní přehled všech OS: iOS, Android, macOS, Windows, Linux, Web.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const homeDir = os.homedir();
const outputDir = path.join(homeDir, 'Desktop', 'StudentFlow-Novinka');
const projectRoot = path.resolve(import.meta.dirname, '..');

console.log('🚀 Generuji 100% spolehlivou verzi BEZ TABLE komponent pro všechny OS...');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const screenshotName = '01_nahled_aplikace_ios.png';
const screenshotPath = path.join(outputDir, screenshotName);

try {
  execSync(`xcrun simctl io booted screenshot "${screenshotPath}"`, { stdio: 'ignore' });
} catch {
  const scratchScreenshot = path.join(projectRoot, '..', '..', 'brain', '73c86a0d-1dac-4d73-b3cd-f8c1a42145c7', 'scratch', 'ios_simulator_optimized.png');
  if (fs.existsSync(scratchScreenshot)) {
    fs.copyFileSync(scratchScreenshot, screenshotPath);
  }
}

// 100% bezpečná verze bez jakéhokoliv tagu table
const tableFreeUu5String = `<uu5string/>
<UU5.Bricks.Section header="StudentFlow: Multiplatformní asistent pro studenty Unicorn University">

  <UU5.Bricks.Paragraph>
    V rámci studentské iniciativy vznikla aplikace <strong>StudentFlow</strong> – moderní multiplatformní asistent, který sjednocuje veškeré studijní agendy z Plus4U a univerzitních systémů do jednoho rychlého rozhraní s plnou podporou offline režimu.
  </UU5.Bricks.Paragraph>

  <UU5.Bricks.Card colorSchema="blue" bgStyle="outline" elevation="1">
    <UU5.Bricks.Header level="3" content="Proč StudentFlow vzniklo"/>
    <UU5.Bricks.Paragraph>
      Běžný den studenta na Unicorn University dosud vyžadoval neustálé přepínání mezi několika oddělenými webovými systémy. Zjištění učebny znamenalo otevřít diář v <em>Digital Workspace</em>, kontrola termínů úloh vyžadovala přechod do <em>uuStudyEngine</em>, zkoušky byly evidovány v <em>uuBookingEngine</em> a studijní skripta v <em>uuBookKit</em>. K tomu se přidávalo krátkodobé přihlašování, které studenta po 60–90 minutách odhlásilo, a nemožnost číst materiály bez stabilního internetu. StudentFlow všechna tato data konsoliduje do jediného svižného klienta.
    </UU5.Bricks.Paragraph>
  </UU5.Bricks.Card>

  <UU5.Bricks.Header level="2" content="Jak aplikace vypadá (Vizuální náhled)"/>
  <UU5.Bricks.Paragraph>
    Aplikace klade důraz na čisté, minimalistické rozhraní s vysokým kontrastem, tmavým i světlým režimem a okamžitou čitelností nejdůležitějších informací přímo na hlavní ploše:
  </UU5.Bricks.Paragraph>

  <p style="text-align: center; margin: 20px 0;">
    <img src="${screenshotName}" alt="Ukázka StudentFlow na iOS" style="max-width: 100%; max-height: 520px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);" />
    <br/>
    <small><em>Obr. 1: Hlavní obrazovka StudentFlow na mobilním telefonu – denní harmonogram s odpočtem zbývajícího času probíhající hodiny, učebnou a rychlými dlaždicemi.</em></small>
  </p>

  <UU5.Bricks.Header level="2" content="Podpora pro všechny operační systémy"/>
  <UU5.Bricks.Paragraph>
    Aplikace je od základu vyvíjena jako univerzální multiplatformní nástroj přizpůsobený pro každé zařízení:
  </UU5.Bricks.Paragraph>

  <UU5.Bricks.Panel header="Apple iOS (iPhone & iPad)" colorSchema="primary" expanded={true}>
    <UU5.Bricks.Ul>
      <UU5.Bricks.Li><strong>Distribuce:</strong> Nativní mobilní aplikace (Expo Go / TestFlight / IPA).</UU5.Bricks.Li>
      <UU5.Bricks.Li><strong>Zabezpečení:</strong> Ukládání tokenů v hardwarovém <em>Apple Keychain</em> chráněném koprocesorem Secure Enclave.</UU5.Bricks.Li>
      <UU5.Bricks.Li><strong>Ergonomie:</strong> Plovoucí navigační lišta s nativním efektem matného skla (Blur), optimalizace pro Dynamic Island a výřezy displeje, plynulá 120Hz ProMotion odezva.</UU5.Bricks.Li>
    </UU5.Bricks.Ul>
  </UU5.Bricks.Panel>

  <UU5.Bricks.Panel header="Google Android (telefony & tablety)" colorSchema="primary" expanded={true}>
    <UU5.Bricks.Ul>
      <UU5.Bricks.Li><strong>Distribuce:</strong> Nativní instalační balík APK a Google Play.</UU5.Bricks.Li>
      <UU5.Bricks.Li><strong>Zabezpečení:</strong> Využití <em>Android Keystore</em> s hardwarovým šifrováním AES-256 vázaným na zámek zařízení.</UU5.Bricks.Li>
      <UU5.Bricks.Li><strong>Ergonomie:</strong> Uživatelské rozhraní dle specifikace Material 3, plynulá podpora systémového gesta a tlačítka Zpět.</UU5.Bricks.Li>
    </UU5.Bricks.Ul>
  </UU5.Bricks.Panel>

  <UU5.Bricks.Panel header="Apple macOS (Apple Silicon M1/M2/M3/M4 & Intel)" colorSchema="primary" expanded={true}>
    <UU5.Bricks.Ul>
      <UU5.Bricks.Li><strong>Distribuce:</strong> Nativní instalační balíček <code>.dmg</code> a přenosný <code>.zip</code> archiv.</UU5.Bricks.Li>
      <UU5.Bricks.Li><strong>Desktopový design:</strong> Pevný 240px boční navigační panel s respektováním ovládacích prvků okna macOS (Traffic Lights).</UU5.Bricks.Li>
      <UU5.Bricks.Li><strong>Produktivita:</strong> Týdenní mřížka rozvrhu Po–Pá na celou šířku a dvou-sloupcový layout pro velké monitory.</UU5.Bricks.Li>
    </UU5.Bricks.Ul>
  </UU5.Bricks.Panel>

  <UU5.Bricks.Panel header="Microsoft Windows (Windows 10 & 11)" colorSchema="primary" expanded={true}>
    <UU5.Bricks.Ul>
      <UU5.Bricks.Li><strong>Distribuce:</strong> Klasický instalační balíček <code>.exe</code> i přenosná portable verze bez nutnosti instalace.</UU5.Bricks.Li>
      <UU5.Bricks.Li><strong>Výkon:</strong> Běží v optimalizovaném Electron runtime s interním lokálním HTTP daemonem pro bleskové načítání bez zpoždění.</UU5.Bricks.Li>
    </UU5.Bricks.Ul>
  </UU5.Bricks.Panel>

  <UU5.Bricks.Panel header="Linux (Ubuntu, Debian, Fedora, Arch)" colorSchema="primary" expanded={true}>
    <UU5.Bricks.Ul>
      <UU5.Bricks.Li><strong>Distribuce:</strong> Univerzální balíček <code>.AppImage</code> spustitelný na libovolné distribuci a nativní balíček <code>.deb</code>.</UU5.Bricks.Li>
      <UU5.Bricks.Li><strong>Integrace:</strong> Automatické přizpůsobení systémovému tmavému motivu a podpora desktopových notifikací.</UU5.Bricks.Li>
    </UU5.Bricks.Ul>
  </UU5.Bricks.Panel>

  <UU5.Bricks.Panel header="Webový prohlížeč (Web / PWA)" colorSchema="primary" expanded={true}>
    <UU5.Bricks.Ul>
      <UU5.Bricks.Li><strong>Dostupnost:</strong> Okamžitý přístup ze všech běžných prohlížečů (Google Chrome, Apple Safari, Microsoft Edge, Mozilla Firefox) bez nutnosti cokoliv instalovat.</UU5.Bricks.Li>
    </UU5.Bricks.Ul>
  </UU5.Bricks.Panel>

  <UU5.Bricks.Header level="2" content="Sjednocení školních agend do jedné aplikace"/>

  <UU5.Bricks.Panel header="Rozvrh a výuka (Plus4U Digital Workspace)" colorSchema="default" expanded={true}>
    <UU5.Bricks.Paragraph>
      Denní i týdenní harmonogram s automatickou detekcí místností (P301, LAB1, Teams), živým odpočtem minut do konce hodiny a tlačítkem pro okamžitý návrat na dnešní den.
    </UU5.Bricks.Paragraph>
  </UU5.Bricks.Panel>

  <UU5.Bricks.Panel header="Úkoly a assignmenty (uuStudyEngine)" colorSchema="default" expanded={true}>
    <UU5.Bricks.Paragraph>
      Autoritativní seznam odevzdáváren ze školního serveru s barevnými štítky urgence (po termínu, dnes, zítra, hotovo) a automatickým rozpoznáním distančních písemek.
    </UU5.Bricks.Paragraph>
  </UU5.Bricks.Panel>

  <UU5.Bricks.Panel header="Zkouškové termíny (uuBookingEngine)" colorSchema="default" expanded={true}>
    <UU5.Bricks.Paragraph>
      Přehled zarezervovaných i vypsaných zkoušek s odpočtem zbývajících dnů a interaktivními checklisty přípravy s ukazatelem postupu.
    </UU5.Bricks.Paragraph>
  </UU5.Bricks.Panel>

  <UU5.Bricks.Panel header="Studijní skripta a offline čtečka (uuBookKit)" colorSchema="default" expanded={true}>
    <UU5.Bricks.Paragraph>
      Plnohodnotná offline čtečka s možností stáhnout celý předmět jedním kliknutím. Texty jsou očištěny od XML značek, čtečka si pamatuje pozici čtení a stažené soubory jsou chráněny kryptografickým hashem FNV-1a.
    </UU5.Bricks.Paragraph>
  </UU5.Bricks.Panel>

  <UU5.Bricks.Header level="2" content="Bezpečnost a technická kvalita"/>
  <UU5.Bricks.Paragraph>
    Přihlašování probíhá přes oficiální Plus4U autorizační bránu dle standardu <strong>OAuth 2.0 / OpenID Connect s PKCE</strong>. Díky rozšíření <em>offline_access</em> probíhá obnova sezení tiše na pozadí, takže aplikace studenta neodpojuje po 60 minutách.
  </UU5.Bricks.Paragraph>
  <UU5.Bricks.Paragraph>
    Spolehlivost celé aplikace garantuje sada <strong>34 automatických integračních testů</strong> s nulovým počtem typových chyb v TypeScriptu.
  </UU5.Bricks.Paragraph>

  <UU5.Bricks.Panel header="Odkazy a zdrojový kód" colorSchema="blue">
    <UU5.Bricks.Paragraph>
      Kompletní zdrojový kód a instalační návody pro všechny operační systémy:
    </UU5.Bricks.Paragraph>
    <UU5.Bricks.Paragraph>
      👉 <a href="https://github.com/pangery/Student-Flow" target="_blank"><strong>https://github.com/pangery/Student-Flow</strong></a>
    </UU5.Bricks.Paragraph>
  </UU5.Bricks.Panel>

</UU5.Bricks.Section>`;

fs.writeFileSync(path.join(outputDir, 'TEXT_NOVINKY_UU5STRING.txt'), tableFreeUu5String, 'utf8');
fs.writeFileSync(path.join(outputDir, 'TEXT_NOVINKY.uu5string'), tableFreeUu5String, 'utf8');

try {
  execSync('pbcopy', { input: tableFreeUu5String, encoding: 'utf8' });
  console.log('📋 Nový kód (BEZ TABLE) byl zkopírován do schránky (Cmd + V).');
} catch {}

console.log('✅ Hotovo! V novém kódu není žádná komponenta table.');
