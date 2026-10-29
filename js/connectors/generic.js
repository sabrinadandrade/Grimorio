/* Conector genérico / generic connector
 * Funciona com qualquer texto: linhas com data viram provas, "pergunta ;; resposta" vira carta,
 * e linhas soltas (sem data) viram temas.
 * Works with any text: lines with a date become exams, "question ;; answer" becomes a card,
 * and plain lines become topics. */
G.connectors.register({
  id: "generic",
  name: "Qualquer instituição / uso pessoal",
  nameEn: "Any school / personal use",
  emoji: "✨",
  help: {
    pt: `Cole qualquer texto, uma informação por linha. Exemplos:<br>
<code>Cálculo I - 06/11 09:00 - Sala 12</code> → prova<br>
<code>Cálculo I</code> + na linha de baixo <code>13/11 às 10h30</code> → prova<br>
<code>O que é derivada? ;; Taxa de variação instantânea</code> → carta do tarot<br>
<code>Limites e continuidade</code> (sem data) → tema (o app pergunta de qual matéria)`,
    en: `Paste any text, one item per line. Examples:<br>
<code>Calculus I - 11/06 09:00 - Room 12</code> → exam (dates as day/month)<br>
<code>Calculus I</code> + next line <code>13/11 10:30</code> → exam<br>
<code>What is a derivative? ;; Instant rate of change</code> → tarot card<br>
<code>Limits and continuity</code> (no date) → topic (the app asks which subject)`
  },
  parse(text) {
    const L = G.cleanLines(text), out = { subjects: [], exams: [], cards: [], topicsOnly: [] };
    L.forEach((line, i) => {
      if (line.includes(";;")) { const [q, a] = line.split(";;"); out.cards.push({ subject: "", q: q.trim(), a: (a || "").trim() }); return; }
      const d = G.parseDateLoose(line);
      if (d) {
        let name = line.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/, "").replace(/\d{4}-\d{2}-\d{2}/, "").replace(/\b\d{1,2}\s*[:h]\s*\d{2}\b/, "")
          .replace(/(^|\s)(prova|exame|exam|test|av\d?|às|as|at|dia|em|on)(?=\s|$)/giu, " ").replace(/[-–—|,:;()]+/g, " ").replace(/\s+/g, " ").trim();
        let place = "";
        const parts = line.split(/\s[-–—|]\s/);
        if (parts.length >= 3) { name = parts[0].trim(); place = parts.slice(2).join(" - ").trim(); }
        if (!name && i > 0 && !G.parseDateLoose(L[i - 1])) { name = L[i - 1]; out.topicsOnly = out.topicsOnly.filter(x => x !== name); }
        if (name) out.exams.push({ subject: name, date: d.date, time: d.time, place });
        return;
      }
      const next = L[i + 1];
      if (next && G.parseDateLoose(next) && next.replace(/[\d\/:hàsat ,.-]/gi, "").length < 3) return; // é o nome da prova da linha de baixo
      out.topicsOnly.push(line);
    });
    out.exams.forEach(e => out.subjects.push({ name: e.subject }));
    return out;
  }
});
