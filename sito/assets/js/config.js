// Informazioni fisse del sito. I documenti NON si elencano qui:
// il sito li trova da solo in base ai file presenti nella repo documenti-swe (vedi README).

window.SITO = {
  gruppo: {
    nome: "Bending Forks",
    numero: 15,
    email: "bending.forks.swe@gmail.com",
    github: "https://github.com/bendingforksswe",
    corso: "Ingegneria del Software · A.A. 2026/27 · Università degli Studi di Padova",
  },

  capitolato: {},

  // Fasi in ordine. Un documento senza cartella di fase va nella prima fase la cui scadenza
  // non è precedente alla sua data (o nella prima fase senza scadenza).
  // "attesi": documenti previsti per la fase; compaiono "in preparazione" finché non esiste
  // un file il cui nome contiene "nome" (trattini, underscore e maiuscole indifferenti;
  // più alternative separate da "|").
  fasi: [
    {
      id: "candidatura",
      titolo: "Candidatura",
      scadenza: "2026-10-30",
      attesi: [
        { nome: "lettera", titolo: "Lettera di presentazione" },
        { nome: "capitolati", titolo: "Valutazione dei capitolati" },
        { nome: "preventivo|impegni", titolo: "Preventivo dei costi e assunzione degli impegni" },
      ],
    },
    { id: "rtb", titolo: "RTB", attesi: [] },
    { id: "pb", titolo: "PB", attesi: [] },
  ],

  membri: [
    { nome: "Marco Beltrame", matricola: "2111021" },
    { nome: "Lorenzo Milanese", matricola: "2117110" },
    { nome: "Filippo Rampazzo", matricola: "2101097" },
    { nome: "Nicholas Salmaso", matricola: "2080038" },
    { nome: "Luca Stangherlin", matricola: "2137996" },
    { nome: "Aldo Toffoli", matricola: "2113202" },
    { nome: "Matteo Wu", matricola: "2075514" },
  ],
};
