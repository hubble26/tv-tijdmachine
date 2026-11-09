// TV-Tijdmachine — geen build-stap, geen afhankelijkheden.
// Data: data/opnames.json (de collectie) en data/jaren.json (wat er dat jaar gebeurde).

const state = { opnames: [], jaren: {}, decennium: null, jaar: null, gesproken: "" };
const $ = (sel) => document.querySelector(sel);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Kleine letters, zonder accenten en leestekens, zodat "Cruijff", "cruijf" en "Crúijff" op elkaar lijken.
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/&/g, " en ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Woorden die je wel zegt maar waar je niet op wilt zoeken.
const STOP = new Set(("ik wil wilt graag alle allemaal video videos video's filmpje filmpjes opname opnames uitzending uitzendingen programma programmas " +
  "laat zien toon toonde geef me mij eens even zoek zoeken vind vinden heb hebben we wij hebt jij je kun kan kunnen mag van over met de het een en " +
  "die dat er op in uit voor naar is zijn waar wat welke alles tv televisie tijdmachine nou dan ook maar staan staat " +
  "and the of a s eh uh uhm hmm zou kunnen jullie hier daar iets ding dingen jaar jaren tijd periode").split(" "));

// Wat spraakherkenning soms van een naam maakt.
const ALIAS = [[/\byou too\b|\bu 2\b|\bjoe tu\b/g, "u2"], [/\b(van )?de wereld draait door\b/g, "dwdd"], [/\bcruyff\b/g, "cruijff"],
  [/\bzomer gasten\b/g, "zomergasten"], [/\bsimon (and|en) garfunkel\b/g, "simon garfunkel"], [/\bvan kooten (en|and) de bie\b/g, "kooten bie"]];
// Afkortingen die in de bestandsnamen voorkomen.
const AFK = { zomergasten: ["zmrgasten", "zg"], televizier: ["tel", "tele"], journaal: ["journ", "jrn"], vankooten: ["kooten"], garfunkel: ["garf"], floyd: ["pf"] };

// ---------- Jaartallen begrijpen ----------
const EENHEID = { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9 };
const TIENTAL = { twintig: 20, dertig: 30, veertig: 40, vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90 };
const TIEN = { tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17, achttien: 18, negentien: 19 };

