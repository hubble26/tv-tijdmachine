// Leest de bestandslijst van de Wix-pagina (opgeslagen HTML) en schrijft data/opnames.json.
// Gebruik: node scripts/wix-naar-json.mjs pagina.html
// Elke regel is een bestandsnaam zoals "1995 07 30 Zomergasten - Harry Mulisch.m4v".
// Dezelfde opname in meerdere formaten (m4v/mp4/avi/HD) wordt samengevoegd tot één regel.

import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync(process.argv[2], "utf8");
const ent = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
// Letters met accenten (&ntilde; &ouml; &aacute; ...)
const ACC = { acute: "́", grave: "̀", uml: "̈", circ: "̂", tilde: "̃", cedil: "̧" };
const entiteit = (e) => ent[e.toLowerCase()] ?? (e.match(/^([a-z])(acute|grave|uml|circ|tilde|cedil)$/i) ? (e[0] + ACC[e.slice(1).toLowerCase()]).normalize("NFC") : null);
const decode = (t) => t.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : entiteit(e) ?? m);
const tekst = decode(decode(html
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
  .replace(/<\/(p|div|li|h\d|span)>|<br\s*\/?>/gi, "\n")
  .replace(/<[^>]+>/g, "")))
  .replace(/[​ ]/g, " ");

const EXT = /\.(m4v|mp4|avi|mpg|mov|m2t|asf|rm|scn|mp3|mkv|wmv)(\.(rm|scn))?$/i;
const regels = [...new Set(tekst.split("\n").map((r) => r.trim()).filter(Boolean))];
const start = regels.findIndex((r) => /^1992 /.test(r));
const lijst = regels.slice(start).filter((r) => EXT.test(r) || /^(\d{4} |La noche|Covid|BBC|Film)/.test(r));

const MAAND = { jan: 1, feb: 2, mrt: 3, apr: 4, mei: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12 };
const p2 = (n) => String(n).padStart(2, "0");

