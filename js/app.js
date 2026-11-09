// TV-Tijdmachine — geen build-stap, geen afhankelijkheden.
// Data: data/opnames.json (de collectie) en data/jaren.json (wat er dat jaar gebeurde).

const state = { opnames: [], jaren: {}, onderwerpen: {}, decennium: null, jaar: null, gesproken: "" };
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
  const [o, j, b, w] = await Promise.all([
    fetch("data/opnames.json").then((r) => r.json()),
    fetch("data/jaren.json").then((r) => r.json()).catch(() => ({})),
    fetch("data/boxen.json").then((r) => r.json()).catch(() => []),
    fetch("data/onderwerpen.json").then((r) => r.json()).catch(() => ({})),
  ]);
  state.onderwerpen = w;
  // Harde schijf (opnames.json) + dvd/videoboxen (boxen.json, met boxnummer).
  state.opnames = o.concat(b)
    .map((x) => ({ ...x, jaar: Number(x.jaar || String(x.datum || "").slice(0, 4)) || null }))
    .map((x) => ({ ...x, _hooi: norm([x.titel, x.zender, x.genre, x.jaar, x.beschrijving, x.rubriek, x.box ? `box ${x.box} ${x.boxnaam}` : ""].join(" ")) }))
    .sort((a, b) => String(a.datum || a.jaar || "9999").localeCompare(String(b.datum || b.jaar || "9999")));
  state.jaren = j;
  try { $("#toon-prive").checked = localStorage.getItem("toonPrive") === "1"; } catch {}
  vulFilters();
  window.addEventListener("hashchange", () => { window.scrollTo(0, 0); route(); });
  ["filter-zender", "filter-genre", "filter-box", "sorteer"].forEach((id) => $("#" + id).addEventListener("input", route));
  $("#zoekveld").addEventListener("input", () => { state.gesproken = ""; route(); });
  $("#toon-prive").addEventListener("change", () => {
    try { localStorage.setItem("toonPrive", toonPrive() ? "1" : "0"); } catch {}
    route();
  });
  initSpraak();
  $("#hero-spreek").addEventListener("click", () => $("#spreek").click());
  $("#zap-verder").addEventListener("click", () => zap(1, true));
  $("#zap-terug").addEventListener("click", () => zap(-1, true));
  // Niet verder zappen terwijl iemand met muis of toetsenbord bij het toestel is.
  const toestel = $(".toestel");
  ["mouseenter", "focusin"].forEach((e) => toestel.addEventListener(e, () => (state.zapPauze = true)));
  ["mouseleave", "focusout"].forEach((e) => toestel.addEventListener(e, () => (state.zapPauze = false)));
  $(".logo").addEventListener("click", () => { wisZoeken(); if (location.hash === "#/") route(); });
  $("#beeld").addEventListener("click", () => { const o = state.zaplijst?.[state.kanaal]; if (o) toonDetail(String(o.id)); });
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

  // Voorpagina als er niet gezocht wordt en geen jaar gekozen is; anders het bladerscherm.
  const thuis = !actief && !state.jaar;
  $("#home").hidden = !thuis;
  $("#bladeren").hidden = thuis;
  $(".verfijn").hidden = thuis;
  if (thuis) { toonHome(jaren); document.title = "TV-Tijdmachine"; return; }
  stopZappen();

  tekenKast(jaren);
  if (actief) toonZoekresultaten(f);
  else toonJaar(state.jaar);

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

const onderwerp = (o) => (o.onderwerp && state.onderwerpen[o.onderwerp]) || null;
const beeldVan = (o) => onderwerp(o)?.afbeelding || null;

