#!/usr/bin/env python3
"""Compila i documenti della repo documentale e prepara il sito.

La repo bendingforksswe/documenti-swe va messa (o clonata) in documenti/, oppure indicata
con la variabile d'ambiente DOCUMENTI. Lo script:

- compila ogni .tex in un PDF in _site/pdf/, con lo stesso percorso che ha nella repo documentale;
- copia così come sono i PDF già pronti (es. diari di bordo, verbali firmati);
- scrive in _site/assets/js/documenti.js l'elenco dei documenti, che il sito legge da solo;
- scrive _site/versione.json con il commit della repo documentale pubblicato.

La posizione del file decide dove compare sul sito (maiuscole/minuscole indifferenti):
  verbali/esterni/AAAA-MM-GG_verbale-esterno-<azienda>.tex   -> verbali esterni
  verbali/interni/AAAA-MM-GG_verbale_interno_<n>_V1.0.tex    -> verbali interni
  verbali/esterni/firmati/<stesso nome>-firmato.pdf          -> link "firmato" accanto al verbale
  diari-di-bordo/AAAA-MM-GG_....pdf                           -> diari di bordo
  qualsiasi altro .tex/.pdf                                   -> documenti
Le cartelle template/, modelli/ e assets/ vengono ignorate.
Se nel percorso c'è una cartella candidatura/, rtb/ o pb/ il documento va in quella fase,
altrimenti la fase si ricava dalla data del nome file e dalle scadenze in sito/assets/js/config.js.

Metadati facoltativi in testa al .tex (righe di commento):
  %! titolo: Valutazione dei capitolati
  %! con: Uranion          (solo verbali esterni)
La versione si legge dalla riga "\\textbf{Versione} & x.y.z" della copertina.

Uso: python3 scripts/compila.py [--solo-sito]
"""
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
DOCS = Path(os.environ.get("DOCUMENTI", RADICE / "documenti")).resolve()
SITO = RADICE / "sito"
OUT = RADICE / "_site"
BUILD = RADICE / "_build"

IGNORATE = {"template", "templates", "modelli", "assets", "_build"}
FASI = {"candidatura", "rtb", "pb"}
FIRMATO = re.compile(r"[-_ ]?firmato$", re.I)


def metadati(tex: Path) -> dict:
    testo = tex.read_text(encoding="utf-8", errors="ignore")
    meta = dict(re.findall(r"^%!\s*(\w+)\s*:\s*(.+?)\s*$", testo, re.M))
    if "versione" not in meta:
        m = re.search(r"\\textbf\{Versione\}\s*&\s*v?([0-9]+(?:\.[0-9]+)*)", testo)
        if m:
            meta["versione"] = m.group(1)
    meta["segnaposto"] = len(re.findall(r"\\ph\{", testo))
    return meta


def risorse() -> Path:
    """Cartella con i loghi raggiungibili come Assets/<file> (percorso usato nei .tex) e come <file>."""
    dest = BUILD / "_risorse"
    if dest.exists():
        return dest
    for d in DOCS.iterdir():
        if d.is_dir() and d.name.lower() == "assets":
            shutil.copytree(d, dest / "Assets")
            for f in d.iterdir():
                if f.is_file():
                    shutil.copy2(f, dest / f.name)
    dest.mkdir(parents=True, exist_ok=True)
    return dest


def compila(tex: Path, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    build = BUILD / tex.relative_to(DOCS).parent
    build.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, TEXINPUTS=os.pathsep.join([str(tex.parent), str(risorse()), str(DOCS), ""]))
    cmd = ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", f"-output-directory={build}", tex.name]
    for _ in range(2):  # due passaggi per indice e riferimenti
        r = subprocess.run(cmd, cwd=tex.parent, env=env, capture_output=True, text=True, errors="replace")
        if r.returncode != 0:
            print(f"::error file={tex.relative_to(DOCS).as_posix()}::compilazione fallita")
            print("\n".join(r.stdout.splitlines()[-25:]))
            return False
    shutil.copy2(build / (tex.stem + ".pdf"), dest)
    return True


def classifica(rel: Path) -> tuple:
    parti = [p.lower() for p in rel.parts[:-1]]
    nome = rel.stem.lower()
    fase = next((p for p in parti if p in FASI), "")
    if any(p.startswith("diari") for p in parti) or "diario" in nome:
        return "", "diari-di-bordo"
    if any(p.startswith("verbal") for p in parti) or "verbale" in nome:
        esterno = any(p.startswith("estern") for p in parti) or "estern" in nome
        return fase, "verbali-esterni" if esterno else "verbali-interni"
    return fase, "documenti"