// "vijfennegentig" → 95, "dertien" → 13, "acht" → 8
function getalWoord(w) {
  if (/^\d{1,2}$/.test(w)) return Number(w);
  if (w in TIEN) return TIEN[w];
  if (w in TIENTAL) return TIENTAL[w];
  if (w in EENHEID) return EENHEID[w];
  const m = w.match(/^(een|twee|drie|vier|vijf|zes|zeven|acht|negen)en(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/);
  return m ? EENHEID[m[1]] + TIENTAL[m[2]] : null;
}

// Zet gesproken jaartallen om naar cijfers:
// "negentien vijfennegentig" → 1995, "tweeduizend dertien" / "twintig dertien" → 2013,
// "jaren tachtig" / "tachtiger jaren" / "jaren 80" → 1980-1989.
function jaartallen(q) {
  q = q.replace(/\b(?:de )?jaren (\d0|twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)\b|\b(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)er jaren\b|\bjaren (\d{4})\b/g,
    (_, a, b, c) => {
      const dec = c ? Number(c) : (a && /^\d/.test(a)) ? Number(a) : TIENTAL[a || b];
      const begin = dec >= 1000 ? dec : (dec >= 30 ? 1900 : 2000) + dec;
      return ` ${begin}-${begin + 9} `;
    });
  q = q.replace(/\bnegentien ([a-z]+|\d{1,2})\b/g, (m, x) => { const n = getalWoord(x); return n != null && n < 100 ? String(1900 + n) : m; });
  q = q.replace(/\b(?:tweeduizend(?: en)?|twintig) ([a-z]+|\d{1,2})\b/g, (m, x) => { const n = getalWoord(x); return n != null && n < 100 ? String(2000 + n) : m; });
  q = q.replace(/\btweeduizend\b/g, "2000");
  return q.replace(/\s+/g, " ").trim();
}

// Vraag → zoekwoorden + eventueel een periode (van/tot).
function begrijp(vraag) {
  let q = jaartallen(norm(vraag).replace(/(\d{4}) (\d{4})/g, "$1-$2"));
  for (const [re, v] of ALIAS) q = q.replace(re, v);
  let van = null, tot = null;
  const woorden = [];
  for (const w of q.split(" ")) {
    let m;
    if ((m = w.match(/^(19\d\d|20\d\d)-(19\d\d|20\d\d)$/))) { van = +m[1]; tot = +m[2]; continue; }
    if (/^(19\d\d|20[0-4]\d)$/.test(w)) { van = van ?? +w; tot = +w; continue; }
    if (w && !STOP.has(w)) woorden.push(w);
  }
  return { woorden: [...new Set(woorden)], van, tot };
}

// Leesbare vorm voor in het zoekveld: "rolling stones 1980-1989".
function vraagTekst({ woorden, van, tot }) {
  return [...woorden, van ? (van === tot ? String(van) : `${van}-${tot}`) : ""].filter(Boolean).join(" ");
}

function zoekwoorden(vraag) { return begrijp(vraag).woorden; }

// Hooguit één letter verschil (cruijf ≈ cruijff, stone ≈ stones).
function bijna(a, b) {
  if (Math.abs(a.length - b.length) > 1 || a.length < 5) return false;
  let i = 0, j = 0, fout = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++fout > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return fout + (a.length - i) + (b.length - j) <= 1;
}

// 2 = volledige treffer, 1 = alleen via afkorting ("M Jackson", "Rolling S"), 0 = geen.
function treffer(w, tokens, hooi) {
  // Begin van een woord telt alleen als er hooguit 3 letters achter komen ("jackson" ↔ "jacksons", maar "corona" ≠ "coronation").
  if (tokens.some((t) => t === w || (w.length > 2 && t.startsWith(w) && t.length - w.length <= 3) || bijna(w, t))) return 2;
  if (w.length > 4 && tokens.some((t) => t.length > w.length + 4 && t.includes(w) && !t.startsWith(w))) return 2; // samengesteld: "watersnoodramp" ∋ "ramp"
  if ((AFK[w] || []).some((a) => tokens.includes(a))) return 2;
  if (tokens.some((t) => t.length <= 3 && t.length < w.length && w.startsWith(t) && !/^\d/.test(t))) return 1;
  return 0;
}

function datumTekst(datum, jaar) {
  if (!datum) return jaar ? String(jaar) : "";
  if (/^\d{4}$/.test(datum)) return datum;
  if (/^\d{4}-\d{2}$/.test(datum)) return new Date(datum + "-15T12:00:00").toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  const d = new Date(datum + "T12:00:00");
  if (isNaN(d)) return datum;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

const toonPrive = () => $("#toon-prive").checked;
const zichtbaar = () => state.opnames.filter((o) => toonPrive() || !o.prive);

async function laad() {
  const [o, j, b] = await Promise.all([
    fetch("data/opnames.json").then((r) => r.json()),
    fetch("data/jaren.json").then((r) => r.json()).catch(() => ({})),
    fetch("data/boxen.json").then((r) => r.json()).catch(() => []),
  ]);
  // Harde schijf (opnames.json) + dvd/videoboxen (boxen.json, met boxnummer).
  state.opnames = o.concat(b)
    .map((x) => ({ ...x, jaar: Number(x.jaar || String(x.datum || "").slice(0, 4)) || null }))
    .map((x) => ({ ...x, _hooi: norm([x.titel, x.zender, x.genre, x.jaar, x.beschrijving, x.rubriek, x.box ? `box ${x.box} ${x.boxnaam}` : ""].join(" ")) }))
    .sort((a, b) => String(a.datum || a.jaar || "9999").localeCompare(String(b.datum || b.jaar || "9999")));
  state.jaren = j;
  try { $("#toon-prive").checked = localStorage.getItem("toonPrive") === "1"; } catch {}
  vulFilters();
  window.addEventListener("hashchange", route);
  ["filter-zender", "filter-genre", "filter-box", "sorteer"].forEach((id) => $("#" + id).addEventListener("input", route));
  $("#zoekveld").addEventListener("input", () => { state.gesproken = ""; route(); });
  $("#toon-prive").addEventListener("change", () => {
    try { localStorage.setItem("toonPrive", toonPrive() ? "1" : "0"); } catch {}
    route();
  });
  initSpraak();
  route();
}

function alleJaren() {
  const set = new Set(zichtbaar().map((o) => o.jaar).filter(Boolean));
  Object.keys(state.jaren).forEach((j) => set.add(Number(j)));
  return [...set].sort((a, b) => a - b);
}

function vulFilters() {
  const uniek = (k) => [...new Set(state.opnames.map((o) => o[k]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "nl"));
  for (const [id, k] of [["filter-zender", "zender"], ["filter-genre", "genre"]]) {
    $("#" + id).insertAdjacentHTML("beforeend", uniek(k).map((v) => `<option>${esc(v)}</option>`).join(""));
  }
  const boxen = new Map();
  state.opnames.forEach((o) => o.box && boxen.set(o.box, o.boxnaam));
  $("#filter-box").insertAdjacentHTML("beforeend", [...boxen].sort((a, c) => a[0] - c[0])
    .map(([n, naam]) => `<option value="${n}">Box ${n}${naam ? ` · ${esc(naam)}` : ""}</option>`).join(""));
}

function filters() {
  return { q: $("#zoekveld").value.trim(), zender: $("#filter-zender").value, genre: $("#filter-genre").value, box: $("#filter-box").value, sorteer: $("#sorteer").value };
}

const pastBox = (o, box) => !box || (box === "schijf" ? !o.box : o.box === Number(box));

function sorteer(lijst, hoe) {
  const d = (o) => String(o.datum || o.jaar || "9999");
  const id = (o) => String(o.id);
  if (hoe === "box") return [...lijst].sort((a, b) => (a.box || 0) - (b.box || 0) || id(a).localeCompare(id(b)));
  if (hoe === "titel") return [...lijst].sort((a, b) => a.titel.localeCompare(b.titel, "nl"));
  return [...lijst].sort((a, b) => d(a).localeCompare(d(b)));
}

// Zoeken: eerst de opnames waarin álle zoekwoorden voorkomen (minstens één voluit).
// Is er niets, dan de opnames met de meeste volledige treffers.
function zoek(f) {
  let lijst = zichtbaar();
  if (f.genre === "Familie") lijst = state.opnames.filter((o) => o.genre === "Familie");
  lijst = lijst.filter((o) => (!f.zender || o.zender === f.zender) && (!f.genre || o.genre === f.genre) && pastBox(o, f.box));
  const { woorden, van, tot } = begrijp(f.q);
  if (van) lijst = lijst.filter((o) => o.jaar && o.jaar >= van && o.jaar <= tot);
  if (!woorden.length) return { lijst: sorteer(lijst, f.sorteer), woorden };
  const r = zoekScore(lijst, woorden);
  return { lijst: sorteer(r, f.sorteer), woorden };
}

function zoekScore(lijst, woorden) {
  const scored = lijst.map((o) => {
    const tokens = o._hooi.split(" ");
    const t = woorden.map((w) => treffer(w, tokens, o._hooi));
    return { o, alles: t.every(Boolean) && t.includes(2), vol: t.filter((x) => x === 2).length };
  });
  const alle = scored.filter((x) => x.alles);
  if (alle.length) return alle.map((x) => x.o);
  const max = Math.max(0, ...scored.map((x) => x.vol));
  return max ? scored.filter((x) => x.vol === max).map((x) => x.o) : [];
}

function route() {
  const f = filters();
  const actief = f.q || f.zender || f.genre || f.box;
  const m = location.hash.match(/^#\/(\d{4})$/);
  const jaren = alleJaren();
  state.jaar = m ? Number(m[1]) : null;
  state.decennium = state.jaar ? Math.floor(state.jaar / 10) * 10 : state.decennium ?? (jaren.length ? Math.floor(jaren[0] / 10) * 10 : 1990);

  tekenKast(jaren);
  if (actief) toonZoekresultaten(f);
  else if (state.jaar) toonJaar(state.jaar);
  else toonWelkom(jaren);

  const s = $("#scherm");
  s.classList.remove("aan"); void s.offsetWidth; s.classList.add("aan");
}

function tekenKast(jaren) {
  const decs = [...new Set(jaren.map((j) => Math.floor(j / 10) * 10))];
  if (!decs.includes(state.decennium)) decs.push(state.decennium);
  decs.sort((a, b) => a - b);
  $("#decennia").innerHTML = decs
    .map((d) => `<button class="decennium" role="tab" aria-selected="${d === state.decennium}" data-dec="${d}">'${String(d).slice(2)}</button>`)
    .join("");
  $("#decennia").querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      state.decennium = Number(b.dataset.dec);
      wisZoeken();
      const eerste = alleJaren().find((j) => Math.floor(j / 10) * 10 === state.decennium) ?? state.decennium;
      location.hash = `#/${eerste}`;
    })
  );

  const tel = {};
  zichtbaar().forEach((o) => (tel[o.jaar] = (tel[o.jaar] || 0) + 1));
  let html = "";
  for (let j = state.decennium; j < state.decennium + 10; j++) {
    const n = tel[j] || 0;
    const cls = n ? "heeft" : state.jaren[j] ? "" : "leeg";
    html += `<a class="jaar ${cls}" href="#/${j}" data-aantal="${n}" ${j === state.jaar ? 'aria-current="true"' : ""}>${j}</a>`;
  }
  $("#jaren").innerHTML = html;
  $("#jaren").querySelectorAll("a").forEach((a) => a.addEventListener("click", wisZoeken));
  const huidig = $("#jaren [aria-current]");
  if (huidig) $("#jaren").scrollLeft = huidig.offsetLeft - $("#jaren").clientWidth / 2 + huidig.offsetWidth / 2;
}

function wisZoeken() {
  $("#zoekveld").value = ""; $("#filter-zender").value = ""; $("#filter-genre").value = ""; $("#filter-box").value = "";
  state.gesproken = ""; $("#spraak-status").hidden = true;
}

function kaart(o) {
  const meta = [datumTekst(o.datum, o.jaar), o.zender].filter(Boolean).map(esc).join(" · ");
  return `<li><button class="kaart" data-id="${esc(o.id)}">
      <span class="titel">${esc(o.titel)}</span>
      <span class="meta">${meta}</span>
      ${o.box ? `<span class="label box">Box ${o.box}</span>` : ""}
      ${o.genre ? `<span class="label${o.prive ? " prive" : ""}">${esc(o.genre)}</span>` : ""}
      ${o.voorbeeld ? `<span class="label voorbeeld">voorbeeld</span>` : ""}
    </button></li>`;
}

function koppelKaarten() {
  $("#scherm").querySelectorAll(".kaart").forEach((b) => b.addEventListener("click", () => toonDetail(b.dataset.id)));
}

function toonJaar(jaar) {
  const ctx = state.jaren[jaar];
  const lijst = zichtbaar().filter((o) => o.jaar === jaar);
  $("#scherm").innerHTML = `
    <p class="jaartal">${jaar}</p>
    <p class="kop">${ctx?.kop ? esc(ctx.kop) : "&nbsp;"}</p>
    <h2>Wat gebeurde er toen?</h2>
    ${ctx?.gebeurtenissen?.length
      ? `<ul class="context">${ctx.gebeurtenissen.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>`
      : `<p class="context-leeg">Voor dit jaar is nog geen tijdsbeeld geschreven.</p>`}
    <h2>Uit de collectie (${lijst.length})</h2>
    ${lijst.length ? `<ul class="lijst">${lijst.map(kaart).join("")}</ul>` : `<p class="leeg-scherm">Geen opnames uit ${jaar} in de collectie.</p>`}
  `;
  koppelKaarten();
  document.title = `${jaar} · TV-Tijdmachine`;
}

function toonZoekresultaten(f) {
  const { lijst, woorden } = zoek(f);
  const waarop = state.gesproken ? `“${esc(state.gesproken)}”` : woorden.length ? `“${esc(woorden.join(" "))}”` : "";
  $("#scherm").innerHTML = `
    <h2>${lijst.length} ${lijst.length === 1 ? "opname" : "opnames"}${waarop ? ` voor ${waarop}` : ""}</h2>
    ${lijst.length ? `<ul class="lijst">${lijst.map(kaart).join("")}</ul>`
      : `<p class="leeg-scherm">Niets gevonden${waarop ? ` voor ${waarop}` : ""}. ${suggestieHtml(woorden)}Probeer een ander woord${toonPrive() ? "" : ", of zet “Familievideo's” aan"}.</p>`}
  `;
  koppelKaarten();
  $("#suggestie")?.addEventListener("click", (e) => {
    $("#zoekveld").value = e.currentTarget.dataset.q; state.gesproken = ""; route();
  });
  document.title = "Zoeken · TV-Tijdmachine";
  return lijst.length;
}

// ---------- "Bedoelde je…?" ----------
// Afstand tussen twee woorden (aantal letters toevoegen/weghalen/wijzigen).
function afstand(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

let woordenschat = null;
function suggestie(woorden) {
  if (!woorden.length) return null;
  woordenschat ??= [...new Set(state.opnames.flatMap((o) => norm(o.titel).split(" ")).filter((t) => t.length > 3 && !/^\d/.test(t)))];
  let veranderd = false;
  const nieuw = woorden.map((w) => {
    if (w.length < 4 || woordenschat.includes(w)) return w;
    const max = w.length > 7 ? 3 : 2;
    let best = null, bd = max + 1;
    for (const t of woordenschat) { if (Math.abs(t.length - w.length) > max) continue; const dd = afstand(w, t); if (dd < bd) { bd = dd; best = t; } }
    if (best) { veranderd = true; return best; }
    return w;
  });
  return veranderd ? nieuw.join(" ") : null;
}

function suggestieHtml(woorden) {
  const s = suggestie(woorden);
  return s ? `Bedoelde je <button type="button" class="link-knop" id="suggestie" data-q="${esc(s)}">“${esc(s)}”</button>? ` : "";
}

function toonWelkom(jaren) {
  const van = jaren[0], tot = jaren[jaren.length - 1];
  $("#scherm").innerHTML = `
    <div class="welkom">
      <p class="jaartal">${van ?? ""}${tot && tot !== van ? "–" + tot : ""}</p>
      <p class="kop">Zet de tv aan en draai aan de knop.</p>
      <p>Een privécollectie van ${zichtbaar().length} televisie-opnames, jaar voor jaar. Kies hierboven een decennium en een jaar, of druk op de microfoon en vraag bijvoorbeeld: <em>“Laat alle video's van de Rolling Stones zien.”</em></p>
      ${van ? `<a class="knop" href="#/${van}">Begin in ${van}</a>` : ""}
    </div>`;
  document.title = "TV-Tijdmachine";
}

function toonDetail(id) {
  const o = state.opnames.find((x) => String(x.id) === id);
  if (!o) return;
  const rij = (k, v) => (v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : "");
  $("#detail-inhoud").innerHTML = `
    <h3>${esc(o.titel)}</h3>
    <dl>
      ${rij("Datum", datumTekst(o.datum, o.jaar))}${rij("Zender", o.zender)}${rij("Genre", o.genre)}${rij("Box", o.box ? `Box ${o.box}${o.boxnaam ? " · " + o.boxnaam : ""}` : "")}${rij("Rubriek", o.rubriek)}
      ${rij("Duur", o.duur)}${rij("Drager", o.drager)}${rij("Bestanden", (o.formaten || []).join(", "))}
    </dl>
    ${o.beschrijving ? `<p>${esc(o.beschrijving)}</p>` : ""}
    ${o.jaar ? `<p><a href="#/${o.jaar}" id="meer-uit-jaar">Meer uit ${o.jaar} →</a></p>` : ""}`;
  $("#meer-uit-jaar")?.addEventListener("click", () => { wisZoeken(); $("#detail").close(); });
  $("#detail").showModal();
}

// ---------- Spraak ----------
// Gebruikt de spraakherkenning van de browser (Chrome, Edge, Safari). Firefox ondersteunt dit niet.
function initSpraak() {
  const knop = $("#spreek");
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const status = (t) => { $("#spraak-status").textContent = t; $("#spraak-status").hidden = !t; };
  if (!SR) {
    knop.addEventListener("click", () => status("Spraak werkt in deze browser niet. Gebruik Chrome, Edge of Safari, of typ je vraag."));
    return;
  }
  // Blijf luisteren (continuous) en stop zelf na STILTE ms zonder nieuwe spraak,
  // zodat een korte pauze ("eh…") de vraag niet afkapt. Na MAX ms stopt het altijd.
  const STILTE = 1600, MAX = 12000;
  const rec = new SR();
  rec.lang = "nl-NL";
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  let luistert = false, definitief = [], voorlopig = "", stilteTimer = null, maxTimer = null, fout = false;

  const stopNa = (ms) => { clearTimeout(stilteTimer); stilteTimer = setTimeout(() => rec.stop(), ms); };

  knop.addEventListener("click", () => {
    if (luistert) return rec.stop();
    definitief = []; voorlopig = ""; fout = false;
    speechSynthesis?.cancel();
    try { rec.start(); } catch {}
  });
  rec.onstart = () => {
    luistert = true; knop.classList.add("luistert"); knop.setAttribute("aria-label", "Stop met luisteren");
    status("Ik luister… vraag bijvoorbeeld: “alle video's van Pink Floyd” of “journaals uit de jaren negentig”.");
    stopNa(6000); // niemand begint te praten → na 6 s stoppen
    clearTimeout(maxTimer); maxTimer = setTimeout(() => rec.stop(), MAX);
  };
  rec.onresult = (e) => {
    voorlopig = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) definitief[i] = [...r].map((a) => a.transcript.trim()); // alle alternatieven bewaren
      else voorlopig += r[0].transcript;
    }
    const tekst = [definitief.filter(Boolean).map((a) => a[0]).join(" "), voorlopig].join(" ").trim();
    status(`Ik hoor: “${tekst}”…`);
    stopNa(STILTE);
  };
  rec.onerror = (e) => {
    fout = e.error !== "no-speech" && e.error !== "aborted";
    const uitleg = { "not-allowed": "De microfoon is geblokkeerd. Klik op het slotje links in de adresbalk en sta de microfoon toe.", "no-speech": "Ik hoorde niets. Druk nog eens op de microfoon en praat iets dichter bij de computer.", "network": "Spraakherkenning heeft internet nodig.", "audio-capture": "Er is geen microfoon gevonden." };
    status(uitleg[e.error] || `Spraak werkte niet (${e.error}).`);
  };
  rec.onend = () => {
    luistert = false; clearTimeout(stilteTimer); clearTimeout(maxTimer);
    knop.classList.remove("luistert"); knop.setAttribute("aria-label", "Vraag het met je stem");
    if (fout) return;
    // Kandidaten: per alternatief (1e, 2e, 3e) de hele zin. Bij geen definitieve tekst: de voorlopige.
    const delen = definitief.filter(Boolean);
    const kandidaten = delen.length
      ? [0, 1, 2].map((k) => delen.map((alts) => alts[k] ?? alts[0]).join(" ")).filter((v, i, a) => v && a.indexOf(v) === i)
      : voorlopig.trim() ? [voorlopig.trim()] : [];
    if (!kandidaten.length) return status("Ik hoorde niets. Druk nog eens op de microfoon.");
    // Kies de herkenning die de meeste opnames oplevert (bij gelijkspel: de eerste, die Chrome het zekerst vond).
    const basis = { zender: "", genre: "", box: "", sorteer: $("#sorteer").value };
    const scores = kandidaten.map((k) => ({ k, b: begrijp(k), n: zoek({ ...basis, q: vraagTekst(begrijp(k)) }).lijst.length }));
    const beste = scores.reduce((a, c) => (c.n > a.n ? c : a));
    $("#zoekveld").value = vraagTekst(beste.b);
    $("#filter-zender").value = ""; $("#filter-genre").value = ""; $("#filter-box").value = "";
    state.gesproken = beste.k;
    if (location.hash) history.replaceState(null, "", location.pathname);
    route();
    const n = beste.n;
    status(`Je zei: “${beste.k}” — ${n ? `${n} ${n === 1 ? "opname" : "opnames"} gevonden` : "niets gevonden"}.`);
    const s = n ? null : suggestie(beste.b.woorden);
    zegHardop(n ? `Ik heb ${n} ${n === 1 ? "opname" : "opnames"} gevonden.` : s ? `Niets gevonden. Bedoelde je ${s}?` : "Daar heb ik niets over gevonden.");
  };
}

function zegHardop(tekst) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(tekst);
  u.lang = "nl-NL";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

laad().catch((e) => {
  $("#scherm").innerHTML = `<p class="leeg-scherm">De collectie kon niet geladen worden. (${esc(e.message)})</p>`;
});
