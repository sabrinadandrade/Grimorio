/* Atividades da vida toda + lembretes / life activities + reminders
 *
 * Uma atividade: { id, title, area, priority: "high"|"mid"|"low", date: "YYYY-MM-DD", time: "HH:MM",
 *   repeat: "none"|"daily"|"weekly", days: [0..6] (0 = domingo), remind: minutos antes (-1 = sem lembrete),
 *   petId: id do pet ou "" (aleatório), notes }
 * Feitos ficam em state.actDone["id|YYYY-MM-DD"] = true. */
window.G = window.G || {};
(function () {
  G.AREAS = {
    study:    { emoji: "📚", color: "#c49bff", pt: "Estudos", en: "Studies" },
    daily:    { emoji: "☀️", color: "#ffc46b", pt: "Atividades diárias", en: "Daily tasks" },
    home:     { emoji: "🏠", color: "#ff9a4d", pt: "Cuidados com a casa", en: "Home care" },
    pets:     { emoji: "🐾", color: "#9be37a", pt: "Cuidados com os pets", en: "Pet care" },
    kids:     { emoji: "🍼", color: "#ff8fb3", pt: "Cuidados maternais / paternais", en: "Parenting" },
    work:     { emoji: "💼", color: "#8fc3ff", pt: "Trabalho", en: "Work" },
    personal: { emoji: "📅", color: "#7fe0b8", pt: "Compromissos pessoais", en: "Personal appointments" },
    health:   { emoji: "💚", color: "#a3e4ff", pt: "Saúde e bem-estar", en: "Health & wellbeing" }
  };
  G.AREA_ORDER = ["study", "daily", "home", "pets", "kids", "work", "personal", "health"];
  G.PRIORITIES = {
    high: { emoji: "🔥", pt: "Alta", en: "High", rank: 0, color: "#ff6b6b" },
    mid:  { emoji: "⭐", pt: "Média", en: "Medium", rank: 1, color: "#ffc46b" },
    low:  { emoji: "🌙", pt: "Baixa", en: "Low", rank: 2, color: "#b98cff" }
  };
  G.REMIND_OPTS = [-1, 0, 5, 15, 30, 60, 120, 1440];
  G.areaName = k => (G.AREAS[k] || G.AREAS.daily)[G.lang === "en" ? "en" : "pt"];
  G.prioName = k => (G.PRIORITIES[k] || G.PRIORITIES.mid)[G.lang === "en" ? "en" : "pt"];

  const st = () => G.state;
  G.actsInit = () => { st().activities = st().activities || []; st().actDone = st().actDone || {}; st().remFired = st().remFired || {}; };
  G.dow = iso => new Date(iso + "T12:00").getDay();

  G.occursOn = function (a, iso) {
    const start = a.date || (a.createdAt ? G.iso(new Date(a.createdAt)) : iso);
    if (a.repeat === "daily") return iso >= start;
    if (a.repeat === "weekly") return iso >= start && (a.days || []).includes(G.dow(iso));
    return a.date === iso;
  };
  G.actsOn = function (iso) {
    G.actsInit();
    return st().activities.filter(a => G.occursOn(a, iso)).sort((x, y) =>
      (G.PRIORITIES[x.priority] || G.PRIORITIES.mid).rank - (G.PRIORITIES[y.priority] || G.PRIORITIES.mid).rank || (x.time || "99").localeCompare(y.time || "99"));
  };
  G.actDone = (a, iso) => !!st().actDone[a.id + "|" + iso];
  G.setActDone = (a, iso, v) => { const k = a.id + "|" + iso; if (v) st().actDone[k] = Date.now(); else delete st().actDone[k]; };
  G.repeatLabel = a => {
    const D = G.lang === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    if (a.repeat === "daily") return G.t("everyDay");
    if (a.repeat === "weekly") return (a.days || []).slice().sort().map(d => D[d]).join(", ");
    return "";
  };

  /* subtarefas (checklist por dia) / subtasks (per-day checklist) */
  G.subDone = (a, iso, sid) => !!st().actDone[a.id + "|" + iso + "|" + sid];
  G.setSubDone = (a, iso, sid, v) => { const k = a.id + "|" + iso + "|" + sid; if (v) st().actDone[k] = true; else delete st().actDone[k]; };
  G.subProgress = (a, iso) => { const s = a.subtasks || []; return [s.filter(x => G.subDone(a, iso, x.id)).length, s.length]; };

  /* sequência de dias e conquistas / streak and achievements */
  G.doneDays = function () {
    const days = new Set();
    Object.keys(st().plan || {}).forEach(d => { if ((st().plan[d] || []).some(x => x.done)) days.add(d); });
    Object.keys(st().actDone || {}).forEach(k => { const p = k.split("|"); if (p.length === 2) days.add(p[1]); });
    return days;
  };
  G.streak = function () {
    const days = G.doneDays(); let d = G.todayIso();
    if (!days.has(d)) d = G.addDays(d, -1); // hoje ainda pode ser feito / today still counts later
    let n = 0; while (days.has(d)) { n++; d = G.addDays(d, -1); }
    return n;
  };
  G.ACH = [
    ["first", "✨", s => G.doneDays().size >= 1],
    ["full", "🌕", s => Object.keys(s.plan || {}).some(d => s.plan[d].length && s.plan[d].every(x => x.done)) || [...G.doneDays()].some(d => { const a = G.actsOn(d); return a.length >= 2 && a.every(x => G.actDone(x, d)); })],
    ["s3", "🔥", () => G.streak() >= 3], ["s7", "🌟", () => G.streak() >= 7], ["s30", "👑", () => G.streak() >= 30],
    ["candles10", "🕯️", s => (s.pomos || 0) >= 10], ["cards25", "🔮", s => ((s.stats || {}).cardsKnown || 0) >= 25],
    ["acts5", "🗓️", s => (s.activities || []).length >= 5],
    ["subs", "✅", s => (s.activities || []).some(a => (a.subtasks || []).length && [...G.doneDays()].some(d => { const [x, y] = G.subProgress(a, d); return y && x === y; }))],
    ["lvl5", "⚗️", s => Math.floor((s.xp || 0) / 100) + 1 >= 5], ["petlover", "🐾", s => (s.pets || []).length >= 3],
    ["backup", "💾", s => !!s.lastBackupAt]
  ];
  G.checkAchievements = function () {
    const s = st(); s.achieved = s.achieved || {}; const fresh = [];
    G.ACH.forEach(([k, , test]) => { try { if (!s.achieved[k] && test(s)) { s.achieved[k] = Date.now(); fresh.push(k); } } catch (e) { } });
    if (fresh.length) { G.save(); if (G.UI && G.UI.achievementPopup) fresh.forEach((k, i) => setTimeout(() => G.UI.achievementPopup(k), 900 + i * 2600)); }
    return fresh;
  };

  /* próximas ocorrências com lembrete / upcoming reminder occurrences */
  G.upcomingReminders = function (fromMs, toMs) {
    G.actsInit();
    const out = [];
    const d0 = new Date(fromMs); d0.setHours(0, 0, 0, 0);
    for (let t = d0.getTime(); t <= toMs + 864e5; t += 864e5) {
      const iso = G.iso(new Date(t));
      st().activities.forEach(a => {
        if (a.remind == null || a.remind < 0 || !a.time || !G.occursOn(a, iso) || G.actDone(a, iso)) return;
        const at = new Date(iso + "T" + a.time + ":00").getTime();
        const fire = at - a.remind * 60000;
        if (fire >= fromMs && fire <= toMs) out.push({ a, iso, at, fire, key: a.id + "|" + iso + "|" + a.time });
      });
    }
    return out.sort((x, y) => x.fire - y.fire);
  };

  /* ===== motor de lembretes / reminder engine ===== */
  const R = G.reminders = { snoozed: {} };
  R.check = function () {
    if (!G.state) return;
    G.actsInit();
    const now = Date.now();
    const due = G.upcomingReminders(now - 2 * 3600e3, now).filter(o => !st().remFired[o.key]);
    Object.keys(R.snoozed).forEach(k => { if (R.snoozed[k].until <= now) { due.push(R.snoozed[k].o); delete R.snoozed[k]; } });
    due.forEach(o => { st().remFired[o.key] = now; R.fire(o); });
    if (due.length) { // limpa marcas velhas / trim old fired marks
      Object.keys(st().remFired).forEach(k => { if (now - st().remFired[k] > 3 * 864e5) delete st().remFired[k]; });
      G.save();
    }
  };
  R.text = o => {
    const mins = Math.round((o.at - Date.now()) / 60000);
    const when = mins > 90 ? G.t("remAt", { h: o.a.time }) : mins > 0 ? G.t("remIn", { m: mins }) : G.t("remNow");
    return { title: (G.AREAS[o.a.area] || G.AREAS.daily).emoji + " " + o.a.title, when };
  };
  R.fire = function (o) {
    const { title, when } = R.text(o);
    const name = (G.state.owner.name || "").trim();
    const body = (name ? G.t("remHey", { n: name }) + " " : "") + when;
    if (G.UI && G.UI.reminderPopup) G.UI.reminderPopup(o, title, body);
    // notificação do sistema (navegador) quando a aba não está visível / system notification when hidden
    try {
      if (!G.isNative() && "Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
        const opts = { body: body, icon: "assets/icon-192.png", badge: "assets/icon-192.png", tag: o.key };
        if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, opts));
        else new Notification(title, opts);
      }
    } catch (e) { }
  };
  R.snooze = (o, min) => { R.snoozed[o.key + "|s" + Date.now()] = { until: Date.now() + min * 60000, o }; };
  R.start = function () { R.check(); setInterval(R.check, 20000); document.addEventListener("visibilitychange", () => { if (!document.hidden) R.check(); }); R.scheduleNative(); };

  R.permission = () => G.isNative() ? "native" : ("Notification" in window ? Notification.permission : "unsupported");
  R.ask = async function () {
    if (G.isNative()) { try { await window.Capacitor.Plugins.LocalNotifications.requestPermissions(); await R.scheduleNative(); return "granted"; } catch (e) { return "denied"; } }
    if (!("Notification" in window)) return "unsupported";
    return await Notification.requestPermission();
  };

  /* Android (APK): agenda notificações nativas para os próximos 14 dias / native scheduling */
  let schedT = null;
  R.scheduleNative = function () {
    if (!G.isNative()) return;
    clearTimeout(schedT);
    schedT = setTimeout(async () => {
      try {
        const LN = window.Capacitor.Plugins.LocalNotifications; if (!LN) return;
        const pend = await LN.getPending();
        if (pend.notifications && pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
        const name = (G.state.owner.name || "").trim();
        const list = G.upcomingReminders(Date.now() + 30000, Date.now() + 14 * 864e5).slice(0, 60).map(o => {
          const { title } = R.text(o);
          const when = o.a.remind > 0 ? G.t("remIn", { m: o.a.remind }) : G.t("remNow");
          let id = 0; for (const ch of o.key) id = (id * 31 + ch.charCodeAt(0)) | 0;
          return { id: Math.abs(id) % 2147483000, title, body: (name ? G.t("remHey", { n: name }) + " " : "") + when, schedule: { at: new Date(o.fire), allowWhileIdle: true }, smallIcon: "ic_stat_icon_config_sample" };
        });
        if (list.length) await LN.schedule({ notifications: list.map(n => { delete n.smallIcon; return n; }) });
      } catch (e) { console.log("[grimorio] native notif", e); }
    }, 800);
  };
})();