def chiave(rel: Path) -> str:
    """Nome senza "-firmato", per abbinare il PDF firmato al suo verbale."""
    return FIRMATO.sub("", rel.stem).lower().replace("_", "-")


def voce(rel: Path, meta: dict) -> dict:
    fase, sezione = classifica(rel)
    m = re.match(r"(\d{4}-\d{2}-\d{2})", rel.stem)
    return {
        "file": "pdf/" + rel.with_suffix(".pdf").as_posix(),
        "fase": fase,
        "sezione": sezione,
        "nome": rel.stem,
        "titolo": meta.get("titolo", ""),
        "con": meta.get("con", ""),
        "versione": meta.get("versione", ""),
        "data": m.group(1) if m else "",
    }


def commit_documenti() -> str:
    if os.environ.get("DOCUMENTI_SHA"):
        return os.environ["DOCUMENTI_SHA"]
    r = subprocess.run(["git", "rev-parse", "HEAD"], cwd=DOCS, capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""


def main():
    solo_sito = "--solo-sito" in sys.argv
    if not DOCS.is_dir():
        sys.exit(f"Repo documentale non trovata in {DOCS} (clonala lì o imposta DOCUMENTI)")
    for d in (OUT, BUILD):
        if d.exists():
            shutil.rmtree(d)
    shutil.copytree(SITO, OUT)
    (OUT / ".nojekyll").touch()
    # "?v=..." su CSS e JS: a ogni pubblicazione il browser scarica i file nuovi invece di quelli in cache
    pagina = OUT / "index.html"
    # (commit del sito + commit dei documenti, così cambia anche quando si aggiorna solo documenti-swe)
    stampo = "-".join(x[:7] for x in (os.environ.get("GITHUB_SHA", ""), commit_documenti()) if x)
    stampo = stampo or datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    pagina.write_text(re.sub(r'((?:href|src)="assets/(?:css|js)/[^"?]+)"', lambda m: f'{m.group(1)}?v={stampo}"',
                             pagina.read_text(encoding="utf-8")), encoding="utf-8")

    documenti, firmati, errori = [], {}, 0
    for f in sorted(DOCS.rglob("*")):
        rel = f.relative_to(DOCS)
        if not f.is_file() or f.suffix.lower() not in (".tex", ".pdf"):
            continue
        if any(p.startswith(".") or p.lower() in IGNORATE for p in rel.parts[:-1]):
            continue
        dest = OUT / "pdf" / rel.with_suffix(".pdf")
        if f.suffix.lower() == ".tex":
            if f.stat().st_size == 0:
                continue
            meta = metadati(f)
            if meta["segnaposto"] > 0:
                print(f"::warning file={rel.as_posix()}::{meta['segnaposto']} segnaposto \\ph{{...}} ancora da compilare")
            if not solo_sito:
                print(f"Compilo {rel.as_posix()}")
                if not compila(f, dest):
                    errori += 1
                    continue
            documenti.append(voce(rel, meta))
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dest)
            if FIRMATO.search(f.stem):
                firmati[chiave(rel)] = "pdf/" + rel.as_posix()
            elif f.with_suffix(".tex").exists():
                continue  # PDF compilato e versionato per sbaglio: vale quello generato dal .tex
            else:
                documenti.append(voce(rel, {}))

    for d in documenti:
        k = chiave(Path(d["nome"]))
        if k in firmati:
            d["firmato"] = firmati.pop(k)
    for k, file in firmati.items():  # firmati senza sorgente: compaiono da soli
        d = voce(Path(file[4:]), {})
        d["file"] = file
        documenti.append(d)

    shutil.rmtree(BUILD, ignore_errors=True)
    js = "// Generato da scripts/compila.py: non modificare a mano\nwindow.DOCUMENTI = "
    (OUT / "assets/js/documenti.js").write_text(js + json.dumps(documenti, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    versione = {"documenti": commit_documenti(), "generato": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    (OUT / "versione.json").write_text(json.dumps(versione) + "\n", encoding="utf-8")
    print(f"{len(documenti)} documenti, {errori} errori")
    sys.exit(1 if errori else 0)


if __name__ == "__main__":
    main()
