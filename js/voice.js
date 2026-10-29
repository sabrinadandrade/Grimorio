/* 🎙️ Falar com o Grimório / Talk to the Grimoire
 *
 * A pessoa fala (pelo microfone do teclado do celular, ou pelo botão de voz quando o navegador tem) ou escreve
 * um pedido, e o Grimório entende AQUI MESMO, sem internet e sem IA externa:
 *   "lembrar de dar remédio pro gato amanhã às 8"  → nova atividade com lembrete
 *   "prova de cálculo dia 12/11 às 9h"             → marca a prova
 *   "concluir lavar a louça"                         → marca como feita
 *   "o que eu tenho hoje?"                           → lista do dia
 *   "começar foco em derivadas"                      → acende a vela (timer)
 * Antes de salvar, mostra o que entendeu e pede confirmação.
 *
 * The person speaks (keyboard dictation, or the browser's voice button when available) or types a request,
 * and the Grimoire understands it locally — no internet, no external AI. It always asks for confirmation. */
window.G = window.G || {};
(function () {
  const V = G.cmd = {};
  /* minúsculas e sem acento, mantendo o mesmo tamanho do texto / lowercase, accent-free, same length */
  const MAP = { á: "a", à: "a", â: "a", ã: "a", ä: "a", é: "e", è: "e", ê: "e", ë: "e", í: "i", ì: "i", î: "i", ï: "i", ó: "o", ò: "o", ô: "o", õ: "o", ö: "o", ú: "u", ù: "u", û: "u", ü: "u", ç: "c", ñ: "n" };
  const norm = s => [...s.toLowerCase()].map(c => MAP[c] || c).join("");
  const iso = d => G.iso(d);
  const NUM = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, vinte: 20, trinta: 30, meia: 30,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30 };
  const num = w => w == null ? NaN : /^\d+$/.test(w) ? +w : (NUM[w] || NaN);
  const NW = "(\\d{1,2}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty)";
  const WD = [["domingo", "sunday"], ["segunda", "monday"], ["terca", "tuesday"], ["quarta", "wednesday"], ["quinta", "thursday"], ["sexta", "friday"], ["sabado", "saturday"]];
  const WDRE = "(domingo|segunda|terca|quarta|quinta|sexta|sabado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)(?:-feira| feira)?";
  const wdIdx = w => WD.findIndex(p => p.includes(w));
  const MONTHS = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const MONTHS_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

  /* recorta trechos já entendidos / cut understood pieces out of the text */
  function Cutter(text) {
    this.o = text; this.n = norm(text); this.mask = new Array(text.length).fill(false);
  }
  Cutter.prototype.find = function (re) {
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m; while ((m = r.exec(this.n))) {
      const s = m.index, e = s + m[0].length;
      if (m[0].length && !this.mask.slice(s, e).some(Boolean)) return m;
      if (!m[0].length) r.lastIndex++;
    }
    return null;
  };
  Cutter.prototype.cut = function (m) { for (let i = m.index; i < m.index + m[0].length; i++) this.mask[i] = true; };
  Cutter.prototype.rest = function () { return [...this.o].map((c, i) => this.mask[i] ? " " : c).join("").replace(/\s+/g, " ").trim(); };

  function nextWeekday(from, wd, allowToday) {
    const d = new Date(from + "T12:00"); let k = (wd - d.getDay() + 7) % 7; if (k === 0 && !allowToday) k = 7;
    return G.addDays(from, k);
  }

  /* data, repetição e hora / date, repeat and time */
  function parseWhen(c, today) {
    const r = { date: null, repeat: "none", days: [], time: "" };
    let m;
    // repetição / repeat
    if ((m = c.find(/\b(todo santo dia|todos os dias|todo dia|diariamente|every ?day|daily)\b/))) { r.repeat = "daily"; c.cut(m); }
    if ((m = c.find(new RegExp("\\b(?:tod[ao]s? (?:as |os )?|every )" + WDRE + "(?:(?:,| e| and) " + WDRE + ")*", "")))) {
      const days = [...m[0].matchAll(new RegExp(WDRE, "g"))].map(x => wdIdx(x[1])).filter(x => x >= 0);
      if (days.length) { r.repeat = "weekly"; r.days = [...new Set(days)].sort(); c.cut(m); }
    }
    if ((m = c.find(/\b(?:dias de semana|dias uteis|de segunda a sexta|weekdays)\b/))) { r.repeat = "weekly"; r.days = [1, 2, 3, 4, 5]; c.cut(m); }
    if ((m = c.find(/\b(?:fins? de semana|weekends?)\b/)) && r.repeat === "none") { r.repeat = "weekly"; r.days = [0, 6]; c.cut(m); }
    // datas relativas / relative dates
    if ((m = c.find(/\b(?:depois de amanha|day after tomorrow)\b/))) { r.date = G.addDays(today, 2); c.cut(m); }
    else if ((m = c.find(/\b(?:amanha|tomorrow)\b/))) { r.date = G.addDays(today, 1); c.cut(m); }
    else if ((m = c.find(/\b(?:hoje|today|hj)\b/))) { r.date = today; c.cut(m); }
    if (!r.date && (m = c.find(new RegExp("\\b(?:daqui a|daqui|em|in) " + NW + " (dias?|semanas?|days?|weeks?)\\b")))) {
      const n = num(m[1]); if (n) { r.date = G.addDays(today, /seman|week/.test(m[2]) ? n * 7 : n); c.cut(m); }
    }
    if (!r.date && (m = c.find(/\b(?:(?:na |a )?(?:proxima|que vem) semana|semana que vem|next week)\b/))) { r.date = G.addDays(today, 7); c.cut(m); }
    // dia 12/11, 12/11/2026, 12 de novembro, dia 12
    if (!r.date && (m = c.find(/\b(?:dia |on )?(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/))) {
      let [, d, mo, y] = m; if (G.lang === "en") [d, mo] = [mo, d]; // EUA: mês/dia
      const Y = y ? (y.length === 2 ? 2000 + +y : +y) : null;
      const cand = (yy) => `${yy}-${G.pad2(+mo)}-${G.pad2(+d)}`;
      let out = cand(Y || +today.slice(0, 4)); if (!Y && out < today) out = cand(+today.slice(0, 4) + 1);
      if (+mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31) { r.date = out; c.cut(m); }
    }
    if (!r.date && (m = c.find(new RegExp("\\b(?:dia )?(\\d{1,2})(?: de |\\s)(" + MONTHS.join("|") + "|" + MONTHS_EN.join("|") + ")\\b")))) {
      const mo = (MONTHS.indexOf(m[2]) + 1) || (MONTHS_EN.indexOf(m[2]) + 1); let y = +today.slice(0, 4);
      let out = `${y}-${G.pad2(mo)}-${G.pad2(+m[1])}`; if (out < today) out = `${y + 1}-${G.pad2(mo)}-${G.pad2(+m[1])}`;
      r.date = out; c.cut(m);
    }
    if (!r.date && (m = c.find(/\b(?:no |on the )?dia (\d{1,2})\b/))) {
      const d = +m[1]; if (d >= 1 && d <= 31) { let [y, mo] = today.split("-").map(Number); let out = `${y}-${G.pad2(mo)}-${G.pad2(d)}`; if (out < today) { mo++; if (mo > 12) { mo = 1; y++; } out = `${y}-${G.pad2(mo)}-${G.pad2(d)}`; } r.date = out; c.cut(m); }
    }
    if (!r.date && r.repeat === "none" && (m = c.find(new RegExp("\\b(?:(?:na|no|nesta|neste|nessa|nesse|esta|este|essa|esse|proxima|proximo|next|this|on)\\s+)?" + WDRE + "(?:\\s+(?:que vem|next))?\\b")))) {
      r.date = nextWeekday(today, wdIdx(m[1]), !/proxim|next|que vem/.test(m[0])); c.cut(m);
    }
    // hora / time
    if ((m = c.find(/\b(?:ao |at )?(?:meio[- ]dia|noon)\b/))) { r.time = "12:00"; c.cut(m); }
    else if ((m = c.find(/\b(?:a |at )?(?:meia[- ]noite|midnight)\b/))) { r.time = "00:00"; c.cut(m); }
    else {
      const T = new RegExp("\\b(?:(?:as|a|pelas|pela|at|by|@)\\s+)?" + NW + "(?:(?:\\s*(?:h|:|horas?)\\s*)(\\d{2})?|\\s*(?:e meia))?(?:\\s*(?:h|hs|horas?|o'?clock))?(?:\\s*(am|pm))?(?:\\s+(?:da|de|of the|in the)\\s+(manha|tarde|noite|madrugada|morning|afternoon|evening|night))?\\b");
      let tm = null, x;
      const re = new RegExp(T.source, "g");
      while ((x = re.exec(c.n))) {
        if (!x[0].trim()) { re.lastIndex++; continue; }
        if (c.mask.slice(x.index, x.index + x[0].length).some(Boolean)) continue;
        const s = x[0];
        // precisa de um sinal de que é hora: "às", "h", ":", "horas", "da manhã"... / needs a time cue
        const strong = /^(as|pelas|pela|at|@)\s/.test(s);
        const cue = /\d\s*(h|:)|hora|e meia|\b(am|pm)\b|manha|tarde|noite|madrugada|morning|afternoon|evening|night|clock/.test(s);
        if (!strong && !cue) continue;
        tm = x; break;
      }
      if (tm) {
        let h = num(tm[1]), mi = tm[2] ? +tm[2] : /e meia/.test(tm[0]) ? 30 : 0; const ap = tm[3], per = tm[4];
        if (!isNaN(h) && h <= 24 && mi < 60) {
          if ((ap === "pm" || /tarde|noite|afternoon|evening|night/.test(per || "")) && h < 12) h += 12;
          if ((ap === "am" || /madrugada/.test(per || "")) && h === 12) h = 0;
          r.time = G.pad2(h % 24) + ":" + G.pad2(mi); c.cut(tm);
        }
      }
    }
    // período sem hora / part of day without a time
    if (!r.time && (m = c.find(/\b(?:de manha|pela manha|in the morning)\b/))) { r.time = "08:00"; c.cut(m); }
    else if (!r.time && (m = c.find(/\b(?:a tarde|de tarde|in the afternoon)\b/))) { r.time = "14:00"; c.cut(m); }
    else if (!r.time && (m = c.find(/\b(?:a noite|de noite|toda noite|tonight|at night)\b/))) { r.time = "20:00"; c.cut(m); if (/toda/.test(m[0]) && r.repeat === "none") r.repeat = "daily"; }
    return r;
  }

  function parseRemind(c) {
    let m;
    if ((m = c.find(new RegExp("\\b(?:(?:com |e )?(?:lembrete|aviso|avisar|avise|me avisa|me avise|remind me|reminder)\\s+)?(?:de |com )?" + NW + "\\s*(min|minutos?|minutes?|h|horas?|hours?)\\s+(?:antes|before)\\b")))) {
      const n = num(m[1]); c.cut(m); return /^h/.test(m[2]) ? n * 60 : n;
    }
    if ((m = c.find(/\b(?:(?:com |e )?(?:lembrete|aviso|avisar)\s+)?(?:um dia antes|na vespera|1 dia antes|a day before|the day before)\b/))) { c.cut(m); return 1440; }
    if ((m = c.find(/\b(?:(?:com |e )?(?:lembrete|aviso|me avis[ae])\s+)?(?:na hora|at the time)\b/))) { c.cut(m); return 0; }
    if ((m = c.find(/\b(?:sem lembrete|sem aviso|no reminder)\b/))) { c.cut(m); return -1; }
    return null;
  }
  function parsePrio(c) {
    let m;
    if ((m = c.find(/\b(?:muito importante|super importante|urgente|importante|prioridade alta|alta prioridade|urgent|important|high priority)\b/))) { c.cut(m); return "high"; }
    if ((m = c.find(/\b(?:sem pressa|quando der|baixa prioridade|prioridade baixa|low priority|no rush)\b/))) { c.cut(m); return "low"; }
    return null;
  }
  const AREA_WORDS = [
    ["pets", /\b(gat[oa]s?|cachorr[oa]s?|cao|pet|pets|racao|areia|veterinari|vet|passear com|banho e tosa|vacina d[oa] (gat|cachorr)|cat|dog|litter)/],
    ["health", /\b(remedio|medicamento|vitamina|medico|medica|consulta|dentista|exame de sangue|terapia|psicolog|academia|treino|caminhada|agua|beber agua|dormir|medicine|doctor|gym|workout|pill)/],
    ["kids", /\b(filh[oa]s?|bebe|crianca|escola d[oa]s? (crianc|menin|filh)|fralda|mamadeira|creche|pediatra|kids?|baby|daycare)/],
    ["work", /\b(reuniao|trabalho|cliente|relatorio|planilha|chefe|e-?mail|projeto|entrega|meeting|work|client|report|deadline)/],
    ["study", /\b(estudar|estudo|aula|ler|leitura|resumo|exercicio|faculdade|curso|revisar|simulado|tcc|study|class|read|homework)/],
    ["home", /\b(louca|lavar|limpar|limpeza|varrer|aspirar|roupa|passar roupa|lixo|mercado|compras|cozinhar|almoco|jantar|janta|casa|banheiro|cama|plantas|regar|conta de|pagar|aluguel|dishes|laundry|clean|trash|groceries|cook)/],
    ["personal", /\b(aniversario|festa|encontro|cinema|ligar para|ligar pra|visitar|viagem|presente|birthday|party|call|visit|trip)/]
  ];
  const guessArea = n => (AREA_WORDS.find(([, re]) => re.test(n)) || ["daily"])[0];
  const LEAD = /^\s*(?:(?:ei|oi|ola|hey|grimorio|por favor|please|voce pode|pode|consegue|quero que voce|quero|preciso|eu preciso|eu tenho que|tenho que|tem que|vou|i need to|i have to|can you|could you)[\s,]+)*(?:me\s+)?(?:lembr[ae]r?(?:-me)?|lembre-me|me lembr[ae]|lembra|lembrete|crie|criar|cria|adicion[ae]r?|anot[ae]r?|agend[ae]r?|marc[ae]r?|coloc[ae]r?|bot[ae]r?|nova atividade|novo lembrete|nova tarefa|remind me|add|create|schedule|set a reminder|reminder)?\b\s*(?:(?:de|que|pra|para|um|uma|o|a|lembrete|tarefa|atividade|to|a reminder to|that)\s+)*/;
  const tidy = s => {
    let x = s.replace(/[.!?]+$/, "").replace(/\s+([,.!?])/g, "$1").replace(/^[\s,;:-]+|[\s,;:-]+$/g, "");
    for (let i = 0; i < 4; i++) x = x.replace(/^(de|que|pra|para|a|o|e|em|no|na|as|às|com|to|at|on|and|the)\s+/i, "").replace(/\s+(de|que|pra|para|e|em|no|na|as|às|com|to|at|on|and|the|a|o)$/i, "").trim();
    return x.charAt(0).toUpperCase() + x.slice(1);
  };
  const tokens = s => norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !/^(com|para|pra|que|uma|dos|das|the|and|for)$/.test(w));
  const score = (q, title) => { const a = tokens(q), b = tokens(title); if (!a.length || !b.length) return 0; const hit = a.filter(w => b.some(x => x.startsWith(w.slice(0, 4)) || w.startsWith(x.slice(0, 4)))).length; return hit / Math.max(a.length, 1) + hit / b.length / 2; };

  /* ====== interpretar / parse ====== */
  V.parse = function (text, today) {
    today = today || G.todayIso();
    const raw = String(text || "").trim(); if (!raw) return { intent: "none" };
    const n = norm(raw);
    // 1) o que tenho hoje? / what do I have?
    if (/^(?:e\s+)?(?:o\s*que|oque|qual|quais|what|whats|what's)\b.*\b(?:tenho|tem|faco|fazer|agenda|tarefas?|compromissos?|atividades?|do i have|on my|today|tomorrow)\b/.test(n) || /^(?:minha agenda|minhas tarefas|agenda de|meu dia|my day|my agenda|lista de hoje)/.test(n)) {
      const c = new Cutter(raw); const w = parseWhen(c, today);
      return { intent: "query", date: w.date || today };
    }
    // 2) foco / focus
    let m;
    if ((m = n.match(/^(?:(?:vamos|bora|quero)\s+)?(?:comecar|comeca|iniciar|inicia|ligar|liga|acender|acende|start|begin)?\s*(?:o |a |um |uma )?(?:foco|timer|vela|pomodoro|focus)\b(?:\s+(?:em|no|na|de|on|in)\s+)?(.*)$/))) {
      return { intent: "focus", label: tidy(raw.slice(raw.length - m[1].length)) };
    }
    // 3) concluir / complete
    if ((m = n.match(/^(?:(?:ja|eu|i)\s+)?(?:concluir|conclui|concluido|concluida|concluí|terminei|terminar|termina|fiz|feito|feita|finalizar|finalizei|completar|completei|complete|done|finished|finish|i did|mark(?:ed)? (?:as )?done|marc[ae]r? (?:como )?(?:feit[oa]|concluid[oa])|da baixa em|dar baixa em)\b\s*(?:a |o |de |em |no |na |the )?(.*)$/))) {
      const q = raw.slice(raw.length - m[1].length).trim();
      const c = new Cutter(q); const w = parseWhen(c, today); const date = w.date || today;
      return Object.assign({ intent: "complete", query: c.rest(), date }, V.findTask(c.rest(), date));
    }
    // 4) prova / exam
    if (/\b(prova|avaliacao|exame(?! de sangue)|teste|av1|av2|av3|ap1|ap2|simulado|exam|test|quiz)\b/.test(n) && !/\bexame de sangue\b/.test(n)) {
      const c = new Cutter(raw); const w = parseWhen(c, today);
      let place = ""; if ((m = c.find(/\b(?:na |no |in )?(?:sala|lab|laboratorio|bloco|room)\s+[\w-]+\b/))) { place = raw.slice(m.index, m.index + m[0].length).replace(/^(na|no|in)\s+/i, ""); c.cut(m); }
      if ((m = c.find(/\b(?:online|on-line|ead|presencial)\b/))) { place = place || raw.slice(m.index, m.index + m[0].length); c.cut(m); }
      const rest = norm(c.rest()); const pm = rest.match(/(?:prova|avaliacao|exame|teste|simulado|exam|test|quiz|av\d|ap\d)\s*(?:final\s*)?(?:de|da|do|of|on)?\s+(.+)$/);
      let subj = pm ? c.rest().slice(c.rest().length - pm[1].length) : c.rest().replace(new RegExp("^.*?\\b(prova|avaliação|avaliacao|exame|teste|simulado|exam|test|quiz)\\b", "i"), "");
      subj = tidy(subj.replace(LEAD, ""));
      const best = (G.state.subjects || []).map(s => [s, Math.max(score(subj, s.name), score(subj, s.short || ""))]).sort((a, b) => b[1] - a[1])[0];
      return { intent: "exam", subjectName: subj, subjectId: best && best[1] >= .5 ? best[0].id : "", date: w.date, time: w.time || "", place };
    }
    // 5) nova atividade / new activity (padrão / default)
    const c = new Cutter(raw);
    const w = parseWhen(c, today), remind = parseRemind(c), prio = parsePrio(c);
    // tira "me lembra de", "criar", "anotar"... (procura no texto sem acento e recorta o original)
    let title = c.rest(); const lm = norm(title).match(LEAD); if (lm && lm[0]) title = title.slice(lm[0].length); title = tidy(title);
    if (!title) return { intent: "none" };
    const date = w.date || today;
    if (remind != null && remind >= 0 && !w.time) w.time = "09:00"; // pediu lembrete sem hora → 9h
    return {
      intent: "create", title, date, time: w.time, repeat: w.repeat, days: w.days,
      remind: remind != null ? remind : (w.time ? 15 : -1), priority: prio || "mid", area: guessArea(norm(title))
    };
  };

  /* acha a tarefa do dia mais parecida / find the closest task of the day */
  V.findTask = function (q, date) {
    const cands = [];
    (G.actsOn ? G.actsOn(date) : []).forEach(a => cands.push({ kind: "act", id: a.id, title: a.title, done: G.actDone(a, date) }));
    ((G.state.plan || {})[date] || []).forEach(x => { const s = G.subj(x.subjectId); cands.push({ kind: "spell", id: x.id, title: x.title + (s ? " " + s.name : ""), label: x.title, done: !!x.done }); });
    const ranked = cands.map(x => [x, score(q, x.title)]).filter(x => x[1] > .3).sort((a, b) => (a[0].done - b[0].done) || b[1] - a[1]);
    return { match: ranked.length ? ranked[0][0] : null, options: ranked.slice(0, 4).map(x => x[0]) };
  };

  /* ====== executar / run ====== */
  V.run = function (r) {
    const t = G.t;
    if (r.intent === "create") {
      G.actsInit();
      const a = { id: G.uid(), title: r.title, area: r.area, priority: r.priority, date: r.date, time: r.time || "", repeat: r.repeat, days: r.days || [], remind: r.time ? r.remind : -1, petId: "", notes: "", subtasks: [], createdAt: Date.now() };
      G.state.activities.push(a); G.save(); return t("cmdSavedAct");
    }
    if (r.intent === "exam") {
      const sid = r.subjectId || G.findOrCreateSubject(r.subjectName || (G.lang === "en" ? "Exam" : "Prova")).id;
      G.state.exams.push({ id: G.uid(), subjectId: sid, date: r.date, time: r.time || "", place: r.place || "" }); G.save(); return t("cmdSavedExam");
    }
    if (r.intent === "complete" && r.match) {
      if (r.match.kind === "act") { G.UI.actToggleSilent(r.match.id, r.date, true); }
      else { const x = ((G.state.plan || {})[r.date] || []).find(y => y.id === r.match.id); if (x && !x.done) { x.done = true; G.addXP(20); G.save(); } }
      return t("cmdDone");
    }
    if (r.intent === "focus") { G.startFocus(r.label || "", null); return ""; }
    return "";
  };

  /* reconhecimento de voz do navegador, quando existe / browser speech recognition when available */
  V.speechOK = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !G.isNative();
  V.listen = function (onText, onEnd) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return null;
    const rec = new SR(); rec.lang = G.lang === "en" ? "en-US" : "pt-BR"; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onresult = e => { let s = ""; for (const r of e.results) s += r[0].transcript; onText(s, e.results[e.results.length - 1].isFinal); };
    rec.onend = () => onEnd && onEnd(); rec.onerror = () => onEnd && onEnd();
    try { rec.start(); } catch (e) { return null; }
    return rec;
  };
})();
