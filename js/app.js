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
  "die dat er op in uit voor naar is zijn waar wat welke alles tv televisie tijdmachine nou dan ook maar staan staat").split(" "));

// Wat spraakherkenning soms van een naam maakt.
const ALIAS = [[/\byou too\b|\bu 2\b|\bjoe tu\b/g, "u2"], [/\bde wereld draait door\b/g, "dwdd"], [/\bcruyff\b/g, "cruijff"]];
// Afkortingen die in de bestandsnamen voorkomen.
const AFK = { zomergasten: ["zmrgasten"], televizier: ["tel", "tele"], journaal: ["journ", "jrn"], vankooten: ["kooten"] };

function zoekwoorden(vraag) {
  let q = norm(vraag);
  for (const [re, v] of ALIAS) q = q.replace(re, v);
  return [...new Set(q.split(" ").filter((w) => w && !STOP.has(w)))];
}

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
  if (tokens.some((t) => t === w || (w.length > 2 && t.startsWith(w)) || bijna(w, t)) || (w.length > 3 && hooi.includes(w))) return 2;
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
  const [o, j] = await Promise.all([
    fetch("data/opnames.json").then((r) => r.json()),
    fetch("data/jaren.json").then((r) => r.json()).catch(() => ({})),
  ]);
  state.opnames = o
    .map((x) => ({ ...x, jaar: Number(x.jaar || String(x.datum || "").slice(0, 4)) || null }))
    .map((x) => ({ ...x, _hooi: norm([x.titel, x.zender, x.genre, x.jaar, x.beschrijving].join(" ")) }))
    .sort((a, b) => String(a.datum || a.jaar || "9999").localeCompare(String(b.datum || b.jaar || "9999")));
  state.jaren = j;
  try { $("#toon-prive").checked = localStorage.getItem("toonPrive") === "1"; } catch {}
  vulFilters();
  window.addEventListener("hashchange", route);
  ["filter-zender", "filter-genre"].forEach((id) => $("#" + id).addEventListener("input", route));
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
}

function filters() {
  return { q: $("#zoekveld").value.trim(), zender: $("#filter-zender").value, genre: $("#filter-genre").value };
}

// Zoeken: eerst de opnames waarin álle zoekwoorden voorkomen (minstens één voluit).
// Is er niets, dan de opnames met de meeste volledige treffers.
function zoek(f) {
  let lijst = zichtbaar();
  if (f.genre === "Familie") lijst = state.opnames.filter((o) => o.genre === "Familie");
  lijst = lijst.filter((o) => (!f.zender || o.zender === f.zender) && (!f.genre || o.genre === f.genre));
  const woorden = zoekwoorden(f.q);
  if (!woorden.length) return { lijst, woorden };
  const scored = lijst.map((o) => {
    const tokens = o._hooi.split(" ");
    const t = woorden.map((w) => treffer(w, tokens, o._hooi));
    return { o, alles: t.every(Boolean) && t.includes(2), vol: t.filter((x) => x === 2).length };
  });
  const alle = scored.filter((x) => x.alles);
  if (alle.length) return { lijst: alle.map((x) => x.o), woorden };
  const max = Math.max(0, ...scored.map((x) => x.vol));
  return { lijst: max ? scored.filter((x) => x.vol === max).map((x) => x.o) : [], woorden };
}

function route() {
  const f = filters();
  const actief = f.q || f.zender || f.genre;
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
  $("#zoekveld").value = ""; $("#filter-zender").value = ""; $("#filter-genre").value = "";
  state.gesproken = ""; $("#spraak-status").hidden = true;
}

function kaart(o) {
  const meta = [datumTekst(o.datum, o.jaar), o.zender].filter(Boolean).map(esc).join(" · ");
  return `<li><button class="kaart" data-id="${esc(o.id)}">
      <span class="titel">${esc(o.titel)}</span>
      <span class="meta">${meta}</span>
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
      : `<p class="leeg-scherm">Niets gevonden${waarop ? ` voor ${waarop}` : ""}. Probeer een ander woord${toonPrive() ? "" : ", of zet “Familievideo's” aan"}.</p>`}
  `;
  koppelKaarten();
  document.title = "Zoeken · TV-Tijdmachine";
  return lijst.length;
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
      ${rij("Datum", datumTekst(o.datum, o.jaar))}${rij("Zender", o.zender)}${rij("Genre", o.genre)}
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
  const rec = new SR();
  rec.lang = "nl-NL";
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let luistert = false, laatste = "";

  knop.addEventListener("click", () => {
    if (luistert) return rec.stop();
    laatste = "";
    try { rec.start(); } catch {}
  });
  rec.onstart = () => { luistert = true; knop.classList.add("luistert"); knop.setAttribute("aria-label", "Stop met luisteren"); status("Ik luister… vraag bijvoorbeeld: “alle video's van Pink Floyd”."); };
  rec.onresult = (e) => {
    laatste = [...e.results].map((r) => r[0].transcript).join(" ");
    status(`Je zei: “${laatste}”`);
  };
  rec.onerror = (e) => {
    const uitleg = { "not-allowed": "De microfoon is geblokkeerd. Sta de microfoon toe via het slotje in de adresbalk.", "no-speech": "Ik hoorde niets. Druk nog eens op de microfoon en praat iets harder.", "network": "Spraakherkenning heeft internet nodig." };
    status(uitleg[e.error] || `Spraak werkte niet (${e.error}).`);
  };
  rec.onend = () => {
    luistert = false; knop.classList.remove("luistert"); knop.setAttribute("aria-label", "Vraag het met je stem");
    if (!laatste) return;
    $("#zoekveld").value = zoekwoorden(laatste).join(" ");
    $("#filter-zender").value = ""; $("#filter-genre").value = "";
    state.gesproken = laatste;
    if (location.hash) history.replaceState(null, "", location.pathname);
    route();
    const n = zoek(filters()).lijst.length;
    status(`Je zei: “${laatste}” — ${n ? `${n} ${n === 1 ? "opname" : "opnames"} gevonden` : "niets gevonden"}.`);
    zegHardop(n ? `Ik heb ${n} ${n === 1 ? "opname" : "opnames"} gevonden.` : "Daar heb ik niets over gevonden.");
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
