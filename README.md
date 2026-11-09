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

## Collectie bijwerken

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
