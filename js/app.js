// TV-Tijdmachine — geen build-stap, geen afhankelijkheden.
// Data: data/opnames.json (de collectie) en data/jaren.json (wat er dat jaar gebeurde).

const state = { opnames: [], jaren: {}, decennium: null, jaar: null };
const $ = (sel) => document.querySelector(sel);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function datumTekst(datum) {
  if (!datum) return "";
  if (/^\d{4}$/.test(datum)) return datum;
  const d = new Date(datum + "T12:00:00");
  if (isNaN(d)) return datum;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

async function laad() {
  const [o, j] = await Promise.all([
    fetch("data/opnames.json").then((r) => r.json()),
    fetch("data/jaren.json").then((r) => r.json()).catch(() => ({})),
  ]);
  state.opnames = o
    .map((x) => ({ ...x, jaar: Number(x.jaar || String(x.datum || "").slice(0, 4)) || null }))
    .sort((a, b) => String(a.datum || a.jaar).localeCompare(String(b.datum || b.jaar)));
  state.jaren = j;
  vulFilters();
  window.addEventListener("hashchange", route);
  ["zoekveld", "filter-zender", "filter-genre"].forEach((id) => $("#" + id).addEventListener("input", route));
  route();
}

function alleJaren() {
  const set = new Set(state.opnames.map((o) => o.jaar).filter(Boolean));
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
  return {
    q: $("#zoekveld").value.trim().toLowerCase(),
    zender: $("#filter-zender").value,
    genre: $("#filter-genre").value,
  };
}

function past(o, f) {
  if (f.zender && o.zender !== f.zender) return false;
  if (f.genre && o.genre !== f.genre) return false;
  if (f.q) {
    const hooi = [o.titel, o.zender, o.genre, o.beschrijving, o.jaar, o.drager].join(" ").toLowerCase();
    if (!f.q.split(/\s+/).every((w) => hooi.includes(w))) return false;
  }
  return true;
}

function route() {
  const f = filters();
  const actief = f.q || f.zender || f.genre;
  const m = location.hash.match(/^#\/(\d{4})$/);
  const jaren = alleJaren();
  state.jaar = m ? Number(m[1]) : null;
  state.decennium = state.jaar ? Math.floor(state.jaar / 10) * 10 : state.decennium ?? (jaren.length ? Math.floor(jaren[0] / 10) * 10 : 1980);

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
      const eerste = alleJaren().find((j) => Math.floor(j / 10) * 10 === state.decennium) ?? state.decennium;
      location.hash = `#/${eerste}`;
    })
  );

  const tel = {};
  state.opnames.forEach((o) => (tel[o.jaar] = (tel[o.jaar] || 0) + 1));
  let html = "";
  for (let j = state.decennium; j < state.decennium + 10; j++) {
    const n = tel[j] || 0;
    const cls = n ? "heeft" : state.jaren[j] ? "" : "leeg";
    html += `<a class="jaar ${cls}" href="#/${j}" data-aantal="${n}" ${j === state.jaar ? 'aria-current="true"' : ""}>${j}</a>`;
  }
  $("#jaren").innerHTML = html;
  const huidig = $("#jaren [aria-current]");
  if (huidig) $("#jaren").scrollLeft = huidig.offsetLeft - $("#jaren").clientWidth / 2 + huidig.offsetWidth / 2;
}

function kaart(o) {
  const meta = [datumTekst(o.datum), o.zender, o.duur].filter(Boolean).map(esc).join(" · ");
  return `<li><button class="kaart" data-id="${esc(o.id)}">
      <span class="titel">${esc(o.titel)}</span>
      <span class="meta">${meta}</span>
      ${o.genre ? `<span class="label">${esc(o.genre)}</span>` : ""}
      ${o.voorbeeld ? `<span class="label voorbeeld">voorbeeld</span>` : ""}
    </button></li>`;
}

function koppelKaarten() {
  $("#scherm").querySelectorAll(".kaart").forEach((b) => b.addEventListener("click", () => toonDetail(b.dataset.id)));
}

function toonJaar(jaar) {
  const ctx = state.jaren[jaar];
  const lijst = state.opnames.filter((o) => o.jaar === jaar);
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
  const lijst = state.opnames.filter((o) => past(o, f));
  $("#scherm").innerHTML = `
    <h2>Zoekresultaten (${lijst.length})</h2>
    ${lijst.length ? `<ul class="lijst">${lijst.map(kaart).join("")}</ul>` : `<p class="leeg-scherm">Niets gevonden. Probeer een ander woord of zet de filters terug.</p>`}
  `;
  koppelKaarten();
  document.title = "Zoeken · TV-Tijdmachine";
}

function toonWelkom(jaren) {
  const van = jaren[0], tot = jaren[jaren.length - 1];
  $("#scherm").innerHTML = `
    <div class="welkom">
      <p class="jaartal">${van ?? ""}${tot && tot !== van ? "–" + tot : ""}</p>
      <p class="kop">Zet de tv aan en draai aan de knop.</p>
      <p>Een privécollectie van ${state.opnames.length} televisie-opnames, jaar voor jaar. Kies hierboven een decennium en een jaar, en zie wat er op tv was en wat er in de wereld gebeurde.</p>
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
    ${o.voorbeeld ? `<span class="label voorbeeld">voorbeeld</span>` : ""}
    <dl>
      ${rij("Datum", datumTekst(o.datum))}${rij("Zender", o.zender)}${rij("Genre", o.genre)}
      ${rij("Duur", o.duur)}${rij("Drager", o.drager)}
    </dl>
    ${o.beschrijving ? `<p>${esc(o.beschrijving)}</p>` : ""}
    ${o.jaar ? `<p><a href="#/${o.jaar}" onclick="document.getElementById('detail').close()">Meer uit ${o.jaar} →</a></p>` : ""}`;
  $("#detail").showModal();
}

laad().catch((e) => {
  $("#scherm").innerHTML = `<p class="leeg-scherm">De collectie kon niet geladen worden. (${esc(e.message)})</p>`;
});