function kaart(o) {
  const meta = [datumTekst(o.datum, o.jaar), o.zender].filter(Boolean).map(esc).join(", ");
  const img = beeldVan(o);
  return `<li><button class="kaart" data-id="${esc(o.id)}">
      <span class="kaart-beeld${img ? "" : " zonder"}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ""}</span>
      <span>
      <span class="titel">${esc(o.titel)}</span>
      <span class="meta">${meta}</span>
      ${o.box ? `<span class="label box">Box ${o.box}</span>` : ""}
      ${o.genre ? `<span class="label${o.prive ? " prive" : ""}">${esc(o.genre)}</span>` : ""}
      ${o.voorbeeld ? `<span class="label voorbeeld">voorbeeld</span>` : ""}
      </span>
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
  const w = onderwerp(o);
  $("#detail-inhoud").innerHTML = `
    ${w?.afbeelding ? `<div class="detail-beeld"><img src="${esc(w.afbeelding)}" alt="${esc(w.titel)}"></div>` : ""}
    <h3>${esc(o.titel)}</h3>
    <dl>
      ${rij("Datum", datumTekst(o.datum, o.jaar))}${rij("Zender", o.zender)}${rij("Genre", o.genre)}${rij("Box", o.box ? `Box ${o.box}${o.boxnaam ? " · " + o.boxnaam : ""}` : "")}${rij("Rubriek", o.rubriek)}
      ${rij("Duur", o.duur)}${rij("Drager", o.drager)}${rij("Bestanden", (o.formaten || []).join(", "))}
    </dl>
    ${o.beschrijving ? `<p>${esc(o.beschrijving)}</p>` : ""}
    ${w ? `<div class="wiki"><p>${esc(w.samenvatting)}</p><p class="bron">Over ${esc(w.titel)}, uit <a href="${esc(w.url)}" target="_blank" rel="noopener">Wikipedia</a>${o.zeker === false ? ". Automatisch gekoppeld, mogelijk niet juist" : ""}.</p></div>` : ""}
    ${o.jaar ? `<p><a href="#/${o.jaar}" id="meer-uit-jaar">Meer uit ${o.jaar}</a></p>` : ""}`;
  $("#meer-uit-jaar")?.addEventListener("click", () => { wisZoeken(); $("#detail").close(); });
  $("#detail").showModal();
}

// ---------- Voorpagina ----------
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

// Dag van het jaar (1-366), los van het jaartal, om "rond deze dag" te vinden.
const dagVanJaar = (m, d) => Math.round((Date.UTC(2000, m - 1, d) - Date.UTC(2000, 0, 1)) / 864e5);

// Vaste "willekeurige" volgorde per dag, zodat de voorpagina een dag lang hetzelfde blijft.
function geschud(lijst, zaad) {
  const a = [...lijst];
  let s = zaad;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function rondDezeDag(vandaag, venster = 7) {
  const nu = dagVanJaar(vandaag.getMonth() + 1, vandaag.getDate());
  return zichtbaar()
    .filter((o) => /^\d{4}-\d{2}-\d{2}$/.test(o.datum || ""))
    .map((o) => {
      const [, m, d] = o.datum.split("-").map(Number);
      let v = Math.abs(dagVanJaar(m, d) - nu); v = Math.min(v, 366 - v);
      return { o, v };
    })
    .filter((x) => x.v <= venster)
    .sort((a, b) => a.v - b.v || b.o.jaar - a.o.jaar)
    .map((x) => x.o);
}

function toonHome(jaren) {
  const vandaag = new Date();
  const zaad = vandaag.getFullYear() * 1000 + dagVanJaar(vandaag.getMonth() + 1, vandaag.getDate());
  const dag = `${vandaag.getDate()} ${MAANDEN[vandaag.getMonth()]}`;
  const rond = rondDezeDag(vandaag);

  $("#hero-kop").textContent = rond.length ? `Wat was er op tv rond ${dag}?` : "Wat staat er in het archief?";
  const metBeeld = rond.filter(beeldVan);
  const vulling = geschud(zichtbaar().filter((o) => beeldVan(o) && !metBeeld.includes(o)), zaad);
  state.zaplijst = [...metBeeld, ...vulling].slice(0, 12);
  const jarenRond = [...new Set(rond.map((o) => o.jaar))];
  $("#hero-sub").textContent = rond.length
    ? `${rond.length} ${rond.length === 1 ? "opname" : "opnames"} uit deze week, opgenomen in ${jarenRond.length === 1 ? jarenRond[0] : `${jarenRond.length} verschillende jaren`}. Het toestel zapt erlangs; druk op het beeld voor meer.`
    : `${zichtbaar().length} opnames van ${jaren[0]} tot ${jaren[jaren.length - 1]}. Het toestel zapt erlangs; druk op het beeld voor meer.`;

  if (state.kanaal == null || state.kanaal >= state.zaplijst.length) state.kanaal = 0;
  toonKanaal(false);
  startZappen();
  tekenPlank(jaren);
  tekenRijen(zaad);
}

function toonKanaal(metRuis) {
  const o = state.zaplijst?.[state.kanaal];
  if (!o) return;
  const b = $("#beeld");
  if (metRuis) { b.classList.remove("zap"); void b.offsetWidth; b.classList.add("zap"); }
  $("#beeld-img").src = beeldVan(o);
  $("#beeld-img").alt = onderwerp(o)?.titel || "";
  $("#osd").textContent = state.kanaal + 1;
  $("#ondertitel").innerHTML = `<span>${esc(o.titel)}</span><br><span class="tt-cyaan">${esc(datumTekst(o.datum, o.jaar))}</span>`;
  $("#paneel-tekst").textContent = `Zender ${state.kanaal + 1} van ${state.zaplijst.length}`;
}

function zap(stap, doorGebruiker) {
  if (!state.zaplijst?.length) return;
  state.kanaal = (state.kanaal + stap + state.zaplijst.length) % state.zaplijst.length;
  toonKanaal(true);
  if (doorGebruiker) startZappen(); // timer opnieuw beginnen na zelf zappen
}

const rustig = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function startZappen() {
  stopZappen();
  if (rustig()) return;
  state.zapTimer = setInterval(() => {
    if (document.hidden || state.zapPauze) return;
    zap(1, false);
  }, 6500);
}
function stopZappen() { clearInterval(state.zapTimer); state.zapTimer = null; }

function tekenPlank(jaren) {
  const tel = {};
  zichtbaar().forEach((o) => o.jaar && (tel[o.jaar] = (tel[o.jaar] || 0) + 1));
  const max = Math.max(1, ...Object.values(tel));
  let html = "", dec = null;
  for (const j of jaren) {
    const d = Math.floor(j / 10) * 10;
    if (d !== dec) { dec = d; html += `<span class="boekensteun" aria-hidden="true">'${String(d).slice(2)}</span>`; }
    const n = tel[j] || 0;
    // Dikte naar aantal opnames; een klein beetje scheef, zoals in een echte kast.
    const dikte = Math.round(26 + (n / max) * 26);
    const r = ((j * 37) % 7 - 3) * 0.35;
    const scheef = ((j * 53) % 5 - 2) * 0.6;
    html += `<a class="band" href="#/${j}" style="--dikte:${dikte}px;--r:${r}deg;--scheef:${scheef}deg" aria-label="${j}, ${n} opnames">
      <span class="etiket"><span class="jaar-stift">${j}</span></span><span class="aantal" aria-hidden="true">${n}</span></a>`;
  }
  $("#plank").innerHTML = html;
  $("#plank").querySelectorAll("a").forEach((a) => a.addEventListener("click", wisZoeken));
}

