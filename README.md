# TV-Tijdmachine

Blader door decennia televisiegeschiedenis: een privécollectie tv-opnames, jaar voor jaar, met wat er dat jaar gebeurde.

Gewone HTML, CSS en JavaScript, zonder build-stap en zonder afhankelijkheden. Elke host die statische bestanden serveert werkt: Netlify, Cloudflare Pages, GitHub Pages of een eigen server.

## Mappen

| Pad | Wat |
|---|---|
| `index.html`, `css/`, `js/` | De website |
| `data/opnames.json` | De collectie: één regel per opname |
| `data/jaren.json` | Per jaar: een kop en wat er toen gebeurde |
| `scripts/csv-naar-json.mjs` | Zet een CSV-export om naar `data/opnames.json` |
| `scripts/serve.mjs` | Lokale testserver |

## Spraak

Met de microfoonknop naast het zoekveld vraag je iets hardop, bijvoorbeeld: "Laat alle video's van de Rolling Stones zien". De site haalt de losse woorden ("laat", "alle", "video's", ...) weg en zoekt op de rest. Afgekorte titels zoals "Rolling S" en "M Jackson" worden ook gevonden. Dit werkt in Chrome, Edge en Safari. Firefox ondersteunt spraakherkenning niet. De site moet via https draaien, of lokaal via localhost.

## Familievideo's

Opnames die geen tv-uitzending zijn, krijgen genre "Familie" en `"prive": true`. Ze zijn standaard verborgen en verschijnen met het vinkje "Familievideo's". De indeling gebeurt automatisch op basis van de titel; een fout pas je aan in `data/opnames.json` of in de regels van `scripts/wix-naar-json.mjs`.

## Collectie bijwerken vanaf Wix

De volledige lijst staat op https://georgehoogenbosch.wixsite.com/media/kopie-van-home.

```bash
curl -sL -o pagina.html https://georgehoogenbosch.wixsite.com/media/kopie-van-home
node scripts/wix-naar-json.mjs pagina.html
```

Het script voegt dubbele formaten (m4v, mp4, avi, HD) samen tot één opname en bepaalt zender en genre uit de titel.

## Collectie bijwerken vanuit CSV

1. Exporteer de lijst als CSV (Excel: *Opslaan als → CSV*).
2. Voer uit: `node scripts/csv-naar-json.mjs pad/naar/export.csv`
3. Het script meldt welke kolommen het herkent. Bruikbare kolomnamen: titel, zender, datum, jaar, genre, duur, drager, beschrijving, bestand.
4. Commit en push. Netlify zet de nieuwe versie automatisch live.

## Jaarcontext bijwerken

Bewerk `data/jaren.json`:

```json
"1985": { "kop": "Korte titel", "gebeurtenissen": ["Eerste feit", "Tweede feit"] }
```

## Lokaal testen

```bash
node scripts/serve.mjs
```

Open daarna http://localhost:4321.

## Verhuizen naar een andere host

Upload de hele map, zonder `scripts/` en `.claude/`, naar een willekeurige statische host. Er is geen database of server nodig.
