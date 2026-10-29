/* Importação e exportação / import & export
 * Formatos: backup .json completo, pacote .json (matérias/provas/cartas), .csv e calendário .ics */
window.G = window.G || {};
(function () {
  /* aplica o resultado de um conector ou pacote / apply connector or pack result */
  G.applyParsed = function (r, topicsSubjectId) {
    let s = 0, e = 0, c = 0;
    const before = G.state.subjects.length;
    (r.subjects || []).forEach(x => {
      const sub = G.findOrCreateSubject(x.name, { short: x.short, emoji: x.emoji, color: x.color, notes: x.notes });
      if (x.topics) G.addTopics(sub, x.topics);
    });
    (r.exams || []).forEach(x => { if (x.inDays != null && !x.date) x.date = G.addDays(G.todayIso(), +x.inDays); if (!x.date) return; const sub = G.findOrCreateSubject(x.subject); if (G.addExam(sub.id, x.date, x.time, x.place)) e++; });
    (r.cards || []).forEach(x => {
      const sub = x.subject ? G.findOrCreateSubject(x.subject) : (topicsSubjectId ? G.subj(topicsSubjectId) : null);
      if (G.addCard(sub ? sub.id : "", x.q, x.a)) c++;
    });
    if (r.topicsOnly && r.topicsOnly.length && topicsSubjectId) G.addTopics(G.subj(topicsSubjectId), r.topicsOnly);
    s = G.state.subjects.length - before;
    G.save();
    return { s, e, c };
  };

  /* CSV */
  function parseCSV(text) {
    const sep = (text.split("\n")[0].match(/;/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => x.trim()));
  }
  const H = { tipo: "type", type: "type", materia: "subject", subject: "subject", disciplina: "subject", data: "date", date: "date", hora: "time", time: "time", local: "place", place: "place",
    titulo: "title", title: "title", tema: "title", topic: "title", detalhe: "detail", detail: "detail", pergunta: "q", question: "q", resposta: "a", answer: "a" };
  G.csvToParsed = function (text) {
    const rows = parseCSV(text); if (!rows.length) return null;
    const head = rows[0].map(h => H[G.norm(h).replace(/ /g, "")] || G.norm(h));
    const out = { subjects: [], exams: [], cards: [], topicsOnly: [] }, bySub = {};
    rows.slice(1).forEach(r => {
      const o = {}; head.forEach((h, i) => o[h] = (r[i] || "").trim());
      const ty = G.norm(o.type);
      if (!o.subject && ty !== "carta" && ty !== "card") return;
      const sub = bySub[o.subject] = bySub[o.subject] || { name: o.subject, topics: [] };
      if (/^(prova|exam)/.test(ty) || (!ty && o.date)) { const d = G.parseDateLoose(o.date) || {}; if (d.date) out.exams.push({ subject: o.subject, date: d.date, time: o.time || d.time, place: o.place }); }
      else if (/^(tema|topic)/.test(ty) || (!ty && o.title)) sub.topics.push(o.title + (o.detail ? " | " + o.detail : ""));
      else if (/^(carta|card)/.test(ty) || (!ty && o.q)) out.cards.push({ subject: o.subject, q: o.q, a: o.a });
    });
    out.subjects = Object.values(bySub).filter(s => s.name);
    return out;
  };
  G.csvTemplate = () => "tipo,materia,data,hora,local,titulo,detalhe,pergunta,resposta\n" +
    "prova,Cálculo I,2026-11-06,09:00,Sala 12,,,,\n" +
    "tema,Cálculo I,,,,Limites,definição e propriedades,,\n" +
    "tema,Cálculo I,,,,Derivadas,regras básicas,,\n" +
    "carta,Cálculo I,,,,,,O que é derivada?,Taxa de variação instantânea\n";

  /* ICS (Google Agenda, Outlook, Moodle…) */
  G.icsToParsed = function (text) {
    const out = { subjects: [], exams: [], cards: [], topicsOnly: [] };
    const unf = text.replace(/\r?\n[ \t]/g, "");
    unf.split("BEGIN:VEVENT").slice(1).forEach(ev => {
      const get = k => { const m = ev.match(new RegExp("^" + k + "[^:\\n]*:(.*)$", "m")); return m ? m[1].trim().replace(/\\,/g, ",").replace(/\\n/g, " ") : ""; };
      const sum = get("SUMMARY"), dt = get("DTSTART"), loc = get("LOCATION");
      const m = dt.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
      if (!sum || !m) return;
      let time = m[4] ? `${m[4]}:${m[5]}` : "";
      if (m[4] && /Z$/.test(dt)) { const d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5])); time = G.pad2(d.getHours()) + ":" + G.pad2(d.getMinutes()); }
      const name = sum.replace(/^(prova|exame|exam|test|avalia[cç][aã]o)\s*(de|of|:|-)?\s*/i, "").trim() || sum;
      out.exams.push({ subject: name, date: `${m[1]}-${m[2]}-${m[3]}`, time, place: loc });
      out.subjects.push({ name });
    });
    return out;
  };

  /* JSON: backup completo ou pacote / full backup or pack */
  G.importJSON = function (obj) {
    if (obj && obj.v && Array.isArray(obj.pets) && obj.plan) { // backup completo
      if (!confirm(G.t("resetConfirm").replace(/!.*/, "?"))) return null;
      if (G.safety) G.safety.snapshot("before-import");
      G.state = Object.assign(G.defaultState(), obj); G.lang = G.state.lang; G.save();
      return { s: G.state.subjects.length, e: G.state.exams.length, c: G.state.cards.length, full: true };
    }
    return G.applyParsed(obj);
  };

  G.isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  G.download = async function (name, text, type) {
    if (G.isNative()) { // app Android: salva e abre o menu "Compartilhar" / Android app: save + share sheet
      try {
        const { Filesystem, Share } = window.Capacitor.Plugins;
        const r = await Filesystem.writeFile({ path: name, data: text, directory: "CACHE", encoding: "utf8" });
        await Share.share({ title: name, url: r.uri, dialogTitle: name });
      } catch (e) { alert("⚠️ " + (e.message || e)); }
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
    a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  G.exportJSON = () => G.download("grimorio-backup-" + G.todayIso() + ".json", JSON.stringify(G.state, null, 2), "application/json");

  G.readFile = function (file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const txt = r.result, n = file.name.toLowerCase();
        try {
          if (n.endsWith(".json")) res(G.importJSON(JSON.parse(txt)));
          else if (n.endsWith(".ics")) res(G.applyParsed(G.icsToParsed(txt)));
          else if (n.endsWith(".csv")) res(G.applyParsed(G.csvToParsed(txt) || {}));
          else res(null);
        } catch (e) { rej(e); }
      };
      r.onerror = rej; r.readAsText(file);
    });
  };
})();
