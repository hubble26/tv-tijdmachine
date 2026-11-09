# Overdracht TV-Tijdmachine

Dit document vat alles samen wat op 9 november 2026 is gebouwd en besloten, zodat een nieuwe Claude-sessie (of een andere ontwikkelaar) direct verder kan. Lees dit eerst, daarna `README.md` voor de technische details.

---

## 1. Wat is het?

Een website waarmee je door het tv-archief van George bladert: zelf opgenomen televisie-uitzendingen van 1992 tot nu, plus dvd's en videobanden uit vijf boxen. Per jaar staat er ook "Wat gebeurde er toen?", en bij veel opnames een korte uitleg en afbeelding van Wikipedia. Je kunt zoeken door te typen of door hardop een vraag in te spreken.

| | |
|---|---|
| Live site | https://tv-tijdmachine.netlify.app |
| Code | https://github.com/hubble26/tv-tijdmachine (openbaar) |
| Hosting | Netlify, project `tv-tijdmachine`, op het account van hubble26 |
| Bron van de collectie | De Wix-site https://georgehoogenbosch.wixsite.com/media |

---

## 2. Accounts en toegang

| Dienst | Account | Opmerking |
|---|---|---|
| GitHub | **hubble26** (eigenaar) | Repository `tv-tijdmachine`. |
| GitHub | **Claude_007** (collaborator) | Het account van Alexander. Daarmee is vanaf zijn computer geüpload. |
| Netlify | Ingelogd via GitHub (hubble26) | Elke upload naar `main` staat binnen een minuut automatisch live. Er is geen build-stap. |
| Supabase | **Nog niet aangemaakt** | Nodig voor de familie-inlog (zie actiepunten). |

Wachtwoorden en geheime sleutels staan nergens in dit project, en dat moet zo blijven. Een geheime sleutel hoort alleen in een lokaal bestand `.env`. Dat bestand staat in `.gitignore` en gaat dus nooit naar GitHub.

---

## 3. Hoe het technisch werkt

- **Gewone HTML, CSS en JavaScript**, zonder framework, build-stap of afhankelijkheden. Daardoor kan de site naar elke andere host verhuizen (Cloudflare Pages, GitHub Pages, een eigen server): upload de map en klaar.
- **De data staat in JSON-bestanden** in `data/`, die de browser inlaadt.
- **Scripts in `scripts/`** zetten de Wix-pagina's om naar die JSON-bestanden en voegen de Wikipedia-informatie toe. Ze draaien met Node.js (versie 24 op de computer van Alexander).

### Mappen en bestanden

| Pad | Inhoud |
|---|---|
| `index.html`, `css/style.css`, `js/app.js` | De website |
| `data/opnames.json` | Tv-opnames van de harde schijf: **483**. Alleen openbare tv, zonder familievideo's. |
| `data/boxen.json` | Dvd's en videobanden uit box 1–5: **577** titels, met box, boxnaam en rubriek |
| `data/onderwerpen.json` | **167** Wikipedia-onderwerpen (samenvatting, afbeelding, link). Opnames verwijzen ernaar met het veld `onderwerp`. |
| `data/jaren.json` | "Wat gebeurde er toen?" voor 1992–2025 (kop plus 2–3 feiten per jaar) |
| `prive/prive.json` | **255 familievideo's**. Staat alleen lokaal en in `.gitignore`, dus niet online. |
| `scripts/wix-naar-json.mjs` | Harde-schijflijst van Wix → `data/opnames.json` en `prive/prive.json` |
| `scripts/boxen-naar-json.mjs` | Wix-pagina's van de boxen → `data/boxen.json` |
| `scripts/verrijk-wikipedia.mjs` | Voegt Wikipedia-onderwerpen toe aan beide lijsten |
| `scripts/csv-naar-json.mjs` | Alternatief: een Excel/CSV-export inlezen |
| `scripts/serve.mjs` | Lokale testserver op http://localhost:4321 |

### Collectie bijwerken (handmatig, tot de automatische synchronisatie er is)

```bash
curl -sL -o pagina.html https://georgehoogenbosch.wixsite.com/media/kopie-van-home
node scripts/wix-naar-json.mjs pagina.html
# boxen: download de vijf boxpagina's (adressen staan bovenaan scripts/boxen-naar-json.mjs)
node scripts/boxen-naar-json.mjs box1.html box2.html box3.html box4.html box5.html
node scripts/verrijk-wikipedia.mjs
git add -A && git commit -m "Collectie bijgewerkt" && git push
```

Draai `verrijk-wikipedia.mjs` **altijd na** de Wix-scripts. Anders verdwijnen de Wikipedia-koppelingen.

---

## 4. Wat er op de site zit

- **Voorpagina:**
  - Een tv-toestel dat vanzelf "zapt" langs opnames van deze week in eerdere jaren, met de kop *"Wat was er op tv rond 9 november?"*. Elke dag een andere selectie.
  - Daaronder **de kast**: één videoband per jaar; een dikkere band betekent meer opnames.
  - Daarna rijen per genre met Wikipedia-afbeeldingen.
