// Leest de Wix-pagina's van de dvd/videoboxen en schrijft data/boxen.json.
// Gebruik: node scripts/boxen-naar-json.mjs box1.html box2.html ... (in volgorde van boxnummer)
// Bronnen:
//   box 1 https://georgehoogenbosch.wixsite.com/media/boxen
//   box 2 https://georgehoogenbosch.wixsite.com/media/kopie-van-box1
//   box 3 https://georgehoogenbosch.wixsite.com/media/kopie-van-box2
//   box 4 https://georgehoogenbosch.wixsite.com/media/kopie-van-box3
//   box 5 https://georgehoogenbosch.wixsite.com/media/kopie-van-box4
// Opbouw per pagina: "Pagina - BoxN", boxnaam, dan kopjes (rubrieken) met daaronder
// regels "1995- Titel" of "- Titel".

import { readFileSync, writeFileSync } from "node:fs";

const ent = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const ACC = { acute: "́", grave: "̀", uml: "̈", circ: "̂", tilde: "̃", cedil: "̧" };
const decode = (t) => t.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
  if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  const a = e.match(/^([a-z])(acute|grave|uml|circ|tilde|cedil)$/i);
  return ent[e.toLowerCase()] ?? (a ? (a[1] + ACC[a[2].toLowerCase()]).normalize("NFC") : m);
});
const regels = (html) => decode(decode(html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
  .replace(/<\/(p|div|li|h\d|span)>|<br\s*\/?>/gi, "\n")
  .replace(/<[^>]+>/g, "")))
  .split("\n").map((r) => r.replace(/[​ ]/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);

const isJaar = (r) => /^\d{4}\s*-/.test(r);
const isStreep = (r) => /^-\s+\S/.test(r);
const isItem = (r) => isJaar(r) || isStreep(r);
const KOPJE_ALTIJD = /^live from abbey road/i;
const netjes = (s) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

// Rubriek → genre (zelfde genres als de rest van de site).
function genreVoor(box, rubriek, titel) {
  const r = (rubriek || "").toLowerCase();
  if (box === 2) return /dokter deen/.test(r) ? "Serie & film" : /moskou/.test(r) ? "Documentaire" : "Muziek";
  if (/drama/.test(r)) return "Serie & film";
  if (/cabaret|oudejaars/.test(r)) return "Amusement";
  if (/koninklijk/.test(r)) return "Koningshuis";
  if (/nieuws|jaaroverzicht/.test(r)) return "Nieuws";
  if (/geschiedenis|kennedy|literatuur|boeken|economie/.test(r) || box === 4) return "Documentaire";
  if (/gala|televizier|tel ring|show|cabaret|conference/i.test(titel)) return "Amusement";
  if (/journaal|nieuwsuur|jaaroverzicht/i.test(titel)) return "Nieuws";
  if (/dwdd|pauw|jinek|zomergasten|college tour/i.test(titel)) return "Talkshow";
  return "Televisie";
}

const uit = [];
process.argv.slice(2).forEach((bestand, i) => {
  const box = i + 1;
  const r = regels(readFileSync(bestand, "utf8"));
  const start = r.findIndex((x) => /^Pagina - Box/i.test(x));
  const eind = r.findIndex((x, j) => j > start && /^bottom of page/i.test(x));
  const lijst = r.slice(start + 1, eind < 0 ? undefined : eind);
  const boxnaam = lijst.shift().replace(/^\d+\.?\s*/, "");
  let rubriek = null, n = 0;
  lijst.forEach((regel, j) => {
    const volgende = lijst[j + 1];
    if (!isItem(regel) && (KOPJE_ALTIJD.test(regel) || (volgende && isItem(volgende)) || !volgende)) {
      // Een kopje — tenzij het de laatste regel is (dan is het een titel zonder jaar).
      if (volgende || KOPJE_ALTIJD.test(regel)) { rubriek = netjes(regel); return; }
    }
    let jaar = null, titel = regel;
    const m = regel.match(/^(\d{4})\s*-\s*(.*)$/);
    if (m) { jaar = Number(m[1]); titel = m[2]; }
    else if (isStreep(regel)) {
      titel = regel.replace(/^-\s+/, "");
      if (rubriek && !titel.toLowerCase().includes(rubriek.toLowerCase())) titel = `${rubriek} - ${titel}`;
    } else if (rubriek && /^live from abbey road/i.test(rubriek)) titel = `${rubriek} - ${titel}`;
    uit.push({
      id: `b${box}-${String(++n).padStart(3, "0")}`,
      titel: titel.trim(),
      jaar,
      box,
      boxnaam,
      ...(rubriek && { rubriek }),
      genre: genreVoor(box, rubriek, titel),
      drager: "dvd/video",
    });
  });
});

writeFileSync(new URL("../data/boxen.json", import.meta.url), JSON.stringify(uit, null, 1) + "\n");
const perBox = {};
uit.forEach((o) => (perBox[o.box] = (perBox[o.box] || 0) + 1));
console.log(`${uit.length} titels in de boxen`, perBox);
