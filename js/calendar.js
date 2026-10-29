/* 📅 Exportar para o calendário do celular / export to the phone's calendar (.ics)
 *
 * Gera um arquivo de calendário com as atividades que têm horário e as provas, com ALARMES.
 * Importado no Calendário do iPhone, do Android (Google Agenda) ou do computador, o próprio calendário
 * avisa na hora — mesmo com o Grimório fechado — e sem servidor nenhum.
 *
 * Builds an .ics file with timed activities and exams, including ALARMS, so the phone's own calendar
 * notifies the person even with the Grimoire closed — no server needed. */
window.G = window.G || {};
(function () {
  const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  const esc = s => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const dt = (iso, time) => iso.replace(/-/g, "") + (time ? "T" + time.replace(":", "") + "00" : "");
  const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  // linhas de no máximo 75 bytes / fold long lines (RFC 5545)
  const fold = line => { const out = []; let cur = "", n = 0; for (const ch of line) { const b = new TextEncoder().encode(ch).length; if (n + b > 73) { out.push(cur); cur = " "; n = 1; } cur += ch; n += b; } out.push(cur); return out.join("\r\n"); };
  const alarm = (trigger, text) => ["BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:" + trigger, "DESCRIPTION:" + esc(text), "END:VALARM"];

  G.calendarEvents = function () {
    const st = G.state, today = G.todayIso(), ev = [];
    G.actsInit && G.actsInit();
    (st.activities || []).forEach(a => {
      if (!a.time) return;
      if (a.repeat === "none" && (a.date < today || G.actDone(a, a.date))) return;
      let start = a.date || today;
      if (a.repeat === "weekly") { // começa no primeiro dia que bate / start on the first matching weekday
        if (!(a.days || []).length) return;
        for (let i = 0; i < 7 && !a.days.includes(G.dow(start)); i++) start = G.addDays(start, 1);
      }
      const ar = (G.AREAS[a.area] || G.AREAS.daily);
      const subs = (a.subtasks || []).map(s => "• " + s.text).join("\n");
      const L = ["BEGIN:VEVENT", "UID:" + a.id + "@grimorio", "DTSTAMP:" + stamp(), "DTSTART:" + dt(start, a.time), "DURATION:PT30M",
        "SUMMARY:" + esc(ar.emoji + " " + a.title), "CATEGORIES:" + esc(G.areaName(a.area))];
      if (a.notes || subs) L.push("DESCRIPTION:" + esc([a.notes, subs].filter(Boolean).join("\n\n")));
      if (a.repeat === "daily") L.push("RRULE:FREQ=DAILY");
      if (a.repeat === "weekly") L.push("RRULE:FREQ=WEEKLY;BYDAY=" + a.days.map(d => BYDAY[d]).join(","));
      if (a.remind >= 0) L.push(...alarm(a.remind === 0 ? "PT0M" : "-PT" + a.remind + "M", a.title));
      L.push("END:VEVENT"); ev.push(L);
    });
    (st.exams || []).forEach(e => {
      if (!e.date || e.date < today) return;
      const s = G.subj(e.subjectId); if (!s) return;
      const title = (G.lang === "en" ? "📝 Exam: " : "📝 Prova: ") + s.name;
      const L = ["BEGIN:VEVENT", "UID:exam-" + e.id + "@grimorio", "DTSTAMP:" + stamp()];
      if (e.time) L.push("DTSTART:" + dt(e.date, e.time), "DURATION:PT2H"); else L.push("DTSTART;VALUE=DATE:" + dt(e.date), "DTEND;VALUE=DATE:" + dt(G.addDays(e.date, 1)));
      L.push("SUMMARY:" + esc(title));
      if (e.place) L.push("LOCATION:" + esc(e.place));
      L.push(...alarm("-P1D", title), ...(e.time ? alarm("-PT1H", title) : []), "END:VEVENT"); ev.push(L);
    });
    return ev;
  };
  G.buildICS = function () {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Grimorio//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:" + esc(G.pageTitle ? G.pageTitle() : "Grimório")];
    G.calendarEvents().forEach(L => lines.push(...L));
    lines.push("END:VCALENDAR");
    return lines.map(fold).join("\r\n") + "\r\n";
  };
  G.exportCalendar = function () {
    const n = G.calendarEvents().length;
    if (!n) { G.toast(G.t("calNone")); return 0; }
    const ics = G.buildICS(), name = "grimorio-calendario-" + G.todayIso() + ".ics";
    G.download(name, ics, "text/calendar");
    return n;
  };
})();
