# StudentFlow – Podklady a scénář pro prezentaci aplikace

Tento dokument slouží jako tvůj kompletní průvodce a „tahák“ pro schůzku / obhajobu mobilní aplikace **StudentFlow** vyvinuté pro studenty **Unicorn University**.

---

## ⚡ JAK NA SCHŮZCE PŘEDVÉST DEMO PŘIHLÁŠENÍ (Krok za krokem)

V aplikaci je nyní implementována plná **interaktivní simulace přihlášení do Plus4U**:

1. **Výchozí stav na simulátoru:**
   - Aplikace ukazuje oranžový indikátor: *„Z portálu se nic nenačetlo — zkontroluj přihlášení...“* nebo *„Připoj školní účet Plus4U“*.
   - Hodnoty jsou 0 hodin, 0 úkolů zbývá.
2. **Klepnutí na přihlášení:**
   - V simulátoru klikni na **ikonu profilu vpravo nahoře** (nebo na oranžový štítek na hlavní fialové kartě).
   - Otevře se okno **Plus4U OIDC**.
3. **Zadání údajů:**
   - Hned nahoře v sekci **PŘIHLÁŠENÍ K ÚČTU (DEMO PREZENTACE)** jsou připravena pole:
     - **Školní e-mail:** `vasedomena@domena.cz`
     - **Heslo:** `domena.cz`
   - *(Údaje jsou pro pohodlí během prezentace rovnou předvyplněné, takže nemusíš v simulátoru zdlouhavě psát, ale můžeš je ukázat!)*
4. **Ověření a simulace:**
   - Klikni na tlačítko **„Přihlásit se do Plus4U“**.
   - Aplikace na 0,7 s zobrazí reálný indikátor načítání: *„Přihlašuji do Plus4U…“*.
   - Následně proběhne haptická odezva a okno se automaticky zavře.
5. **Oživení celé aplikace (Okamžitý WOW efekt):**
   - Na fialovém banneru se rozsvítí zelená tečka: **Plus4U účet: vasedomena@domena.cz**.
   - V metrikách naskočí: **3 hodiny dnes**, **3 úkoly zbývá**, **1 offline kniha**.
   - V **Dnešním rozvrhu** se objeví 3 přednášky/cvičení s časy a učebnami (např. *Vývoj mobilních aplikací*, *Architektura cloudových systémů*).
   - V **Nejbližším termínu** naskočí deadline za 2 dny (*Odevzdat specifikaci aplikace StudentFlow*).
6. **Předvedení interakce v aplikaci:**
   - **Učebnice & Offline čtení (KLÍČOVÝ TAHOUN):** 
     - Přejdi na záložku **Učebnice** – v horní části ukaž přepínač **Online / Offline**.
     - Přepni na **Offline režim (Letadlo)** – aplikace simuluje nulový signál.
     - Klikni na *„Číst učebnici“* u *Vývoje mobilních aplikací*. Učebnice se bleskově otevře s indikátorem *„Offline kopie (uloženo v zařízení)“*, včetně kapitol a ukázek kódu.
     - Zkus otevřít nestaženou knihu (*Databázové systémy*) – aplikace slušně upozorní, že pro čtení bez internetu je potřeba ji nejprve stáhnout.
     - Přepni zpět na **Online režim** a stiskni *„Stáhnout“* – kniha se během sekundy uloží do paměti a naskočí zelený štítek *„Dostupné offline“*.
   - **Úkoly:** Přejdi dole na záložku **Úkoly** a klikni na libovolný úkol. Okamžitě se odškrtne a přepočítá stav.
   - **Rozvrh:** Přejdi na záložku **Rozvrh** – uvidíš rozvrh na celý týden (Pondělí až Pátek) s časy od–do a místnostmi.
   - **Zkouška:** Přejdi na záložku **Zkouška** – svítí odpočet **16 dní** do zkoušky.
7. **Resetování pro další ukázku:**
   - Kdyby hodnotící chtěl vidět proces přihlášení ještě jednou: klikni na ikonu profilu vpravo nahoře a stiskni červené tlačítko **„Odhlásit účet a smazat data“**. Aplikace se vyčistí do původního stavu.

---

## 1. Výtah v 30 sekundách (Elevator Pitch)

> **„StudentFlow je moderní mobilní asistent pro studenty Unicorn University, který sjednocuje denní rozvrh, studijní úkoly, odpočet ke zkouškám a offline čtečku výukových učebnic uuBookKit do jednoho přehledného a rychlého nativního rozhraní. Aplikace klade důraz na offline-first dostupnost, nativní plynulost a bezpečné propojení se školním účtem Plus4U.“**

---

## 2. Doporučený scénář prezentace

1. **Úvod (1 min):** Vysvětli problém – studenti potřebují rychlý přístup k rozvrhu, úkolům a učebnicím i v metru nebo na cestách bez stabilního signálu.
2. **Přihlášení (1.5 min):** Předveď přihlášení přes `vasedomena@domena.cz` a `domena.cz`, jak je popsáno výše v návodu.
3. **Dashboard (1.5 min):** Projdi karty dnešního dne – 3 hodiny dnes, 3 úkoly zbývá, 1 offline kniha v paměti.
4. **Offline Učebnice & Simulátor (2 min):** Ukaž záložku Učebnice, přepni na Offline mód a otevři mobilní čtečku kapitol. Následně předveď stažení další knihy.
5. **Rozvrh & Místnosti (1 min):** Ukaž týdenní harmonogram a učebny.
6. **Úkoly & Produktivita (1 min):** Interaktivně odškrtni úkol a ukaž přepočet stavu.
7. **Zkouškové období (1 min):** Ukaž odpočet a plánování zkoušek.
8. **Závěr & Dotazy:** Zodpovězení dotazů na bezpečnost a architekturu.

---

## 3. Technická architektura (pro případné otázky)

- **Platforma & UI:** Nativní mobilní aplikace s přizpůsobením pro iOS a Android (SF symboly, dynamické gradienty, haptická odezva `FeedbackHaptics`).
- **Autentizace:** OIDC (OpenID Connect) s PKCE zabezpečením pro školní systém Plus4U.
- **Offline-First & Cache učebnic:** Veškerá data (rozvrh, úkoly, zkoušky a stažené učebnice uuBookKit) se ukládají lokálně v zabezpečeném snapshotu na disku telefonu (`AsyncStorage`). Aplikace nabízí integrovaný síťový simulátor pro demonstraci online vs. offline chování.
- **Odpočty:** Matematický přepočet dnů do deadlinů a zkoušek v milisekundách bez zkreslení časovými pásmy.