function ontleed(naam) {
  const formaat = (naam.match(EXT)?.[1] || "").toLowerCase();
  let r = naam.replace(EXT, "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
  let jaar = null, datum = null, m;
  if ((m = r.match(/^(\d{4}) (\d{1,2}) (\d{1,2})(?:[-/][\d-]+)?\b\s*(.*)$/)) && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) {
    jaar = +m[1]; datum = `${m[1]}-${p2(m[2])}-${p2(m[3])}`; r = m[4];
  } else if ((m = r.match(/^(\d{4}) (\d{1,2}) ([a-z]{3}) (.*)$/i)) && MAAND[m[3].toLowerCase()]) {
    jaar = +m[1]; datum = `${m[1]}-${p2(MAAND[m[3].toLowerCase()])}-${p2(m[2])}`; r = m[4];
  } else if ((m = r.match(/^(\d{4}) ([a-z]{3}) (\d{1,2}) (.*)$/i)) && MAAND[m[2].toLowerCase()]) {
    jaar = +m[1]; datum = `${m[1]}-${p2(MAAND[m[2].toLowerCase()])}-${p2(m[3])}`; r = m[4];
  } else if ((m = r.match(/^(\d{4}) (\d{1,2}) ([^\d].*)$/)) && +m[2] >= 1 && +m[2] <= 12) {
    jaar = +m[1]; datum = `${m[1]}-${p2(m[2])}`; r = m[3];
  } else if ((m = r.match(/^(\d{4})\b[\s-]*(.*)$/))) {
    jaar = +m[1]; r = m[2];
  }
  const titel = r.replace(/^[-–\s]+/, "").replace(/\s*\(\(.*?\)\)/, "").replace(/\s+(HD\s?\d{3,4}p|kopie|pc|tv)$/i, "").replace(/\s+(HD\s?\d{3,4}p)\b/i, "").trim();
  return { titel, jaar, datum, formaat };
}

// Zender en genre afleiden uit de titel. Wat nergens op past, telt als familie/privé.
const ZENDERS = [["NOS", /\bnos\b/i], ["RTL", /\brtl\s?\d?\b/i], ["BBC", /\bbbc\d?\b/i], ["VPRO", /\bvpro\b|tegenlicht|zomergasten|zmrgasten|uur van de w/i], ["NTR", /\bntr\b|andere t/i], ["VARA", /\bvara\b|dwdd|wereld draait door|jinek/i], ["KRO-NCRV", /\b(kro|ncrv)\b|2doc/i], ["TROS", /\btros\b/i], ["MAX", /\bmax\b/i], ["Net5", /\bnet5\b/i], ["Channel 4", /\bch ?4\b/i], ["Polygoon", /polygoon/i]];
const PRIVE = /bij reaal|famreunie/i;
const GENRES = [
  ["Sport", /elfsteden|voetbal|cruijf|\bsport\b/i],
  ["Koningshuis", /oranje|beatrix|willem.?a(lexander)?\b|maxima|troon|prins|prinses|amalia|juliana|queen|koning|pr maurits|prinsjesdag|\bwa\b/i],
  ["Nieuws", /journaal|journ\b|jrn|nieuwsuur|eenvandaag|een vandaag|persco|personferentie|jaaroverzicht|jaarovz|uit het leven|hart ?van ?nederland|politiek moment|navo top|radar|panorama|nieuwsfabriek|dodenherdenking|inauguratie|brexit vote/i],
  ["Muziek", /pink f|rolling s|\bdoors\b|beatles|jackson|simon|golden earring|chuck berry|rock 'n'|fleetw|elvis|ronstadt|rondstadt|bach|live aid|grammy|rob de nijs|john yoko|dolly|sgt pepper|sounds of liverpool|havana moon|bintangs|filmmuziek|cantante/i],
  ["Talkshow", /zomergasten|zmrgasten|dwdd|wereld draait door|jinek|pauw|buitenhof|matthijs|late night|bar laat|close up|tv monument|een van de acht/i],
  ["Amusement", /gala|televizier|sonneveld|kooten|deksel|lebbis|spijkers|tiende van tijl|boekenquiz|boekenbal|ik vertrek|de wrekers|oprah|fox kids|reclame/i],
  ["Serie & film", /mr robot|\bborgen\b|for all mankind|easy rider|another year|^film\b|porseleinen|de erfgenaam|erfenis/i],
  ["Documentaire", /tegenlicht|2doc|slapend rijk|verborgen verl|kenmerk|andere t|doc\b|argos|bbc|vpro|america in color|polygoon|back to the|in europa|tricky dick|kennedy|jfk|thatcher|fourth estate|fourh estate|uur van de|het uur v|watersnood|hierennu|tevreden natie|nederland 1948|beeld van ned|memoria|castilla|70 ?jr tv|65 jr tv|100 jaar vara|vara 70|de vara|china|bitcoin|spying|silicon|bank of england|facebook|zapruder|orson|reagan|gorbatsjov|mlk|skripal|coronavirus|corona|wolkers|mulisch|bomans|bouwman|escher|warhol|icons|unseen|zware jas|oorlog die nooit|strijdmakkers|stijdmakkers|nederl op film|digimens|game of phones|achtste dag|whats left|1989|wij zijn 80|de schaduw|jackie|sonja b|u kijkt|art of spain|lichting|de ballen|kijken naar|impact of|egmond in de oorlog|geschied|frequin|dries v|the reagan|interview|het laatste woord|10jr willem|5 jaar koning|crowdstrike|v&d|zwitserleven|het weer|1972|ram |rademakers|wim kok|reaal|opening pet|sinterklaas intocht|intocht sinterklaas|bijenkorf|de kennedy|tamar|unknown brood|the art|catherine|joop vd ende|profiel/i],
];

const bestanden = lijst.map(ontleed).filter((o) => o.titel);
const groepen = new Map();
for (const o of bestanden) {
  const sleutel = `${o.datum || o.jaar}|${o.titel.toLowerCase().replace(/[^a-z0-9à-ÿ]/g, "")}`;
  if (!groepen.has(sleutel)) groepen.set(sleutel, { ...o, formaten: new Set() });
  if (o.formaat) groepen.get(sleutel).formaten.add(o.formaat);
}

let n = 0;
const opnames = [...groepen.values()].map((o) => {
  const genre = PRIVE.test(o.titel) ? "Familie" : GENRES.find(([, re]) => re.test(o.titel))?.[0] || "Familie";
  const zender = ZENDERS.find(([, re]) => re.test(o.titel))?.[0];
  return {
    id: String(++n).padStart(4, "0"),
    titel: o.titel,
    ...(o.datum && { datum: o.datum }),
    jaar: o.jaar,
    ...(zender && genre !== "Familie" && { zender }),
    genre,
    ...(genre === "Familie" && { prive: true }),
    formaten: [...o.formaten],
  };
});

// Openbaar: alleen tv-opnames. Familievideo's gaan naar prive/ (staat in .gitignore) en
// worden met scripts/prive-naar-supabase.mjs in de afgeschermde database gezet.
import { mkdirSync, existsSync } from "node:fs";
const prive = opnames.filter((o) => o.prive);
const openbaar = opnames.filter((o) => !o.prive);
writeFileSync(new URL("../data/opnames.json", import.meta.url), JSON.stringify(openbaar, null, 1) + "\n");
const priveMap = new URL("../prive/", import.meta.url);
if (!existsSync(priveMap)) mkdirSync(priveMap);
writeFileSync(new URL("prive.json", priveMap), JSON.stringify(prive, null, 1) + "\n");
const tel = {};
opnames.forEach((o) => (tel[o.genre] = (tel[o.genre] || 0) + 1));
console.log(`${lijst.length} bestanden → ${opnames.length} opnames`, tel);
