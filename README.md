# Bending Forks · Gruppo 15

Sito del gruppo 15 *Bending Forks* (Ingegneria del Software 2026/27, Università di Padova):
https://bendingforksswe.github.io/

Il sito mostra i documenti della repo [documenti-swe](https://github.com/bendingforksswe/documenti-swe):
una GitHub Action la scarica, compila ogni `.tex` in PDF e pubblica la pagina su GitHub Pages.
**Per pubblicare un documento basta fare push su documenti-swe**: entro circa 15 minuti il sito si aggiorna da solo.

## Come vengono letti i documenti di documenti-swe
La cartella in cui sta il file decide dove compare sul sito (maiuscole/minuscole indifferenti):

```
verbali/esterni/AAAA-MM-GG_verbale-esterno-<azienda>.tex      -> Verbali esterni
verbali/esterni/firmati/<stesso nome>-firmato.pdf             -> bottone "firmato" accanto al verbale
verbali/interni/AAAA-MM-GG_verbale_interno_<n>_V1.0.tex       -> Verbali interni
diari-di-bordo/AAAA-MM-GG_....pdf                             -> Diari di bordo
qualsiasi altro .tex o .pdf                                   -> Documenti
template/, modelli/, assets/                                  -> ignorate
```

- **Data**: dal prefisso `AAAA-MM-GG` del nome file. **Versione**: dalla riga `\textbf{Versione} & x.y.z` in copertina.
- **Fase** (Candidatura, RTB, PB): da una cartella `candidatura/`, `rtb/` o `pb/` nel percorso, se c'è;
  altrimenti dalla data, confrontata con le scadenze in `sito/assets/js/config.js`.
- I `.tex` vuoti vengono saltati; i PDF già pronti vengono copiati così come sono.
- Le immagini `Assets/<file>` usate nei `.tex` vengono prese dalla cartella `assets/` di documenti-swe.
- Metadati facoltativi in testa al `.tex`: `%! titolo: Valutazione dei capitolati`, `%! con: Uranion`.

Nel log dell'Action compare un avviso per ogni documento con segnaposto `\ph{...}` ancora da compilare.
Se un documento non compila, l'Action fallisce e il sito resta quello precedente.

Dati del gruppo, capitolato, scadenze e documenti attesi per fase (mostrati "in preparazione" finché mancano)
sono in `sito/assets/js/config.js`.

## Quando si aggiorna il sito
Workflow `.github/workflows/pubblica.yml`:
- ogni 15 minuti controlla l'ultimo commit di documenti-swe e ricompila solo se è diverso da quello pubblicato
  (il commit pubblicato è in https://bendingforksswe.github.io/versione.json);
- a ogni push su `main` di questa repo;
- a mano: Actions → *Compila e pubblica il sito* → *Run workflow*;
- subito, se qualcuno invia un `repository_dispatch` di tipo `documenti-aggiornati`.

## Configurazione (una volta sola, serve un admin della repo)
1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Secret `DOCS_TOKEN`**: documenti-swe è privata, quindi l'Action ha bisogno di un token in sola lettura.
   - github.com → Settings → Developer settings → Personal access tokens → *Fine-grained tokens* → Generate new token;
   - Resource owner: `bendingforksswe`; Repository access: *Only select repositories* → `documenti-swe`;
   - Permissions → Repository permissions → **Contents: Read-only** (Metadata: Read-only viene aggiunto da solo);
   - in questa repo: Settings → Secrets and variables → Actions → New repository secret,
     nome `DOCS_TOKEN`, valore il token.
   Se l'organizzazione richiede l'approvazione dei fine-grained token, un owner deve approvarlo in
   Organization settings → Personal access tokens → Pending requests.
   Alla scadenza del token l'Action fallisce con un messaggio chiaro: basta rigenerarlo e aggiornare il secret.

## Provare in locale
Serve Python 3 e una distribuzione LaTeX (TeX Live o MiKTeX). Clona documenti-swe in `documenti/`
(oppure imposta la variabile `DOCUMENTI` con il percorso della repo) e lancia:

```
python3 scripts/compila.py
```

poi apri `_site/index.html` nel browser. Con `--solo-sito` genera la pagina senza compilare i PDF.
