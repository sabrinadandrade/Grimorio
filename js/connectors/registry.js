/* Registro de conectores / connector registry
 *
 * Um conector transforma texto copiado do portal da instituição em dados do grimório.
 * A connector turns text copied from a school portal into grimoire data.
 *
 * G.connectors.register({
 *   id: "minha-faculdade",
 *   name: "Minha Faculdade",
 *   emoji: "🏫",
 *   help: { pt: "Passo a passo…", en: "Step by step…" },
 *   parse(text) {           // obrigatório / required
 *     return {
 *       subjects: [{ name: "Cálculo I", topics: ["Limites", "Derivadas | regras básicas"] }],
 *       exams:    [{ subject: "Cálculo I", date: "2026-11-06", time: "09:00", place: "Sala 12" }],
 *       cards:    [{ subject: "Cálculo I", q: "Pergunta?", a: "Resposta" }],
 *       topicsOnly: ["Tema solto 1", "Tema solto 2"] // temas sem matéria → o app pergunta qual
 *     };
 *   }
 * });
 */
window.G = window.G || {};
G.connectors = {
  list: [],
  register(c) { this.list.push(c); },
  get(id) { return this.list.find(c => c.id === id) || this.list[0]; }
};

/* ---- utilidades de datas compartilhadas / shared date helpers ---- */
G.parseDateLoose = function (str, refIso) {
  const ref = new Date((refIso || G.todayIso()) + "T12:00");
  let m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: G.parseTimeLoose(str) };
  m = str.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (!m) return null;
  const d = +m[1], mo = +m[2];
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  let y = m[3] ? +m[3] : ref.getFullYear();
  if (y < 100) y += 2000;
  if (!m[3]) { const c = new Date(y, mo - 1, d, 12); if (c - ref < -120 * 864e5) y++; }
  return { date: `${y}-${G.pad2(mo)}-${G.pad2(d)}`, time: G.parseTimeLoose(str.slice(m.index + m[0].length)) };
};
G.parseTimeLoose = function (s) {
  const m = (s || "").match(/\b(\d{1,2})\s*[:h]\s*(\d{2})\b/);
  return m ? `${G.pad2(+m[1])}:${m[2]}` : "";
};
G.cleanLines = text => text.split(/\r?\n/).map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean);
