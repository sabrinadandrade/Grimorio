/* Conector Estácio (estudante.estacio.br — Sala de Aula Virtual)
 * Lê o texto copiado de:
 *  - página Início  → disciplinas + provas (ex.: "Realizar prova AV (no polo)" / "06/11, às 10:35")
 *  - página Minhas Disciplinas → disciplinas
 *  - página Conteúdos de uma disciplina → temas ("Tema 2" / "Sintaxe e Componentes…")
 * Nenhuma senha é usada: a pessoa copia e cola o que já vê na tela. */
G.connectors.register({
  id: "estacio",
  name: "Estácio (Sala de Aula Virtual)",
  nameEn: "Estácio (Brazil)",
  emoji: "🎓",
  help: {
    pt: `1. Entre em <b>estudante.estacio.br</b> normalmente.<br>
2. Na página <b>Início</b>, aperte <kbd>Ctrl</kbd>+<kbd>A</kbd> e depois <kbd>Ctrl</kbd>+<kbd>C</kbd>.<br>
3. Cole aqui e clique em <b>Analisar</b>: eu acho suas disciplinas e as provas agendadas.<br>
4. Pra puxar os <b>temas</b>: abra a disciplina → <b>Conteúdos</b> → clique em "Mostrar mais" até aparecer tudo → copie e cole aqui.<br>
<small>Você não precisa me dar sua senha. 💜</small>`,
    en: `1. Log in to <b>estudante.estacio.br</b>.<br>2. On <b>Início</b>, press Ctrl+A then Ctrl+C.<br>3. Paste here and click <b>Analyze</b> to get subjects and scheduled exams.<br>4. For <b>topics</b>: open a subject → Conteúdos → "Mostrar mais" until everything shows → copy & paste here.`
  },
  parse(text) {
    const L = G.cleanLines(text), out = { subjects: [], exams: [], cards: [], topicsOnly: [] };
    const skipName = n => /enade|forma[cç][aã]o socioemocional/i.test(n);
    const title = s => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(De|Da|Do|Das|Dos|E|Em|Com|Para|Na|No)\b/g, w => w.toLowerCase());
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      // provas / exams
      const pm = l.match(/^realizar prova\s+(\w+)\s*(?:\(([^)]*)\))?/i);
      if (pm && i > 0) {
        const d = G.parseDateLoose(L[i + 1] || "");
        if (d) out.exams.push({ subject: title(L[i - 1]), date: d.date, time: d.time, place: `Prova ${pm[1].toUpperCase()}${pm[2] ? " (" + pm[2] + ")" : ""}` });
        continue;
      }
      // disciplinas / subjects
      if (/^(digital|presencial|semipresencial|flex|h[ií]brid)/i.test(l) && /\(|ead|presencial/i.test(l)) {
        const n = L[i + 1];
        if (n && !/%|acessar/i.test(n) && !skipName(n)) out.subjects.push({ name: title(n) });
        continue;
      }
      // temas / topics
      const tm = l.match(/^tema\s+\d+/i);
      if (tm) {
        let n = L[i + 1];
        if (n && /\.\.\.$/.test(n) && L[i + 2] && L[i + 2].toLowerCase().startsWith(n.slice(0, -3).toLowerCase())) n = L[i + 2];
        if (n && !/^(introdu|prepare|aprenda mais|apresenta|conclu|tema\b)/i.test(n)) out.topicsOnly.push(n.replace(/\.\.\.$/, ""));
      }
    }
    // remove temas truncados duplicados ("Plataformas de Middleware e Protocolos D...")
    out.topicsOnly = out.topicsOnly.filter((t, i, a) => a.indexOf(t) === i);
    const seen = new Set();
    out.subjects = out.subjects.concat(out.exams.map(e => ({ name: e.subject }))).filter(s => { const k = G.norm(s.name); if (seen.has(k)) return false; seen.add(k); return true; });
    return out;
  }
});