- **Jaarpagina** (`#/1995`): "Wat gebeurde er toen?" plus alle opnames van dat jaar.
- **Zoeken:**
  - Typen of met de microfoonknop hardop vragen, bijvoorbeeld *"alle video's van de Rolling Stones"*, *"journaals uit de jaren negentig"* of *"Mies Bouwman"*.
  - Herkent afgekorte titels ("M Jackson", "Rolling S", "Zmrgasten") en gesproken jaartallen ("negentien vijfennegentig").
  - Doet een suggestie bij een typfout ("Bedoelde je…?") en zegt hardop hoeveel opnames hij vond.
  - Spraak werkt in Chrome, Edge en Safari, niet in Firefox.
- **Filters:** zender, genre, bron/box, sorteren, en het vinkje "Familievideo's". Dat vinkje is leeg zolang de familie-inlog er niet is.
- **Detailvenster:** datum, zender, genre, box, bestandsformaten, plus de Wikipedia-samenvatting met bronlink.

### Huisstijl (zo gekozen, niet zomaar veranderen)
- Donker tv-meubel (bruin), **amber** knoppen (`#e8a33d`), **fosforgroene** schermtekst (`#b9e4a6`).
- Lettertypes: **VT323** voor koppen en schermtekst, **IBM Plex Sans** voor lopende tekst. Afgeronde vormen.
- Een tussenversie met walnoot, Teletekstkleuren en stiftletters is afgewezen. De opbouw (toestel, kast, rijen) is wel goedgekeurd.

---

## 5. Belangrijke beslissingen en waarom

1. **Alleen een catalogus, geen video's online.** Tv-opnames zijn auteursrechtelijk beschermd. De site toont titels, datums en context, maar geen beeldmateriaal uit de opnames zelf. Video's komen eventueel later, achter een login, in afgeschermde opslag (Cloudflare R2 of Bunny Stream).
2. **Familievideo's niet openbaar.** Ze zijn automatisch herkend als "Familie": alles wat geen tv-uitzending is, zoals verjaardagen, kerst en vakanties. Ze staan alleen in `prive/prive.json`. Ze komen pas weer op de site via een echte inlog. Een vinkje of verborgen knop is geen beveiliging, want de data is dan toch voor iedereen te downloaden.
3. **Wix blijft de bron.** Voor de koppeling met Wix is Airtable niet nodig. Het voorstel is een nachtelijke GitHub Action die de Wix-pagina's ophaalt en de site bijwerkt. Airtable komt pas in beeld als George veel wil corrigeren of aanvullen buiten Wix om.
4. **Wikipedia als verrijking.** De samenvattingen en afbeeldingen komen van de Nederlandse Wikipedia (CC BY-SA), met bronvermelding en link in het detailvenster.
5. **Overdraagbaarheid boven gemak.** Daarom geen framework, geen database voor de openbare data, en Supabase (gewone Postgres) voor de inlog.

---

## 6. Bekende punten en beperkingen

- **58 opnames zijn automatisch aan een Wikipedia-artikel gekoppeld** via zoeken. In het detailvenster staat bij die opnames "mogelijk niet juist". Even nalopen.
- **404 titels hebben geen onderwerp.** Meestal zijn dat titels die te kort of te specifiek zijn. Ze kunnen worden aangevuld in de lijst `ONDERWERPEN` bovenin `scripts/verrijk-wikipedia.mjs`.
- **De genre-indeling is automatisch** en gebeurt op basis van woorden in de titel. Fouten corrigeer je in de regels van `scripts/wix-naar-json.mjs` (`GENRES` en `PRIVE`).
- **De oude familietitels staan nog in de Git-geschiedenis** (commit `7e1000a`). Ze staan ook openbaar op Wix, dus het risico is klein. Opschonen kan alleen met een *force push*, en die herschrijft de geschiedenis. Doe dat alleen bewust.
- **Scripts en dit document zijn openbaar** op GitHub en via Netlify. Daar mag dus nooit iets geheims in komen.
- **"Wat gebeurde er toen?"** is door Claude geschreven op basis van algemene kennis. Even laten nalezen.

---

## 7. Actiepunten voor George

### Nu of binnenkort
- [ ] **Netlify-instellingen laten controleren.** Log in Chrome in op https://app.netlify.com met "Log in with GitHub" (hubble26), zodat Claude de deploys, de build-instellingen en het domein kan nakijken. Dit is nog niet gebeurd.
- [ ] **Supabase-project aanmaken voor de familie-inlog:**
  1. Ga naar https://supabase.com, kies **Start your project** en log in met GitHub (hubble26).
  2. Klik **New project**. Naam `tv-tijdmachine`, regio **Central EU (Frankfurt)**. Kies een databasewachtwoord en bewaar het zelf.
  3. Geef Claude de **Project URL** en de **publishable/anon key**. Die mogen openbaar zijn.
  4. Zet de **secret/service_role key** zelf in een bestand `tv-tijdmachine/.env` als `SUPABASE_SERVICE_KEY=...`. Niet in de chat plakken.
  5. Geef Claude de **e-mailadressen** van de familieleden die toegang krijgen.
