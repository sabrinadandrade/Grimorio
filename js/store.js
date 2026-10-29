/* Armazenamento local / local storage
 * Todos os dados ficam no navegador (localStorage). Nada vai para servidor.
 * All data stays in the browser (localStorage). Nothing goes to a server. */
window.G = window.G || {};
(function () {
  const KEY = G.STORE_KEY = "grimorio.v1";
  G.uid = () => Math.random().toString(36).slice(2, 9);
  G.pad2 = n => String(n).padStart(2, "0");
  G.iso = d => d.getFullYear() + "-" + G.pad2(d.getMonth() + 1) + "-" + G.pad2(d.getDate());
  G.todayIso = () => G.iso(new Date());
  G.addDays = (s, n) => { const d = new Date(s + "T12:00"); d.setDate(d.getDate() + n); return G.iso(d); };
  G.norm = s => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

  G.defaultState = () => ({
    v: 1,
    lang: (navigator.language || "pt").toLowerCase().startsWith("pt") ? "pt" : "en",
    owner: { name: "", art: "da" },
    theme: { preset: "halloween", custom: {} },
    tamaShape: "egg",
    institution: "generic",
    pets: [
      { id: G.uid(), name: "Nyx", gender: "f", species: "cat", base: "#2b2533", accent: "#2b2533", pattern: "none", eye: "#e6e85a", accessory: "witch" }
    ],
    subjects: [],
    exams: [],
    cards: [],
    plan: {},
    settings: { blocksPerDay: 3, startDate: "", focus: 25, pause: 5 },
    xp: 0, pomos: 0, onboarded: false,
    createdAt: Date.now(), updatedAt: 0, lastBackupAt: 0
  });

  G.load = function () {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { }
    G.state = Object.assign(G.defaultState(), s || {});
    G.state.settings = Object.assign(G.defaultState().settings, G.state.settings || {});
    G.lang = G.state.lang;
    return G.state;
  };
  /* salva em 2 lugares (localStorage + IndexedDB), no arquivo de backup e na nuvem, se ativados
   * saves to localStorage + IndexedDB, plus the backup file and the cloud when enabled */
  G.save = function (opts) {
    if (!(opts && opts.keepTime)) G.state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(G.state)); } catch (e) { }
    if (G.safety) { G.safety.mirror(); G.safety.scheduleFile(); }
    if (G.cloud && !(opts && opts.noCloud)) G.cloud.schedulePush();
  };
  G.reset = async function () {
    if (G.safety) await G.safety.snapshot("reset");
    try { localStorage.removeItem(KEY); } catch (e) { }
    G.state = G.defaultState(); G.lang = G.state.lang;
    if (G.safety) await G.safety.mirror();
  };

  /* helpers */
  G.subj = id => G.state.subjects.find(s => s.id === id);
  G.pet = id => G.state.pets.find(p => p.id === id) || G.state.pets[0];
  G.petOfSubject = sid => { const s = G.subj(sid); return G.pet(s && s.petId); };
  G.nextColor = () => G.SUBJECT_COLORS[G.state.subjects.length % G.SUBJECT_COLORS.length];

  G.findOrCreateSubject = function (name, extra) {
    const n = G.norm(name);
    let s = G.state.subjects.find(x => G.norm(x.name) === n || (x.short && G.norm(x.short) === n));
    if (!s) {
      s = { id: G.uid(), name: name.trim(), short: (extra && extra.short) || "", emoji: (extra && extra.emoji) || "📚", color: (extra && extra.color) || G.nextColor(), petId: (G.state.pets[G.state.subjects.length % Math.max(1, G.state.pets.length)] || {}).id, topics: [], notes: "" };
      G.state.subjects.push(s);
    }
    if (extra) Object.keys(extra).forEach(k => { if (extra[k] && !s[k]) s[k] = extra[k]; });
    return s;
  };
  G.addTopics = function (s, titles) {
    let n = 0;
    titles.forEach(t => {
      const [title, detail] = (typeof t === "string" ? t.split("|") : [t.title, t.detail]).map(x => (x || "").trim());
      if (title && !s.topics.some(x => G.norm(x.title) === G.norm(title))) { s.topics.push({ id: G.uid(), title, detail: detail || "" }); n++; }
    });
    return n;
  };
  G.addExam = function (subjectId, date, time, place) {
    if (G.state.exams.some(e => e.subjectId === subjectId && e.date === date)) return false;
    G.state.exams.push({ id: G.uid(), subjectId, date, time: time || "", place: place || "" });
    return true;
  };
  G.addCard = function (subjectId, q, a) {
    if (!q || !a) return false;
    if (G.state.cards.some(c => G.norm(c.q) === G.norm(q))) return false;
    G.state.cards.push({ id: G.uid(), subjectId, q: q.trim(), a: a.trim(), miss: 0 });
    return true;
  };
})();
