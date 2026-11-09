// Verrijkt data/opnames.json met een onderwerp van de Nederlandse Wikipedia:
// korte samenvatting, afbeelding en link. Schrijft data/onderwerpen.json.
// Gebruik: node scripts/verrijk-wikipedia.mjs
//
// 1. Eerst de vaste lijst ONDERWERPEN hieronder (zeker juist).
// 2. Lukt dat niet, dan zoekt het script op Wikipedia en accepteert alleen een treffer
//    waarvan de titel duidelijk in de opnametitel voorkomt (gemarkeerd als "zeker": false).

import { readFileSync, writeFileSync } from "node:fs";

const UA = { "User-Agent": "TV-Tijdmachine/1.0 (hobbyproject; https://tv-tijdmachine.netlify.app)" };
// Harde schijf (opnames.json) en dvd/videoboxen (boxen.json) worden allebei verrijkt.
const bestanden = ["opnames.json", "boxen.json"].map((n) => new URL(`../data/${n}`, import.meta.url));
const lijsten = bestanden.map((p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return []; } });
const opnames = lijsten.flat();

// [patroon in de titel, Wikipedia-artikel]. Personen staan vóór programma's,
// zodat "Zomergasten - Harry Mulisch" bij Harry Mulisch uitkomt.
const ONDERWERPEN = [
  [/ischa mey/i, "Ischa Meijer"], [/mulisch/i, "Harry Mulisch"], [/mies bouwman/i, "Mies Bouwman"], [/fasseur/i, "Cees Fasseur"],
  [/w\.? van kooten|kooten.*bie|deksel/i, "Van Kooten en De Bie"], [/wolkers/i, "Jan Wolkers"], [/bomans/i, "Godfried Bomans"],
  [/rademakers/i, "Fons Rademakers"], [/jos brink/i, "Jos Brink"], [/joop vd ende/i, "Joop van den Ende"], [/sonneveld/i, "Wim Sonneveld"],
  [/cruij?ff?/i, "Johan Cruijff"], [/rosanne hertzberger/i, "Rosanne Hertzberger"], [/eberhard/i, "Eberhard van der Laan"],
  [/claudia de breij/i, "Claudia de Breij"], [/rutger hauer/i, "Rutger Hauer"], [/m ?jarre/i, "Jean-Michel Jarre"], [/lubbers/i, "Ruud Lubbers"],
  [/dries v/i, "Dries van Agt"], [/frequin/i, "Willibrord Frequin"], [/tineke de nooij/i, "Tineke de Nooij"], [/wim brands/i, "Wim Brands"],
  [/wim kok/i, "Wim Kok"], [/lebbis/i, "Hans Sibbel"], [/rob de nijs/i, "Rob de Nijs"], [/b buch/i, "Boudewijn Büch"],
  [/oprah/i, "Oprah Winfrey"], [/jackson/i, "Michael Jackson"], [/pink f/i, "Pink Floyd"], [/rolling s|mick jagger|keith richards|ronnie wood|charlie watts/i, "The Rolling Stones"],
  [/\bdoors\b/i, "The Doors"], [/golden earring/i, "Golden Earring"], [/simon ?& ?garf/i, "Simon & Garfunkel"], [/paul simon/i, "Paul Simon (artiest)"],
  [/chuck berry/i, "Chuck Berry"], [/elvis/i, "Elvis Presley"], [/ron?dstadt/i, "Linda Ronstadt"], [/dolly/i, "Dolly Parton"],
  [/fleetw/i, "Fleetwood Mac"], [/beatles|sgt pepper|liverpool/i, "The Beatles"], [/john yoko/i, "John Lennon"], [/live aid/i, "Live Aid"],
  [/bach/i, "Brandenburgse concerten"], [/rock 'n'/i, "Rock-'n-roll"], [/grammy/i, "Grammy Award"], [/bintangs/i, "Bintangs"],
  [/diana/i, "Diana Spencer"], [/beatrix 80|wij zijn 80|zware jas|kon\. beatrix|koningin beatrix/i, "Beatrix der Nederlanden"],
  [/troonsafstand|troonswisseling/i, "Troonswisseling in Nederland (2013)"], [/huwelijk wa|wa en maxima|wa maxima/i, "Máxima Zorreguieta"],
  [/pr maurits|maurits en pr/i, "Maurits van Oranje-Nassau, Van Vollenhoven"], [/prins bernhard|banden v bernhard/i, "Bernhard van Lippe-Biesterfeld"],
  [/prins claus/i, "Claus van Amsberg"], [/prinses irene/i, "Irene van Lippe-Biesterfeld"], [/juliana/i, "Juliana der Nederlanden"],
  [/w alexander/i, "Willem-Alexander der Nederlanden"], [/amalia/i, "Catharina-Amalia der Nederlanden"], [/willem.?a|koning wi|prins willem|drie koningen/i, "Willem-Alexander der Nederlanden"],
  [/queen elizabeth|queen's coronation|unseen queen/i, "Elizabeth II van het Verenigd Koninkrijk"], [/prinsjesdag/i, "Prinsjesdag"],
  [/oranje jaaroverzicht|jaaroverzicht oranje|de oranjes/i, "Nederlands koningshuis"],
  [/watersnood/i, "Evacuatie van het Rivierenland"], [/elfstedentocht/i, "Elfstedentocht 1997"], [/navo top/i, "NAVO-top in Den Haag"],
  [/covid|corona|lockdown|persconferentie rutte|persco|avondklok/i, "Coronapandemie in Nederland"], [/v&d/i, "V&D"], [/bitcoin/i, "Bitcoin"],
  [/brexit/i, "Brexit"], [/kennedy|jfk|zapruder/i, "Moord op John F. Kennedy"], [/nixon|watergate/i, "Watergateschandaal"],
  [/thatcher/i, "Margaret Thatcher"], [/obama/i, "Barack Obama"], [/biden/i, "Joe Biden"], [/reagan|gorbatsjov/i, "Ronald Reagan"],
  [/mlk/i, "Martin Luther King"], [/skripal/i, "Vergiftiging van Sergej en Joelia Skripal"], [/9.?11|ramp-15 jr/i, "Aanslagen op 11 september 2001"],
  [/orson/i, "Orson Welles"], [/warhol/i, "Andy Warhol"], [/escher/i, "M.C. Escher"], [/easy rider/i, "Easy Rider"], [/mr robot/i, "Mr. Robot"],
  [/borgen/i, "Borgen (televisieserie)"], [/for all mankind/i, "For All Mankind"], 
  [/china/i, "China"], [/silicon valley/i, "Silicon Valley"], [/bank of england/i, "Bank of England"], [/facebook/i, "Facebook"],
  [/expo/i, "Expo '92"], [/castilla/i, "Castilla-La Mancha"], [/espa(n|ñ)a 40|democracia/i, "Spaanse transitie naar democratie"],
  [/hitterecord/i, "Hittegolf"], [/crowdstrike/i, "CrowdStrike"], [/bijenkorf/i, "De Bijenkorf (warenhuis)"],
  [/sinterklaas/i, "Intocht van Sinterklaas"], [/polygoon/i, "Polygoonjournaal"], [/america in colou?r/i, "Verenigde Staten"],
  [/zomergasten|zmrgasten/i, "Zomergasten (televisieprogramma)"], [/tegenlicht/i, "Tegenlicht (televisieprogramma)"], [/andere t/i, "Andere Tijden"],
  [/dwdd|wereld draait door/i, "De Wereld Draait Door"], [/jinek/i, "Jinek"], [/nieuwsuur/i, "Nieuwsuur"], [/pauw/i, "Pauw & Witteman"],
  [/buitenhof/i, "Buitenhof (televisieprogramma)"], [/eenvandaag|een vandaag|eenvand/i, "EenVandaag"], [/uur van de w|uur vdwolf/i, "Het Uur van de Wolf (televisieprogramma)"],
  [/2doc/i, "2Doc"], [/televizier|gouden t|g tel|telring/i, "Gouden Televizier-Ring"], [/late night/i, "RTL Late Night"], [/matthijs/i, "Matthijs gaat door"],
  [/ik vertrek/i, "Ik vertrek"], [/radar/i, "Radar (televisieprogramma)"], [/panorama/i, "Panorama (BBC)"], [/argos/i, "Argos (radioprogramma)"],
  [/hart ?van ?nederland/i, "Hart van Nederland"], [/vara/i, "VARA"], [/70 ?jr tv/i, "Televisie in Nederland"], [/sundar pichai/i, "Sundar Pichai"], [/dodenherdenking/i, "Nationale Dodenherdenking"], [/boekenbal|boekenquiz/i, "Boekenweek"], [/sonja b/i, "Sonja Barend"], [/jackie without/i, "Jacqueline Kennedy Onassis"], [/renate ruben/i, "Renate Rubinstein"], [/brood/i, "Herman Brood"], [/fox kids/i, "Fox Kids"], [/spijkers/i, "Spijkers met koppen"],
  [/nos journaal|nos jrn|nos journ|journaal|nos jaaroverzicht|nos uit het leven|uit het leven/i, "NOS Journaal"], [/rtl journaal/i, "RTL Nieuws"],
  [/in europa/i, "Geert Mak"], [/back to the/i, "Popmuziek"], [/huis van oranje/i, "Huis Oranje-Nassau"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = {};

async function samenvatting(titel) {
  if (titel in cache) return cache[titel];
  await sleep(60);
  const r = await fetch(`https://nl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titel.replace(/ /g, "_"))}`, { headers: UA });
  if (!r.ok) return (cache[titel] = null);
  const d = await r.json();
  if (d.type === "disambiguation" || !d.extract) return (cache[titel] = null);
  // De korte samenvatting van de REST-API knipt soms zinnen stuk ("10 uur op NPO 1, ...").
  // Daarom de intro als platte tekst ophalen en zelf de tekst tussen haakjes weghalen.
  await sleep(60);
  const x = await fetch(`https://nl.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(d.title)}`, { headers: UA }).then((r) => r.json()).catch(() => null);
  let intro = Object.values(x?.query?.pages || {})[0]?.extract || d.extract;
  for (let i = 0; i < 3; i++) intro = intro.replace(/\s*\([^()]*\)/g, "");
  intro = intro.replace(/\s+([,.])/g, "$1").replace(/\s+/g, " ").trim();
  let zinnen = intro.match(/[^.!?]+[.!?]+(\s|$)/g) || [intro];
  // Begint de eerste zin halverwege (", was de ..." of "10 uur op NPO 1"), sla die dan over.
  if (!/^\s*[A-ZÀ-Ý"'‘“]/.test(zinnen[0]) && zinnen.length > 1) zinnen = zinnen.slice(1);
  let tekst = "";
  for (const z of zinnen) { if ((tekst + z).length > 320 && tekst) break; tekst += z; }
  return (cache[titel] = {
    titel: d.title,
    samenvatting: tekst.trim(),
    afbeelding: d.thumbnail?.source || null,
    url: d.content_urls?.desktop?.page || `https://nl.wikipedia.org/wiki/${encodeURIComponent(d.title)}`,
  });
}

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

async function zoek(opnametitel) {
  const q = opnametitel.replace(/\b(dl|deel)\s*\d+|\d+\s*van\s*\d+|\b\d+\b|\(.*?\)|\[.*?\]/gi, " ").replace(/\s+/g, " ").trim();
  if (q.length < 4) return null;
  await sleep(60);
  const r = await fetch(`https://nl.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&srsearch=${encodeURIComponent(q)}`, { headers: UA });
  const hit = (await r.json()).query?.search?.[0]?.title;
  if (!hit) return null;
  // Alleen accepteren als de artikeltitel (zonder toevoeging tussen haakjes) letterlijk in de opnametitel staat.
  const kern = norm(hit.replace(/\s*\(.*\)$/, ""));
  const t = norm(opnametitel);
  return kern.length >= 4 && t.includes(kern) && kern.length / t.length >= 0.5 && !/^(reclame|nederland|porselein|de jaren)$/.test(kern) ? hit : null;
}

const onderwerpen = {};
let vast = 0, gezocht = 0, geen = 0;
for (const o of opnames) {
  delete o.onderwerp; delete o.zeker;
  let artikel = ONDERWERPEN.find(([re]) => re.test(o.titel))?.[1];
  let zeker = true;
  if (!artikel) { artikel = await zoek(o.titel); zeker = false; }
  const s = artikel ? await samenvatting(artikel) : null;
  if (!s) { geen++; continue; }
  onderwerpen[s.titel] = s;
  o.onderwerp = s.titel;
  if (!zeker) o.zeker = false;
  zeker ? vast++ : gezocht++;
}

bestanden.forEach((p, i) => lijsten[i].length && writeFileSync(p, JSON.stringify(lijsten[i], null, 1) + "\n"));
// Handmatige correcties die Wikipedia zelf niet goed aanlevert.
if (onderwerpen["Jacqueline Kennedy Onassis"]) onderwerpen["Jacqueline Kennedy Onassis"].samenvatting = "Jacqueline Kennedy Onassis was van 1961 tot 1963 de Amerikaanse first lady, als echtgenote van president John F. Kennedy.";
writeFileSync(new URL("../data/onderwerpen.json", import.meta.url), JSON.stringify(onderwerpen, null, 1) + "\n");
const mislukt = ONDERWERPEN.map(([, a]) => a).filter((a) => a in cache && !cache[a]);
console.log(`${vast} via vaste lijst, ${gezocht} via zoeken (nalopen!), ${geen} zonder onderwerp; ${Object.keys(onderwerpen).length} onderwerpen, ${Object.values(onderwerpen).filter((x) => x.afbeelding).length} met afbeelding.`);
if (mislukt.length) console.log("Niet gevonden op Wikipedia:", [...new Set(mislukt)].join(", "));