- [ ] **De Wikipedia-koppelingen nalopen** die als "mogelijk niet juist" zijn gemarkeerd, plus een steekproef van de genres.
- [ ] **"Wat gebeurde er toen?" nalezen** in `data/jaren.json`.

### Later
- [ ] **Eigen domeinnaam** kiezen en kopen, bijvoorbeeld `tvtijdmachine.nl` (ongeveer €10 per jaar), en aan Netlify koppelen.
- [ ] **Beslissen:** moet de hele site achter een login (route B), of alleen het familiedeel (route A, het advies)?
- [ ] **De Wix-pagina met familietitels afschermen of verbergen**, als die niet openbaar hoort te zijn.
- [ ] **Beslissen of de oude familietitels uit de Git-geschiedenis moeten** (force push).
- [ ] **Eventueel video's online** in afgeschermde opslag, alleen achter de inlog.

---

## 8. Takenlijst voor Claude (volgende sessie)

1. **Netlify nakijken** zodra George in Chrome is ingelogd: laatste deploys, branch `main`, publish directory `.`, geen build-commando, en eventueel het domein.
2. **Familie-inlog bouwen met Supabase**, zodra de gegevens uit actiepunt 2 er zijn:
   - Tabel `prive_opnames`, gevuld vanuit `prive/prive.json` met de service-sleutel uit `.env`, via een nieuw script `scripts/prive-naar-supabase.mjs`.
   - Tabel `toegestaan` (e-mailadressen) en een `security definer`-functie `is_familie()`. Row Level Security op beide tabellen: lezen mag alleen als `is_familie()` waar is.
   - Familieleden vooraf als gebruiker aanmaken. In de site `signInWithOtp({ email, options: { shouldCreateUser: false } })`, zodat alleen bekende adressen een inloglink krijgen.
   - In de site: een knop "Inloggen voor familie" en na inloggen de privétitels ophalen en samenvoegen met `state.opnames`. Het vinkje "Familievideo's" is dan pas zichtbaar.
   - In Supabase Auth als Site URL `https://tv-tijdmachine.netlify.app` instellen, met `http://localhost:4321` als extra redirect.
   - Supabase-js via jsDelivr laden, met een vaste versie.
3. **Nachtelijke Wix-synchronisatie** via GitHub Actions (`.github/workflows/sync.yml`):
   - Wix-pagina's ophalen, de drie scripts draaien, en alleen bij wijzigingen committen en pushen.
   - Zodra de inlog er is: het privédeel naar Supabase sturen, met de service-sleutel als GitHub-secret (die zet George zelf in).
4. **Optioneel:** `scripts/`, `OVERDRACHT.md` en `README.md` uitsluiten van publicatie op Netlify (`netlify.toml`), de lijst `ONDERWERPEN` uitbreiden, en Airtable als correctielaag als George daar behoefte aan heeft.

### Werkafspraken
- **Werk in deze repository.** Test lokaal met `node scripts/serve.mjs` (http://localhost:4321) en push naar `main`. Netlify zet het dan automatisch live.
- **Accounts:** aanmaken, inloggen en geheime sleutels invoeren doet George zelf.
- **Familiedata komt nooit** in `data/` of in Git.
- **Huisstijl:** amber, fosfor, VT323 en IBM Plex Sans. Niet veranderen zonder overleg.
- **Taal:** Nederlands, ook in de code (namen en commentaar zijn Nederlands).

---

## 9. Tijdlijn van 9 november 2026

1. **Inventarisatie en plan:** een catalogus zonder video's, vanwege auteursrecht.
2. **Eerste versie:** een statische site met tijdlijn per jaar, jaarcontext, zoeken en filters.
3. **Accounts:** GitHub-account hubble26 aangemaakt, Claude_007 toegevoegd als collaborator. Eerste upload.
4. **Collectie:** de echte lijst van de harde schijf ingeladen van Wix (795 bestanden → 738 opnames, waarvan 255 familie). Spraakzoeken toegevoegd.
5. **Netlify:** gekoppeld en live op tv-tijdmachine.netlify.app.
6. **Boxen:** in een tweede sessie de dvd- en videoboxen 1–5 toegevoegd (577 titels), plus filters op box, sorteren en betere spraakherkenning.
7. **Privacy:** familievideo's uit de openbare data gehaald.
8. **Wikipedia:** 167 onderwerpen gekoppeld aan de opnames.
9. **Nieuwe voorpagina:** zappend toestel, kast met banden en genre-rijen, daarna terug naar de oorspronkelijke huisstijl.