function tegel(o) {
  const img = beeldVan(o);
  return `<li><button class="tegel" data-id="${esc(o.id)}">
    <span class="tegel-beeld${img ? "" : " zonder"}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : esc(o.titel)}</span>
    <span class="tegel-titel">${esc(o.titel)}</span>
    <span class="tegel-meta">${esc([datumTekst(o.datum, o.jaar), o.zender].filter(Boolean).join(", "))}</span>
  </button></li>`;
}

function tekenRijen(zaad) {
  const perGenre = {};
  zichtbaar().filter((o) => o.genre && o.genre !== "Familie").forEach((o) => (perGenre[o.genre] ||= []).push(o));
  const genres = Object.entries(perGenre).sort((a, b) => b[1].length - a[1].length);
  $("#rijen").innerHTML = genres.map(([g, lijst]) => {
    // Eerst opnames met afbeelding, in een vaste volgorde per dag; daarna de rest.
    const keuze = [...geschud(lijst.filter(beeldVan), zaad), ...lijst.filter((o) => !beeldVan(o))].slice(0, 16);
    return `<section aria-label="${esc(g)}">
      <div class="sectiekop"><h2>${esc(g)}</h2><p>${lijst.length} opnames</p>
        <button type="button" class="knop-link" data-genre="${esc(g)}">Alle ${lijst.length} bekijken</button></div>
      <ul class="rij-lijst">${keuze.map(tegel).join("")}</ul></section>`;
  }).join("");
  $("#rijen").querySelectorAll(".tegel").forEach((b) => b.addEventListener("click", () => toonDetail(b.dataset.id)));
  $("#rijen").querySelectorAll("[data-genre]").forEach((b) => b.addEventListener("click", () => {
    $("#filter-genre").value = b.dataset.genre; window.scrollTo(0, 0); route();
  }));
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
    luistert = true; knop.classList.add("luistert"); $("#hero-spreek").classList.add("luistert"); knop.setAttribute("aria-label", "Stop met luisteren");
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
    knop.classList.remove("luistert"); $("#hero-spreek").classList.remove("luistert"); knop.setAttribute("aria-label", "Vraag het met je stem");
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
