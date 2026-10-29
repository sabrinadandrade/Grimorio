/* Gerador de plano de estudos / study plan generator
 * Distribui os temas de cada matéria nos dias antes da prova, deixa a véspera para revisão
 * e preserva o que já foi marcado como feito.
 * Spreads each subject's topics across the days before its exam, keeps the day before for review,
 * and preserves what was already checked. */
window.G = window.G || {};
G.buildPlan = function () {
  const st = G.state, t = G.t;
  const start = st.settings.startDate && st.settings.startDate > G.todayIso() ? st.settings.startDate : G.todayIso();
  const per0 = Math.max(1, +st.settings.blocksPerDay || 3);
  const old = st.plan || {};
  const plan = {};
  const push = (day, task) => { (plan[day] = plan[day] || []).push(Object.assign({ id: G.uid(), done: false }, task)); };
  const short = s => s.short || s.name;

  const exams = st.exams.filter(e => e.date >= start && G.subj(e.subjectId)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const dates = [...new Set(exams.map(e => e.date))];
  let prevEnd = G.addDays(start, -1);

  dates.forEach(D => {
    const group = exams.filter(e => e.date === D);
    const subs = group.map(e => G.subj(e.subjectId));
    const days = [];
    for (let d = G.addDays(prevEnd, 1); d < D; d = G.addDays(d, 1)) days.push(d);
    const hasReview = days.length >= 2;
    const studyDays = hasReview ? days.slice(0, -1) : days;

    const items = [];
    subs.forEach(s => {
      if (s.topics.length) s.topics.forEach(tp => items.push({ kind: "study", subjectId: s.id, title: tp.title, detail: tp.detail }));
      else items.push({ kind: "study", subjectId: s.id, title: t("freeReview", { s: short(s) }), detail: "" });
    });
    if (studyDays.length) {
      const per = Math.max(per0, Math.ceil(items.length / studyDays.length));
      let i = 0;
      studyDays.forEach((d, di) => {
        for (let k = 0; k < per && i < items.length; k++) push(d, items[i++]);
        const have = (plan[d] || []).length;
        // dias sobrando viram revisão ativa / leftover days become active review
        if (i >= items.length && have < Math.min(per0, 2)) {
          // no máximo 2 revisões leves, variando o tipo / at most 2 light reviews, varied
          const kinds = ["freeReview", "reviewCards", "practice"];
          for (let k = have; k < Math.min(per0, 2); k++) {
            const s = subs[(di + k) % subs.length];
            push(d, { kind: "review", subjectId: s.id, title: t(kinds[(di + k) % 3], { s: short(s) }), detail: s.topics.length ? "" : t("addTopicsHint") });
          }
        }
      });
    } else if (days.length === 0) {
      // prova amanhã/hoje sem dias: só revisão no dia / no days left
    }
    if (hasReview) {
      const R = days[days.length - 1], names = subs.map(short).join(", ");
      push(R, { kind: "review", subjectId: "rev", title: t("reviewCards", { s: names }), detail: "" });
      push(R, { kind: "review", subjectId: "rev", title: t("reviewNotes", { s: names }), detail: "" });
      push(R, { kind: "review", subjectId: "rev", title: t("sleepEarly"), detail: "" });
    } else if (days.length === 1 && items.length) {
      const R = days[0];
      push(R, { kind: "review", subjectId: "rev", title: t("sleepEarly"), detail: "" });
    }
    group.forEach(e => {
      const s = G.subj(e.subjectId);
      push(D, { kind: "exam", subjectId: s.id, title: (e.time ? e.time + " – " : "") + s.name, detail: e.place || "" });
    });
    prevEnd = D;
  });

  // preserva feitos e feitiços extras / keep done + extra spells
  const key = x => x.kind + "|" + x.subjectId + "|" + G.norm(x.title);
  const doneKeys = new Set();
  Object.values(old).forEach(arr => arr.forEach(x => { if (x.done) doneKeys.add(key(x)); }));
  Object.values(plan).forEach(arr => arr.forEach(x => { if (doneKeys.has(key(x))) x.done = true; }));
  Object.keys(old).forEach(d => old[d].forEach(x => { if (x.kind === "extra") (plan[d] = plan[d] || []).push(x); }));
  // dias passados ficam como estavam / past days stay as they were
  Object.keys(old).forEach(d => { if (d < start) plan[d] = old[d]; });
  st.plan = plan;
  G.save();
  return plan;
};

G.dayTitle = function (day) {
  const tasks = G.state.plan[day] || [];
  if (tasks.some(x => x.kind === "exam")) return G.t("examDay");
  const subs = [...new Set(tasks.filter(x => x.kind === "study").map(x => x.subjectId))].map(G.subj).filter(Boolean);
  if (!subs.length && tasks.some(x => x.subjectId === "rev")) return G.t("reviewDay");
  if (!subs.length) return tasks.length ? "✨" : "—";
  return subs.map(s => (s.emoji || "📚") + " " + (s.short || s.name)).join(" · ");
};
