// Zet een CSV-export (Excel, Wix, Airtable) om naar data/opnames.json.
// Gebruik:  node scripts/csv-naar-json.mjs pad/naar/export.csv
// Kolomnamen mogen Nederlands of Engels zijn; zie KOLOMMEN hieronder.

import { readFileSync, writeFileSync } from "node:fs";

const bestand = process.argv[2];
if (!bestand) {
  console.error("Gebruik: node scripts/csv-naar-json.mjs export.csv");
  process.exit(1);
}

let tekst = readFileSync(bestand, "utf8").replace(/^﻿/, "");
const eersteRegel = tekst.split(/\r?\n/, 1)[0];
const scheiding = (eersteRegel.match(/;/g) || []).length > (eersteRegel.match(/,/g) || []).length ? ";" : ",";

function parseCsv(s, sep) {
  const rijen = [];
  let rij = [], veld = "", inQuote = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuote) {
      if (c === '"' && s[i + 1] === '"') { veld += '"'; i++; }
      else if (c === '"') inQuote = false;
      else veld += c;
    } else if (c === '"') inQuote = true;
    else if (c === sep) { rij.push(veld); veld = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      rij.push(veld); rijen.push(rij); rij = []; veld = "";
    } else veld += c;
  }
  if (veld || rij.length) { rij.push(veld); rijen.push(rij); }
  return rijen.filter((r) => r.some((v) => v.trim()));
}

// Welke kolomkop hoort bij welk veld (kleine letters, zonder spaties).
const KOLOMMEN = {
  titel: ["titel", "title", "naam", "programma"],
  zender: ["zender", "omroep", "kanaal", "channel", "station"],
  datum: ["datum", "uitzenddatum", "date", "uitzending"],
  jaar: ["jaar", "year", "jaartal"],
  genre: ["genre", "categorie", "category", "soort"],
  duur: ["duur", "lengte", "duration", "speelduur"],
  drager: ["drager", "medium", "band", "formaat"],
  beschrijving: ["beschrijving", "omschrijving", "description", "inhoud", "notities", "opmerkingen"],
  bestand: ["bestand", "bestandsnaam", "file", "filename"],
};

// Zet 21-02-1985, 21/2/1985 of 1985-02-21 om naar 1985-02-21.
function normaliseerDatum(v) {
  v = (v || "").trim();
  let m;
  if ((m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  if ((m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if ((m = v.match(/^(\d{4})$/))) return m[1];
  return v;
}

const [kop, ...rijen] = parseCsv(tekst, scheiding);
const sleutel = kop.map((k) => k.trim().toLowerCase().replace(/\s+/g, ""));
const index = {};
for (const [veld, namen] of Object.entries(KOLOMMEN)) {
  const i = sleutel.findIndex((k) => namen.includes(k));
  if (i >= 0) index[veld] = i;
}
console.log("Herkende kolommen:", Object.keys(index).join(", ") || "geen");
const onbekend = kop.filter((_, i) => !Object.values(index).includes(i));
if (onbekend.length) console.log("Niet gebruikt:", onbekend.join(", "));

const opnames = rijen.map((r, n) => {
  const o = { id: String(n + 1).padStart(4, "0") };
  for (const [veld, i] of Object.entries(index)) {
    const v = (r[i] || "").trim();
    if (v) o[veld] = v;
  }
  if (o.datum) o.datum = normaliseerDatum(o.datum);
  const jaar = Number(o.jaar || (o.datum || "").match(/\d{4}/)?.[0]);
  o.jaar = jaar || null;
  return o;
}).filter((o) => o.titel);

writeFileSync(new URL("../data/opnames.json", import.meta.url), JSON.stringify(opnames, null, 2) + "\n");
const zonderJaar = opnames.filter((o) => !o.jaar).length;
console.log(`${opnames.length} opnames geschreven naar data/opnames.json` + (zonderJaar ? ` (${zonderJaar} zonder jaar)` : ""));
