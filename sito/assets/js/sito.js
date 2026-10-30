// Costruisce la pagina da window.SITO (config.js) e window.DOCUMENTI (generato in pubblicazione)
(function () {
  const S = window.SITO;
  const D = window.DOCUMENTI || [];
  const main = document.getElementById("contenuto");
  const salti = document.getElementById("salti");
  const SVG = "http://www.w3.org/2000/svg";

  function el(tag, attrs, ...figli) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === "") continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else n.setAttribute(k, v);
    }
    for (const f of figli) if (f !== null && f !== undefined && f !== "") n.append(f);
    return n;
  }

  // Icona a tratto (decorativa) da una lista di path
  function icona(dim, ...percorsi) {
    const s = document.createElementNS(SVG, "svg");
    for (const [k, v] of Object.entries({ width: dim, height: dim, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }))
      s.setAttribute(k, v);
    percorsi.forEach((d) => { const p = document.createElementNS(SVG, "path"); p.setAttribute("d", d); s.append(p); });
    return s;
  }
  const iconaDoc = () => icona(24, "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5");
  const iconaDiario = () => icona(32, "M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z", "M8 7h6M8 11h6");
  const iconaSole = () => icona(20, "M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4",
    "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z");
  const iconaLuna = () => icona(20, "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z");

  // Titolo leggibile dal nome del file: "2026-10-23_verbale_interno_2_V1.0" -> "Verbale interno 2"
  const daNome = (nome) => {
    const t = nome.replace(/^\d{4}-\d{2}-\d{2}[-_]?/, "").replace(/[-_ ][vV]\d+([._]\d+)*$/, "")
      .replace(/[-_]+/g, " ").trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const maiuscole = (t) => t.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  const piatto = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  const recenti = (a, b) => (b.data || "").localeCompare(a.data || "") || b.nome.localeCompare(a.nome);
  const oggi = new Date().toISOString().slice(0, 10);
  const dataLunga = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  };
  const iniziali = (nome) => nome.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  // Fase di un documento: cartella di fase se c'è, altrimenti dalla data e dalle scadenze
  function faseDi(d) {
    if (d.fase) return d.fase;
    const rif = d.data || oggi;
    const f = S.fasi.find((f) => !f.scadenza || rif <= f.scadenza);
    return (f || S.fasi[S.fasi.length - 1]).id;
  }

  const linkPdf = (href, titolo) => el("a", { class: "pdf", href, target: "_blank", rel: "noopener",
    "aria-label": titolo ? "Apri PDF: " + titolo : null, text: "PDF" });

  // Bottoni del PDF: se esiste la versione firmata si offre solo quella, da scaricare direttamente
  function bottoniPdf(d, titolo) {
    if (!d.firmato) return [linkPdf(d.file, titolo)];
    return [
      el("span", { class: "badge firmato", text: "firmato" }),
      el("a", { class: "pdf", href: d.firmato, download: d.firmato.split("/").pop(),
        "aria-label": titolo ? "Scarica PDF firmato: " + titolo : null, text: "PDF" }),
    ];
  }

  // Documento come card
  function card(titolo, d) {
    const piede = el("div", { class: "piede-doc" });
    if (d.file) {
      if (d.versione) piede.append(el("span", { class: "meta", text: "v" + d.versione }));
      piede.append(...bottoniPdf(d, titolo));
    } else {
      piede.append(el("span", { class: "badge prep", text: "in preparazione" }));
    }
    return el("article", { class: "doc solleva" },
      el("div", { class: "icona" }, iconaDoc()), el("h4", { text: titolo }), piede);
  }

  // Verbale o diario come riga
  function riga(titolo, d) {
    const meta = [d.data, d.versione ? "v" + d.versione : ""].filter(Boolean).join(" · ");
    const bottoni = d.file ? bottoniPdf(d, titolo) : [el("span", { class: "badge prep", text: "in preparazione" })];
    return el("div", { class: "riga solleva" },
      el("div", { class: "testo" }, el("span", { class: "titolo", text: titolo }), meta ? el("span", { class: "meta", text: meta }) : null),
      el("div", { class: "azioni-riga" }, ...bottoni));
  }

  const vuoto = (testo) => el("div", { class: "vuoto" }, iconaDiario(), el("span", { text: testo }));

  function sezione(id, titolo, occhiello, ...corpo) {
    salti.append(el("a", { href: "#" + id, text: titolo }));
    main.append(el("section", { id },
      el("div", { class: "intesta" }, occhiello ? el("span", { class: "occhiello", text: occhiello }) : null, el("h2", { text: titolo })),
      ...corpo));
  }

  function listaVerbali(voci, esterni) {
    const box = el("div", { class: "righe" });
    if (!voci.length) box.append(el("div", { class: "vuoto", text: "Nessun verbale" }));
    voci.sort(recenti).forEach((v) => {
      const desc = v.titolo || (esterni
        ? v.con || maiuscole(daNome(v.nome.replace(/^.*verbale[-_]esterno[-_]?/i, "")))
        : daNome(v.nome));
      box.append(riga(desc || v.nome, v));
    });
    return box;
  }

  // Fasi: documenti (attesi + presenti) e verbali della fase
  for (const f of S.fasi) {
    const diFase = D.filter((d) => d.sezione !== "diari-di-bordo" && faseDi(d) === f.id);
    const docs = diFase.filter((d) => d.sezione === "documenti");
    const est = diFase.filter((d) => d.sezione === "verbali-esterni");
    const int = diFase.filter((d) => d.sezione === "verbali-interni");
    if (!docs.length && !est.length && !int.length && !(f.attesi || []).length) continue;

    const corpo = [];
    const usati = new Set();
    const carte = (f.attesi || []).map((a) => {
      const trovato = docs.filter((d) => a.nome.split("|").some((n) => piatto(d.nome).includes(piatto(n)))).sort(recenti)[0];
      if (trovato) usati.add(trovato);
      return card(a.titolo, trovato || {});
    });
    docs.filter((d) => !usati.has(d)).sort(recenti)
      .forEach((d) => carte.push(card(d.titolo || daNome(d.nome), d)));
    if (carte.length) corpo.push(el("div", { class: "griglia-doc" }, ...carte));
    if (est.length || int.length) {
      corpo.push(el("div", { class: "colonne" },
        el("div", { class: "blocco" }, el("h3", { text: "Verbali esterni" }), listaVerbali(est, true)),
        el("div", { class: "blocco" }, el("h3", { text: "Verbali interni" }), listaVerbali(int, false))));
    }
    const occhiello = "Documenti" + (f.scadenza ? " · consegna " + dataLunga(f.scadenza) : "");
    sezione(f.id, f.titolo, occhiello, ...corpo);
  }

  // Diari di bordo
  const voci = D.filter((d) => d.sezione === "diari-di-bordo").sort(recenti);
  const diari = voci.length
    ? el("div", { class: "righe" }, ...voci.map((d) => riga(d.titolo || (d.data ? "Diario del " + dataLunga(d.data) : daNome(d.nome)), d)))
    : vuoto("Nessun diario di bordo per ora. Il primo comparirà qui.");
  sezione("diari", "Diari di bordo", "Giornale di progetto", diari);

  // Team
  const team = el("div", { class: "team" }, ...S.membri.map((m) =>
    el("div", { class: "membro solleva" },
      el("div", { class: "avatar", "aria-hidden": "true", text: iniziali(m.nome) }),
      el("div", {}, el("span", { class: "nome", text: m.nome }), el("span", { class: "meta", text: m.matricola })))));
  sezione("team", "Team", "Le persone", team);

  // Link GitHub in testata
  // (accanto al bottone del tema, fuori dal menu delle sezioni)
  if (S.gruppo.github) document.getElementById("tema").before(
    el("a", { class: "gh", href: S.gruppo.github, target: "_blank", rel: "noopener", text: "GitHub" }));

  // Bottone chiaro/scuro: parte dalla preferenza di sistema e ricorda la scelta
  const radice = document.documentElement;
  const bottoneTema = document.getElementById("tema");
  const sistemaScuro = window.matchMedia("(prefers-color-scheme: dark)");
  const scuro = () => (radice.dataset.theme ? radice.dataset.theme === "dark" : sistemaScuro.matches);
  function aggiornaBottone() {
    bottoneTema.replaceChildren(scuro() ? iconaSole() : iconaLuna());
    const etichetta = scuro() ? "Passa al tema chiaro" : "Passa al tema scuro";
    bottoneTema.setAttribute("aria-label", etichetta);
    bottoneTema.title = etichetta;
  }
  bottoneTema.addEventListener("click", () => {
    const nuovo = scuro() ? "light" : "dark";
    radice.dataset.theme = nuovo;
    try { localStorage.setItem("tema", nuovo); } catch (e) { /* storage non disponibile: vale solo per questa visita */ }
    aggiornaBottone();
  });
  sistemaScuro.addEventListener("change", aggiornaBottone);
  aggiornaBottone();

  // Altezza reale della testata fissa, per non coprire i titoli quando si salta a una sezione
  const testata = document.querySelector(".testata");
  const altezzaTestata = () => radice.style.setProperty("--alt-testata", testata.offsetHeight + "px");
  if (window.ResizeObserver) new ResizeObserver(altezzaTestata).observe(testata);
  altezzaTestata();

  // Piede
  document.getElementById("piede-nome").textContent = `${S.gruppo.nome} · Gruppo ${S.gruppo.numero}`;
  const corso = document.getElementById("piede-corso");
  corso.textContent = S.gruppo.corso;
  if (S.capitolato) corso.append(el("br"), `Capitolato ${S.capitolato.codice} · ${S.capitolato.nome} (${S.capitolato.proponente})`);
  const link = document.getElementById("piede-link");
  link.append(el("a", { href: "mailto:" + S.gruppo.email, text: S.gruppo.email }));
  if (S.gruppo.github) link.append(el("a", { href: S.gruppo.github, target: "_blank", rel: "noopener", text: "GitHub" }));
})();
