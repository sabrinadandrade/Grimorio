/* 📊 Resumo da semana / weekly summary
 * Tudo calculado no aparelho a partir do que o Grimório já guarda (tarefas concluídas, horário da conclusão,
 * velas de foco por dia). / Computed on-device from data the Grimoire already keeps. */
window.G = window.G || {};
(function () {
  const st = () => G.state;
  /* registro diário (velas de foco) / daily log */
  G.logDay = function (key, n) {
    const s = st(); s.log = s.log || {}; const d = G.todayIso();
    s.log[d] = s.log[d] || {}; s.log[d][key] = (s.log[d][key] || 0) + (n || 1);
    // guarda só ~1 ano / keep about a year
    const keys = Object.keys(s.log); if (keys.length > 400) keys.sort().slice(0, keys.length - 400).forEach(k => delete s.log[k]);
  };
  /* quantas coisas foram concluídas num dia / how many things were done on a day */
  function doneOn(iso) {
    const s = st(); let n = 0;
    Object.keys(s.actDone || {}).forEach(k => { const p = k.split("|"); if (p.length === 2 && p[1] === iso) n++; });
    ((s.plan || {})[iso] || []).forEach(x => { if (x.done) n++; });
    return n;
  }
  function bestStreak() {
    const days = [...G.doneDays()].sort(); let best = 0, run = 0, prev = null;
    days.forEach(d => { run = prev && G.addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; });
    return best;
  }
  G.weekStats = function () {
    const s = st(), today = G.todayIso();
    const days = [...Array(7)].map((_, i) => G.addDays(today, i - 6));
    const prevDays = [...Array(7)].map((_, i) => G.addDays(today, i - 13));
    const perDay = days.map(d => ({ d, n: doneOn(d), pomos: ((s.log || {})[d] || {}).pomos || 0 }));
    const total = perDay.reduce((a, x) => a + x.n, 0), prevTotal = prevDays.reduce((a, d) => a + doneOn(d), 0);
    const pomos = perDay.reduce((a, x) => a + x.pomos, 0);
    // por área (atividades) + estudos (feitiços) / by area
    const byArea = {}; const inWeek = new Set(days);
    Object.keys(s.actDone || {}).forEach(k => {
      const p = k.split("|"); if (p.length !== 2 || !inWeek.has(p[1])) return;
      const a = (s.activities || []).find(x => x.id === p[0]); const area = a ? a.area : "daily";
      byArea[area] = (byArea[area] || 0) + 1;
    });
    days.forEach(d => ((s.plan || {})[d] || []).forEach(x => { if (x.done) byArea.study = (byArea.study || 0) + 1; }));
    const areas = Object.entries(byArea).sort((a, b) => b[1] - a[1]);
    // melhor horário (últimos 30 dias) / best time of day (last 30 days)
    const since = Date.now() - 30 * 864e5, slots = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    const add = ts => { if (typeof ts !== "number" || ts < since) return; const h = new Date(ts).getHours(); slots[h < 5 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"]++; };
    Object.keys(s.actDone || {}).forEach(k => { if (k.split("|").length === 2) add(s.actDone[k]); });
    Object.values(s.plan || {}).forEach(list => list.forEach(x => x.done && add(x.doneAt)));
    const timed = Object.values(slots).reduce((a, b) => a + b, 0);
    const best = timed >= 3 ? Object.entries(slots).sort((a, b) => b[1] - a[1])[0] : null;
    return { days: perDay, total, prevTotal, pomos, areas, best, timed, streak: G.streak(), bestStreak: bestStreak() };
  };
})();
