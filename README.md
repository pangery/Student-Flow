# StudentFlow React Native

Společná iOS a Android verze StudentFlow postavená na React Native, Expo development buildu a TypeScriptu.

## První spuštění

1. `npm install`
2. Zkopírovat `.env.example` jako `.env` a doplnit údaje od Plus4U.
3. `npx expo prebuild`
4. `npm run ios` nebo `npm run android`

## Přihlášení

Připraven je Authorization Code Flow s PKCE a callback `studentflow://auth`. Token se ukládá přes `expo-secure-store` do iOS Keychain nebo Android Keystore. Do mobilní aplikace se nevkládá client secret.

## Stav migrace

- přehled studenta
- rozvrh
- úkoly s lokálním dokončením
- zkouškový odpočet
- lokální persistence
- OIDC/PKCE vrstva připravená na údaje od Plus4U

Po přihlášení i obnovení relace se načítají zadání, testy a certifikační zkoušky z uuStudyEngine. Používají se čtecí příkazy `assignment/list`, `certificationExam/list`, `step/list` a `studyGroup/list`, vždy s `studentUuIdentity` z aktuální OIDC relace a se stránkováním. Testy se rozpoznávají podle `kind: test`, nikoli podle názvu. Předmět se propojuje přes `studyGroupOid`; termín pochází z `toTs`. Chybějící datum zůstává neuvedené.

Výchozí školní workspace byl zjištěn z odkazů zadání na uživatelem poskytnuté studentské stránce. Lze ho změnit pomocí `EXPO_PUBLIC_STUDY_ENGINE_BASE_URI`. Konkrétní student ani jeho zadání nejsou v konfiguraci zapsané. Příkazy a datová pole byly ověřeny ve veřejném klientu [uuStudyEngine Core](https://cdng02.plus4u.net/b686718ad49d3ec4d88936576cd830c2/uu-studyengineg01/2.x/uu_studyengineg01-core.min.js) (2.15.0). Jde o interní rozhraní školy, jeho změny mohou vyžadovat úpravu adaptéru.

Školní položky mají odkaz na zadání v Unicornu. Stav a termín se přebírají ze školy; lokální změna splnění, smazání nebo přesunutí školního termínu není dostupná. Vlastní úkoly a termíny zůstávají oddělené a při synchronizaci se zachovají. Prázdné výsledky zůstávají prázdné a chyby API nepřepisují poslední úspěšná školní data. Cache v3 je oddělená podle uuIdentity; starší data odvozovaná z diáře se nepřebírají.

Úkoly a zkoušky se automaticky filtrují podle aktuálního semestru na Unicorn University (harmonogram: Zimní semestr od 1. září do 14. února; Letní semestr od 15. února do 31. srpna). Zadání a zkoušky z předešlých semestrů se v aktivním přehledu nezobrazují, čímž se předchází zahlcení starými položkami. V aplikaci je k dispozici přepínač mezi aktuálním semestrem a archivem.

Rozvrh pochází z Digital Workspace přes Plus4UPeople a ukazuje aktuální týden. Výpadek diáře neblokuje školní úkoly a testy. Učebnice zatím nemají skutečný zdroj a jejich seznam zůstává prázdný.

## Ověření

- `npm run typecheck`
- `npm run test:study`
- Na webu bylo ověřeno skutečné zadání a jeho krok typu test. Přímé otevření API bez bearer tokenu vrací 403; webové přihlášení neověřuje oprávnění mobilního OIDC klienta.
- Zbývá živá kontrola v mobilní aplikaci: přihlásit studenta, synchronizovat, porovnat zadání, předměty, termíny a stavy s Unicornem, ověřit prázdné výsledky, chybu sítě a přepnutí účtu. Automatické testy používají modelové odpovědi, nikoli produkční token nebo studentská data.
