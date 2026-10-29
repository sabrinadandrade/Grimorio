/* Grimório — interface / UI */
window.G = window.G || {};
(function () {
  const $ = s => document.querySelector(s);
  const t = (k, v) => G.t(k, v);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const win = (title, body, id) => `<div class="win"${id ? ` id="${id}"` : ""}><div class="bar">${title}<span class="dots"><i></i><i></i><i></i></span></div><div class="wbody">${body}</div></div>`;
  const DOW = { pt: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"], en: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] };
  const fmt = s => { const d = new Date(s + "T12:00"); return DOW[G.lang][d.getDay()] + " " + (G.lang === "en" ? G.pad2(d.getMonth() + 1) + "/" + G.pad2(d.getDate()) : G.pad2(d.getDate()) + "/" + G.pad2(d.getMonth() + 1)); };
  const MOON = ["🌑", "🌒", "🌓", "🌔", "🌕"];
  const moonOf = f => MOON[Math.max(0, Math.min(4, Math.round(f * 4)))];
  let tab = "today", viewDay = null, tarotFilter = null, curCard = null, lastParsed = null, saveTimer = null;
  const UI = G.UI = {};

  G.ownerTitle = () => {
    const n = G.state.owner.name.trim(); if (!n) return t("grimoire");
    return G.lang === "en" ? `${t("grimoire")} of ${n}` : `${t("grimoire")} ${G.state.owner.art ? G.state.owner.art + " " : ""}${n}`;
  };
  // pronome → palavras do app / pronoun-aware words
  G.pw = (f, m, n) => { const p = G.state.owner.pronoun; return p === "ela" ? f : p === "ele" ? m : p === "elu" ? n : f + "(" + m.slice(-1) + ")"; };
  const PRON = [["ela", "pronElaa", "da"], ["ele", "pronEle", "do"], ["elu", "pronElu", "de"]];
  const pronSelect = (id, onch) => `<label class="f">${t("pronoun")}<select ${id ? `id="${id}"` : ""} ${onch ? `onchange="${onch}"` : ""}><option value="">—</option>${PRON.map(([v, k]) => `<option value="${v}" ${G.state.owner.pronoun === v ? "selected" : ""}>${t(k)}</option>`).join("")}</select></label>`;
  UI.setPronoun = v => { G.state.owner.pronoun = v; const r = PRON.find(x => x[0] === v); if (r) G.state.owner.art = r[2]; G.save(); renderHeader(); marquee(); if (tab === "look") pLook(); };
  G.pageTitle = () => "☾ " + G.ownerTitle() + " ☽";
  G.addXP = n => { G.state.xp += n; G.save(); renderXP(); };
  const later = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { G.save(); }, 250); };
  const teacher = p => p ? (p.gender === "f" ? t("teacher_f") : p.gender === "m" ? t("teacher_m") : t("teacher_n")) + ": " + esc(p.name) : "";
  const allTasks = () => Object.values(G.state.plan).flat();

  /* ================= TOPO / HEADER ================= */
  function renderHeader() {
    document.title = G.pageTitle();
    $("#title").textContent = "☾ " + G.ownerTitle() + " ☽";
    const h = new Date().getHours();
    const all = allTasks(), done = all.filter(x => x.done).length;
    $("#hello").textContent = (h < 12 ? t("hello_m") : h < 18 ? t("hello_a") : t("hello_n")) + "! " + (all.length ? t("progressLine", { done, total: all.length }) : "");
    $("#gang").innerHTML = G.state.pets.map((p, i) => `<button class="gcat bob" style="animation-delay:${i * .3}s" data-pid="${p.id}">${G.petSVG(p, 70)}<span class="nm">${esc(p.name)}</span></button>`).join("") +
      `<span class="small" style="color:var(--onBg);margin-left:6px">${t("petTip")}</span>`;
    document.querySelectorAll(".gcat").forEach(b => b.onclick = () => {
      const p = G.pet(b.dataset.pid); b.firstElementChild.outerHTML = G.petSVG(p, 70, "happy"); G.bubble(b, G.phrase()); G.burst(b, 24);
      setTimeout(() => { if (b.isConnected) b.firstElementChild.outerHTML = G.petSVG(p, 70); }, 1500);
    });
    renderXP(); renderCountdowns();
    if (G.checkAchievements && G.state.onboarded) G.checkAchievements();
  }
  function renderXP() {
    const lv = Math.floor(G.state.xp / 100) + 1, rest = G.state.xp % 100, L = t("levels");
    const all = allTasks(), f = all.length ? all.filter(x => x.done).length / all.length : 0;
    $("#xpbox").innerHTML = `<div><b>${t("level")} ${lv} · ${L[Math.min(lv - 1, L.length - 1)]}</b> · ${G.state.xp} ${t("xp")} · 🕯️ ${G.state.pomos} ${t("candles")}</div>
      <div class="xpbar"><div class="xpfill" style="width:${rest}%"></div></div><div class="small" style="color:var(--onBg)">${t("toNext", { n: 100 - rest })}</div>
      <div style="margin-top:4px">${t("moonOfTerm")}: ${moonOf(f)} ${Math.round(f * 100)}% ${t("ofSpells")}</div>
      <div style="margin-top:4px">🔥 <b>${(() => { const n = G.streak ? G.streak() : 0; return n === 0 ? t("streak0") : n === 1 ? t("streak1") : t("streak", { n }); })()}</b> · <a href="#" style="color:var(--primary)" onclick="G.UI.show('trophies');return false">🏆 ${Object.keys(G.state.achieved || {}).length}/${(G.ACH || []).length}</a></div>
      <div style="margin-top:4px"><button class="cute ghost" style="padding:2px 10px;font-size:.78rem" onclick="G.UI.show('data')">${G.safety && G.safety.fileStatus === "on" ? t("badgeFile") : t("badgeLocal")}</button></div>`;
  }
  function renderCountdowns() {
    const today = G.todayIso();
    const dates = [...new Set(G.state.exams.filter(e => e.date >= today).map(e => e.date))].sort().slice(0, 3);
    const grads = ["linear-gradient(135deg,var(--primary),var(--accent2))", "linear-gradient(135deg,var(--accent2),var(--accent))", "linear-gradient(135deg,var(--accent),var(--primary))"];
    $("#countdowns").innerHTML = dates.map((d, i) => {
      const diff = Math.round((new Date(d + "T12:00") - new Date(today + "T12:00")) / 864e5);
      const items = G.state.exams.filter(e => e.date === d).sort((a, b) => a.time.localeCompare(b.time));
      const txt = diff > 1 ? t("daysToExam") : diff === 1 ? t("tomorrow") : t("todayExam");
      return `<div class="cd" style="background:${grads[i]}"><span class="deco">${["🎃", "🦇", "🔮"][i]}</span><small>📝 ${t("examsAt", { date: fmt(d) })}</small><b class="n">${diff > 1 ? diff : diff === 1 ? "1" : "✦"}</b><b>${txt}</b>
        <ul>${items.map(e => { const s = G.subj(e.subjectId); return s ? `<li>${esc(e.time)} — ${esc(s.emoji || "📚")} ${esc(s.name)}</li>` : ""; }).join("")}</ul></div>`;
    }).join("");
  }

  /* ================= ABAS / TABS ================= */
  const TABS = ["today", "acts", "week", "cal", "tarot", "notes", "subjects", "pets", "trophies", "look", "data", "tips"];
  function renderTabs() {
    const pets = G.state.pets;
    const owner = (G.state.owner && G.state.owner.name) || "";
    $("#tabs").innerHTML = `<div class="dhead"><div class="dpets">${pets.slice(0, 3).map(p => G.petSVG(p, 46, "happy")).join("")}</div><b>${esc(document.getElementById("title").textContent || "Grimório")}</b>${owner ? `<span>✦ ${esc(owner)} ✦</span>` : ""}<button class="dclose" aria-label="fechar" onclick="G.UI.menu(false)">✕</button></div>` + TABS.map((k, i) => {
      const p = pets[i % Math.max(1, pets.length)];
      return `<button class="tab ${k === tab ? "on" : ""}" data-tab="${k}">${p ? G.petSVG(p, 32, k === tab ? "happy" : "ok") : ""}${t("tabs." + k)}</button>`;
    }).join("");
    document.querySelectorAll(".tab").forEach((b, i) => { b.style.setProperty("--i", i); b.onclick = () => { UI.menu(false); UI.show(b.dataset.tab); }; });
    const p0 = pets[TABS.indexOf(tab) % Math.max(1, pets.length)];
    $("#menuBtn").innerHTML = `<span class="mb-ic" aria-hidden="true"><i></i><i></i><i></i></span><span class="mb-t">${t("tabs." + tab)}</span>${p0 ? G.petSVG(p0, 34, "happy") : ""}`;
    $("#menuBtn").setAttribute("aria-label", "menu");
    $("#menuBtn").onclick = () => UI.menu(!$("#tabs").classList.contains("open"));
  }
  UI.menu = open => {
    $("#tabs").classList.toggle("open", open); $("#menuBtn").classList.toggle("open", open); $("#scrim").classList.toggle("on", open);
    document.body.classList.toggle("drawer-open", open); $("#menuBtn").setAttribute("aria-expanded", open ? "true" : "false");
    if (open) setTimeout(() => { const on = $("#tabs .tab.on"); on && on.focus({ preventScroll: true }); }, 50);
  };
  UI.show = k => { tab = k; renderTabs(); renderPanel(); const top = matchMedia("(max-width:900px)").matches ? $("#panel").offsetTop - 74 : $("#tabs").offsetTop; window.scrollTo({ top: Math.max(0, top - 10), behavior: G.state.a11y && G.state.a11y.lessMotion ? "auto" : "smooth" }); };
  function renderPanel() {
    const P = { today: pToday, acts: pActs, week: pWeek, trophies: pTrophies, cal: pCal, tarot: pTarot, notes: pNotes, subjects: pSubjects, pets: pPets, look: pLook, data: pData, tips: pTips };
    $("#panel").innerHTML = ""; $("#panel").className = "panel on"; P[tab]();
  }
  UI.refresh = () => { if (G.state.onboarded) document.querySelectorAll(".modal").forEach(m => m.remove()); renderHeader(); renderTabs(); renderPanel(); G.tamaRedraw && G.tamaRedraw(); };

  /* ================= HOJE / TODAY ================= */
  function pickDefaultDay() {
    const keys = Object.keys(G.state.plan).sort(), td = G.todayIso();
    if (!viewDay) viewDay = G.state.plan[td] ? td : (keys.find(k => k >= td) || td);
  }
  function pToday() {
    pickDefaultDay();
    const P = G.state.plan, keys = Object.keys(P).sort(), td = G.todayIso();
    G.actsInit();
    if (!G.state.subjects.length && !keys.length && !G.state.activities.length) {
      $("#panel").innerHTML = win("✦ " + (G.lang === "en" ? "today.exe" : "hoje.exe"), `<p>${t("emptyPlan")}</p><div class="nav">
        <a class="cute" style="text-decoration:none;color:var(--ink)" href="https://github.com/sabrinadandrade/Grimorio/blob/main/docs/TUTORIAL.md" target="_blank" rel="noopener">${t("tutorialBtn")}</a>
        <button class="cute" onclick="G.UI.newAct()">${t("newAct")}</button>
        <button class="cute" onclick="G.UI.show('subjects')">📚 ${t("goSubjects")}</button><button class="cute alt" onclick="G.UI.show('data')">🎓 ${t("goImport")}</button></div>`);
      return;
    }
    const tasks = P[viewDay] || [], n = tasks.filter(x => x.done).length;
    const acts = G.actsOn(viewDay), an = acts.filter(a => G.actDone(a, viewDay)).length;
    const total = tasks.length + acts.length, doneAll = n + an;
    const remind = G.safety && G.safety.needsReminder() ? `<div class="found" style="background:var(--accent);display:flex;gap:10px;align-items:center;flex-wrap:wrap">${t("reminder")}<button class="cute ghost" onclick="G.UI.show('data')">${t("reminderBtn")}</button></div>` : "";
    const isExam = tasks.some(x => x.kind === "exam");
    const title = tasks.length ? G.dayTitle(viewDay) : "";
    const body = remind + `<div class="nav"><button class="cute" onclick="G.UI.go(-1)">${t("before")}</button>
      <button class="cute" onclick="G.UI.goto('${td}')">${t("today")}</button><button class="cute" onclick="G.UI.go(1)">${t("after")}</button></div>
      <div class="daytitle"><span class="pill">${viewDay === td ? t("todayTag") : fmt(viewDay).toUpperCase()}</span><h2 style="margin:0">${esc(title)}</h2><span style="font-size:1.6rem">${isExam ? "📝" : moonOf(total ? doneAll / total : 0)}</span></div>
      <h3>${t("actsToday")}</h3>
      ${acts.length ? acts.map(a => actHTML(a, viewDay)).join("") : `<p class="small">${t("noActsDay")}</p>`}
      <div class="nav"><button class="cute" onclick="G.UI.newAct('${viewDay}')">${t("newAct")}</button></div>
      ${(tasks.length || G.state.subjects.length) ? `<h3>${t("studyToday")}</h3>
      <p class="small">${isExam ? t("examHelp") : tasks.length ? t("spellHelp") : t("noPlan")}</p>
      ${tasks.map(x => taskHTML(x)).join("")}
      <div class="row2 addrow">
        <label class="f">${t("taskTitle")}<input type="text" id="newTask" placeholder="✨"></label>
        <label class="f">${t("subject")}<select id="newTaskSub">${subjOptions("")}</select></label>
        <button class="cute alt" onclick="G.UI.addTask()">${t("addTask")}</button></div>` : ""}`;
    $("#panel").innerHTML = win("✦ " + (G.lang === "en" ? "today.exe" : "hoje.exe"), body);
    if ($("#newTask")) $("#newTask").onkeydown = e => { if (e.key === "Enter") UI.addTask(); };
  }
  function actHTML(a, iso) {
    const ar = G.AREAS[a.area] || G.AREAS.daily, pr = G.PRIORITIES[a.priority] || G.PRIORITIES.mid, d = G.actDone(a, iso);
    const p = a.petId ? G.pet(a.petId) : G.state.pets[0];
    const meta = [a.time ? "🕒 " + esc(a.time) : "", a.repeat && a.repeat !== "none" ? "🔁 " + esc(G.repeatLabel(a)) : "", a.remind >= 0 && a.time ? "🔔" : ""].filter(Boolean).join(" · ");
    return `<div class="task act ${d ? "done" : ""}"><span class="stripe" style="background:${esc(ar.color)}"></span>
      <button class="check" title="✔" onclick="G.UI.actToggle('${a.id}','${iso}',this)">${d && p ? G.petSVG(p, 50, "happy") : pawSVG()}</button>
      <div class="t"><strong>${ar.emoji} ${esc(a.title)}</strong>
        <div class="meta"><span class="prio" style="background:${pr.color}">${pr.emoji} ${esc(G.prioName(a.priority))}</span>${meta ? `<span class="small">${meta}</span>` : ""}</div>
        ${a.notes ? `<span>${esc(a.notes)}</span>` : ""}
        ${(a.subtasks || []).length ? `<div class="subs">${a.subtasks.map(s => { const sd = G.subDone(a, iso, s.id); return `<button class="sub ${sd ? "on" : ""}" onclick="G.UI.subToggle('${a.id}','${iso}','${s.id}',this)"><span class="box">${sd ? "✔" : ""}</span>${esc(s.text)}</button>`; }).join("")}<span class="small">${G.subProgress(a, iso).join("/")}</span></div>` : ""}</div>
      <button class="cute ghost iconbtn" title="${t("editAct")}" onclick="G.UI.editAct('${a.id}')">✎</button></div>`;
  }
  function taskHTML(x) {
    const s = G.subj(x.subjectId), p = s ? G.pet(s.petId) : G.state.pets[0];
    const color = s ? s.color : "var(--accent2)", em = x.kind === "exam" ? "📝" : x.subjectId === "rev" ? "🔮" : (s && s.emoji) || "✨";
    return `<div class="task ${x.done ? "done" : ""}"><span class="stripe" style="background:${esc(color)}"></span>
      <button class="check" title="✔" onclick="G.UI.toggle('${x.id}',this)">${x.done && p ? G.petSVG(p, 50, "happy") : pawSVG()}</button>
      <div class="t"><strong>${em} ${esc(x.title)}</strong>${x.detail ? `<span>${esc(x.detail)}</span>` : ""}${p && x.subjectId !== "rev" ? `<div class="prof">${teacher(p)} 🐾</div>` : ""}</div>
      ${x.kind === "exam" ? "" : `<button class="cute" onclick="G.UI.focus('${x.id}')">${t("focus")}</button>`}
      <button class="x" title="${t("remove")}" onclick="G.UI.delTask('${x.id}')">✕</button></div>`;
  }
  const pawSVG = () => `<svg width="30" height="30" viewBox="0 0 40 40"><g fill="var(--accent2)" stroke="var(--ink)" stroke-width="2"><ellipse cx="20" cy="26" rx="9" ry="7.5"/><circle cx="9" cy="16" r="4"/><circle cx="16" cy="9" r="4"/><circle cx="24" cy="9" r="4"/><circle cx="31" cy="16" r="4"/></g></svg>`;
  const findTask = id => { for (const d in G.state.plan) { const x = G.state.plan[d].find(y => y.id === id); if (x) return [d, x]; } return []; };
  UI.go = d => { viewDay = G.addDays(viewDay || G.todayIso(), d); pToday(); };
  UI.subToggle = (id, iso, sid, el) => {
    const a = G.state.activities.find(x => x.id === id); if (!a) return;
    const v = !G.subDone(a, iso, sid); G.setSubDone(a, iso, sid, v);
    const [x, y] = G.subProgress(a, iso);
    if (v && x === y && !G.actDone(a, iso)) { G.save(); return UI.actToggle(id, iso, el); }
    if (!v && G.actDone(a, iso)) G.setActDone(a, iso, false);
    G.save(); if (v) G.burst(el, 12);
    if (tab === "today") pToday(); else if (tab === "week") pWeek(); renderHeader();
  };
  UI.actToggle = (id, iso, el) => {
    const a = G.state.activities.find(x => x.id === id); if (!a) return;
    const v = !G.actDone(a, iso); G.setActDone(a, iso, v); G.save();
    if (v) { G.addXP(15); G.burst(el); G.toast(t("actDone")); }
    if (v && (a.subtasks || []).length) (a.subtasks || []).forEach(s => G.setSubDone(a, iso, s.id, true));
    if (v) G.save();
    if (tab === "today") pToday(); else if (tab === "acts") pActs(); else if (tab === "week") pWeek(); renderHeader();
    if (v) setTimeout(() => { const c = document.querySelector(`[onclick*="${id}','${iso}"]`); c && G.bubble(c, G.phrase()); }, 120);
  };
  UI.goto = d => { viewDay = d; if (tab !== "today") UI.show("today"); else pToday(); };
  UI.toggle = (id, el) => {
    const [d, x] = findTask(id); if (!x) return;
    x.done = !x.done; G.save();
    if (x.done) {
      G.addXP(20); G.burst(el); G.toast(t("spellDone"));
      if (G.state.plan[d].every(y => y.done)) setTimeout(() => { G.burst(null, 200); G.toast(t("dayDone")); G.addXP(30); }, 700);
    }
    pToday(); renderHeader();
    if (x.done) setTimeout(() => { const c = document.querySelector(`[onclick*="${id}"]`); c && G.bubble(c, G.phrase()); }, 120);
  };
  UI.focus = id => { const [, x] = findTask(id); if (!x) return; const s = G.subj(x.subjectId); G.startFocus(((s && s.emoji) || "✨") + " " + x.title, s && s.petId); };
  UI.delTask = id => { const [d] = findTask(id); if (!d) return; G.state.plan[d] = G.state.plan[d].filter(y => y.id !== id); if (!G.state.plan[d].length) delete G.state.plan[d]; G.save(); pToday(); renderHeader(); };
  UI.addTask = () => {
    const v = $("#newTask").value.trim(); if (!v) return;
    (G.state.plan[viewDay] = G.state.plan[viewDay] || []).push({ id: G.uid(), kind: "extra", subjectId: $("#newTaskSub").value, title: v, detail: "", done: false });
    G.save(); pToday(); renderHeader();
  };
  const subjOptions = (sel, withAll) => (withAll ? `<option value="">${t("allSubjects")}</option>` : `<option value="">—</option>`) + G.state.subjects.map(s => `<option value="${s.id}" ${s.id === sel ? "selected" : ""}>${esc((s.emoji || "") + " " + (s.short || s.name))}</option>`).join("");

  /* ================= ATIVIDADES / ACTIVITIES ================= */
  let actFilter = "";
  function pActs() {
    G.actsInit();
    const td = G.todayIso();
    const chips = `<div class="chips"><button class="chip ${actFilter ? "off" : ""}" style="background:var(--card)" onclick="G.UI.actFilter('')">✨ ${t("allAreas")}</button>` +
      G.AREA_ORDER.map(k => `<button class="chip ${actFilter && actFilter !== k ? "off" : ""}" style="background:${G.AREAS[k].color}" onclick="G.UI.actFilter('${k}')">${G.AREAS[k].emoji} ${esc(G.areaName(k))}</button>`).join("") + `</div>`;
    const list = G.state.activities.filter(a => !actFilter || a.area === actFilter).sort((x, y) =>
      (G.PRIORITIES[x.priority] || G.PRIORITIES.mid).rank - (G.PRIORITIES[y.priority] || G.PRIORITIES.mid).rank || (x.date || "").localeCompare(y.date || "") || (x.time || "").localeCompare(y.time || ""));
    const rows = list.map(a => {
      const ar = G.AREAS[a.area] || G.AREAS.daily, pr = G.PRIORITIES[a.priority] || G.PRIORITIES.mid;
      const when = a.repeat === "daily" ? "🔁 " + t("everyDay") : a.repeat === "weekly" ? "🔁 " + G.repeatLabel(a) : (a.date ? "📅 " + fmt(a.date) : "");
      return `<div class="task act"><span class="stripe" style="background:${esc(ar.color)}"></span>
        <div class="t" style="margin-left:14px"><strong>${ar.emoji} ${esc(a.title)}</strong>
        <div class="meta"><span class="prio" style="background:${pr.color}">${pr.emoji} ${esc(G.prioName(a.priority))}</span><span class="small">${esc(when)}${a.time ? " · 🕒 " + esc(a.time) : ""}${a.remind >= 0 && a.time ? " · 🔔" : ""}</span></div></div>
        ${G.occursOn(a, td) ? `<button class="check small-check" title="✔" onclick="G.UI.actToggle('${a.id}','${td}',this)">${G.actDone(a, td) ? "✅" : pawSVG()}</button>` : ""}
        <button class="cute ghost iconbtn" title="${t("editAct")}" onclick="G.UI.editAct('${a.id}')">✎</button></div>`;
    }).join("");
    const perm = G.reminders.permission();
    const nInfo = perm === "native" ? t("notifInfoNative") : /iPhone|iPad|iPod/.test(navigator.userAgent) ? t("notifInfoIos") : t("notifInfoWeb");
    const nBody = `<p class="small">${nInfo}</p>` + (perm === "default" ? `<button class="cute" onclick="G.UI.askNotif()">${t("notifAsk")}</button>` : perm === "granted" ? `<p>${t("notifOn")}</p>` : perm === "denied" ? `<p class="small">${t("notifDenied")}</p>` : perm === "native" ? `<button class="cute" onclick="G.UI.askNotif()">${t("notifAsk")}</button>` : `<p class="small">${t("notifUnsupported")}</p>`);
    $("#panel").innerHTML = win("🗓️ " + (G.lang === "en" ? "activities.exe" : "atividades.exe"),
      `<div class="nav"><button class="cute big-cta" onclick="G.UI.newAct()">${t("newAct")}</button></div>${chips}${rows || `<p>${t("noActs")}</p>`}`) +
      win(t("notifTitle") + " · " + (G.lang === "en" ? "reminders.exe" : "lembretes.exe"), nBody);
  }
  UI.actFilter = k => { actFilter = k; pActs(); };
  UI.askNotif = async () => { const r = await G.reminders.ask(); if (r === "granted") { G.toast(t("notifOn")); try { if (!G.isNative()) new Notification("☾ Grimório ☽", { body: t("notifOn"), icon: "assets/icon-192.png" }); } catch (e) { } } pActs(); };

  /* formulário de atividade (janela) / activity form (modal) */
  UI.newAct = date => UI.editAct(null, date);
  UI.editAct = (id, date) => {
    G.actsInit();
    const a = id ? JSON.parse(JSON.stringify(G.state.activities.find(x => x.id === id))) : { id: "", title: "", area: actFilter || "daily", priority: "mid", date: date || viewDay || G.todayIso(), time: "", repeat: "none", days: [], remind: 15, petId: "", notes: "" };
    const D = G.lang === "en" ? ["S", "M", "T", "W", "T", "F", "S"] : ["D", "S", "T", "Q", "Q", "S", "S"];
    const remLbl = m => m < 0 ? t("remNone") : m === 0 ? t("remAtTime") : m >= 1440 ? t("remDayBefore") : m >= 60 ? t("remHourBefore", { h: m / 60 }) : t("remBefore", { m });
    const m = document.createElement("div"); m.className = "modal"; m.id = "actModal";
    m.innerHTML = win("✎ " + (id ? t("editAct") : t("newAct").replace("+ ", "")), `
      <label class="f">${t("actTitle")}<input type="text" id="aTitle" value="${esc(a.title)}" maxlength="120" placeholder="${G.lang === "en" ? "e.g. Feed the cats" : "ex.: Dar comida pros gatos"}"></label>
      <div class="f-lbl">${t("area")}</div><div class="pick areas">${G.AREA_ORDER.map(k => `<button class="pk ${a.area === k ? "on" : ""}" data-area="${k}" style="--c:${G.AREAS[k].color}">${G.AREAS[k].emoji}<span>${esc(G.areaName(k))}</span></button>`).join("")}</div>
      <div class="f-lbl">${t("priority")}</div><div class="pick prios">${Object.keys(G.PRIORITIES).map(k => `<button class="pk ${a.priority === k ? "on" : ""}" data-prio="${k}" style="--c:${G.PRIORITIES[k].color}">${G.PRIORITIES[k].emoji}<span>${esc(G.prioName(k))}</span></button>`).join("")}</div>
      <div class="f-lbl">${t("repeat")}</div><div class="pick reps">${[["none", t("repNone")], ["daily", t("repDaily")], ["weekly", t("repWeekly")]].map(([k, l]) => `<button class="pk ${a.repeat === k ? "on" : ""}" data-rep="${k}" style="--c:var(--accent2)"><span>${l}</span></button>`).join("")}</div>
      <div class="pick days" id="aDays" style="${a.repeat === "weekly" ? "" : "display:none"}">${D.map((l, i) => `<button class="pk day ${(a.days || []).includes(i) ? "on" : ""}" data-day="${i}" style="--c:var(--accent)">${l}</button>`).join("")}</div>
      <div class="row2"><label class="f" id="aDateL">${a.repeat === "none" ? t("date") : t("startDate")}<input type="date" id="aDate" value="${esc(a.date || "")}"></label>
        <label class="f">${t("time")}<input type="time" id="aTime" value="${esc(a.time || "")}"></label></div>
      <div class="row2"><label class="f">🔔 ${t("remind")}<select id="aRem">${G.REMIND_OPTS.map(v => `<option value="${v}" ${+a.remind === v ? "selected" : ""}>${remLbl(v)}</option>`).join("")}</select></label>
        <label class="f">🐾 ${t("petRemind")}<select id="aPet"><option value="">${t("randomPet")}</option>${G.state.pets.map(p => `<option value="${p.id}" ${a.petId === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label></div>
      <label class="f">✅ ${t("subtasks")}<textarea id="aSubs" style="min-height:70px" placeholder="${t("subPlaceholder")}">${esc((a.subtasks || []).map(s => s.text).join("\n"))}</textarea></label>
      <label class="f">${t("actNotes")}<textarea id="aNotes" style="min-height:60px">${esc(a.notes || "")}</textarea></label>
      <div class="nav" style="margin-top:12px"><button class="cute big-cta" id="aSave">${t("saveAct")}</button><button class="cute ghost" id="aCancel">${t("cancel")}</button>${id ? `<button class="cute danger" id="aDel">${t("del")}</button>` : ""}</div>`);
    document.body.appendChild(m);
    const q = s => m.querySelector(s);
    const pick = (sel, attr, set) => m.querySelectorAll(sel).forEach(b => b.onclick = () => { m.querySelectorAll(sel).forEach(x => x.classList.remove("on")); b.classList.add("on"); set(b.dataset[attr]); });
    pick("[data-area]", "area", v => a.area = v);
    pick("[data-prio]", "prio", v => a.priority = v);
    pick("[data-rep]", "rep", v => { a.repeat = v; q("#aDays").style.display = v === "weekly" ? "" : "none"; q("#aDateL").firstChild.textContent = v === "none" ? t("date") : t("startDate"); if (v === "weekly" && !a.days.length) { a.days = [G.dow(q("#aDate").value || G.todayIso())]; m.querySelector(`[data-day="${a.days[0]}"]`).classList.add("on"); } });
    m.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { const d = +b.dataset.day; b.classList.toggle("on"); a.days = b.classList.contains("on") ? [...new Set(a.days.concat(d))] : a.days.filter(x => x !== d); });
    q("#aCancel").onclick = () => m.remove();
    if (q("#aDel")) q("#aDel").onclick = () => { if (!confirm(t("confirmDelete"))) return; G.state.activities = G.state.activities.filter(x => x.id !== id); G.save(); m.remove(); UI.refresh(); };
    q("#aSave").onclick = () => {
      a.title = q("#aTitle").value.trim(); if (!a.title) { G.toast(t("needTitle")); q("#aTitle").focus(); return; }
      a.date = q("#aDate").value || G.todayIso(); a.time = q("#aTime").value; a.remind = +q("#aRem").value; a.petId = q("#aPet").value; a.notes = q("#aNotes").value.trim();
      const oldSubs = a.subtasks || [];
      a.subtasks = q("#aSubs").value.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 30).map(text => { const o = oldSubs.find(x => x.text === text); return { id: o ? o.id : G.uid(), text }; });
      if (a.repeat === "weekly" && !a.days.length) a.repeat = "none";
      if (!id) { a.id = G.uid(); a.createdAt = Date.now(); G.state.activities.push(a); }
      else { const i = G.state.activities.findIndex(x => x.id === id); G.state.activities[i] = a; Object.keys(G.state.remFired).forEach(k => { if (k.startsWith(id + "|")) delete G.state.remFired[k]; }); }
      G.save(); m.remove(); G.toast(t("actSaved")); G.burst(null, 40); UI.refresh();
      if (a.remind >= 0 && a.time && G.reminders.permission() === "default") setTimeout(() => G.toast("🔔 " + t("notifAsk") + " → " + t("tabs.acts")), 2600);
    };
    setTimeout(() => q("#aTitle").focus(), 50);
  };

  /* lembrete com pet / pet reminder popup */
  UI.reminderPopup = (o, title, body) => {
    const pet = (o.a.petId && G.state.pets.find(p => p.id === o.a.petId)) || G.rnd(G.state.pets);
    const el = document.createElement("div"); el.className = "rempop";
    el.innerHTML = `<div class="rempet bob">${pet ? G.petSVG(pet, 120, "happy") : ""}<span class="nm">${esc(pet ? pet.name : "")}</span></div>
      <div class="win" style="margin:0;flex:1"><div class="bar">🔔 ${G.lang === "en" ? "reminder.exe" : "lembrete.exe"}<span class="dots"><i></i><i></i><i></i></span></div><div class="wbody">
      <div style="font-size:1.15rem;font-weight:900">${esc(title)}</div><p style="margin:6px 0">${esc(body)}</p>
      <div class="nav"><button class="cute" data-r="done">${t("remDone")}</button><button class="cute alt" data-r="snooze">${t("remSnooze")}</button><button class="cute ghost" data-r="ok">${t("remOk")}</button></div></div></div>`;
    document.body.appendChild(el);
    try { const ac = new (window.AudioContext || window.webkitAudioContext)();[784, 988, 1175, 988].forEach((f, i) => { const os = ac.createOscillator(), g = ac.createGain(); os.type = "triangle"; os.frequency.value = f; os.connect(g); g.connect(ac.destination); const tt = ac.currentTime + i * .15; g.gain.setValueAtTime(.16, tt); g.gain.exponentialRampToValueAtTime(.001, tt + .25); os.start(tt); os.stop(tt + .25); }); } catch (e) { }
    el.querySelectorAll("[data-r]").forEach(b => b.onclick = () => {
      const r = b.dataset.r;
      if (r === "done") { G.setActDone(o.a, o.iso, true); G.save(); G.addXP(15); G.burst(b, 60); G.toast(t("actDone")); if (tab === "today" || tab === "acts") renderPanel(); }
      if (r === "snooze") G.reminders.snooze(o, 10);
      el.remove();
    });
  };

  /* ================= SEMANA / WEEK ================= */
  let weekStart = null;
  const mondayOf = iso => { const d = G.dow(iso); return G.addDays(iso, d === 0 ? -6 : 1 - d); };
  function pWeek() {
    const td = G.todayIso(); if (!weekStart) weekStart = mondayOf(td);
    const days = [...Array(7)].map((_, i) => G.addDays(weekStart, i));
    const cols = days.map(d => {
      const acts = G.actsOn(d), spells = (G.state.plan[d] || []), exams = G.state.exams.filter(e => e.date === d);
      const done = acts.filter(a => G.actDone(a, d)).length + spells.filter(x => x.done).length, tot = acts.length + spells.length;
      return `<div class="wday ${d === td ? "now" : ""} ${d < td ? "past" : ""}"><button class="wh" onclick="G.UI.goto('${d}')"><b>${fmt(d)}</b><span>${tot ? moonOf(done / tot) : "·"}</span></button>
        ${exams.map(e => { const s = G.subj(e.subjectId); return `<div class="wi exam">📝 ${esc(e.time)} ${esc(s ? s.short || s.name : "")}</div>`; }).join("")}
        ${acts.map(a => `<button class="wi ${G.actDone(a, d) ? "done" : ""}" style="border-left-color:${(G.AREAS[a.area] || G.AREAS.daily).color}" onclick="G.UI.actToggle('${a.id}','${d}',this)">${(G.PRIORITIES[a.priority] || G.PRIORITIES.mid).emoji} ${a.time ? esc(a.time) + " " : ""}${esc(a.title)}</button>`).join("")}
        ${spells.length ? `<button class="wi spells" onclick="G.UI.goto('${d}')">📚 ${t("spellsN", { n: spells.length })} · ${spells.filter(x => x.done).length}/${spells.length}</button>` : ""}
        ${!acts.length && !spells.length && !exams.length ? `<div class="small" style="padding:4px 2px">${t("nothing")}</div>` : ""}
        <button class="wadd" onclick="G.UI.newAct('${d}')">+</button></div>`;
    }).join("");
    $("#panel").innerHTML = win("📆 " + (G.lang === "en" ? "week.exe" : "semana.exe"), `<div class="nav"><button class="cute" onclick="G.UI.week(-7)">${t("prevWeek")}</button><button class="cute" onclick="G.UI.week(0)">${t("thisWeek")}</button><button class="cute" onclick="G.UI.week(7)">${t("nextWeek")}</button></div>
      <h3>${t("weekOf", { d: fmt(weekStart) })}</h3><div class="weekgrid">${cols}</div>`);
  }
  UI.week = n => { weekStart = n === 0 ? mondayOf(G.todayIso()) : G.addDays(weekStart || mondayOf(G.todayIso()), n); pWeek(); };

  /* ================= CONQUISTAS / ACHIEVEMENTS ================= */
  function pTrophies() {
    const A = G.state.achieved || {}, names = t("ach");
    const n = G.streak(), pets = G.state.pets;
    const items = G.ACH.map(([k, em], i) => { const got = A[k], p = pets[i % Math.max(1, pets.length)]; return `<div class="troph ${got ? "got" : ""}">${got && p ? G.petSVG(p, 56, "happy", "crown") : `<span class="lock">🔒</span>`}<div><b>${em} ${esc(names[k][0])}</b><div class="small">${esc(names[k][1])}</div>${got ? `<div class="small">✔ ${new Date(got).toLocaleDateString(G.lang === "en" ? "en-US" : "pt-BR")}</div>` : `<div class="small">${t("locked")}</div>`}</div></div>`; }).join("");
    $("#panel").innerHTML = win("🏆 " + (G.lang === "en" ? "achievements.exe" : "conquistas.exe"), `<div class="streakbig">🔥 <b>${n}</b> <span>${n === 1 ? t("streak1").replace(/^1 /, "") : t("streak", { n: "" }).trim()}</span></div><div class="trophs">${items}</div>`);
  }
  UI.achievementPopup = k => {
    const nm = t("ach")[k]; if (!nm) return; const em = (G.ACH.find(x => x[0] === k) || [])[1] || "🏆";
    const pet = G.rnd(G.state.pets);
    const el = document.createElement("div"); el.className = "rempop";
    el.innerHTML = `<div class="rempet bob">${pet ? G.petSVG(pet, 110, "happy", "crown") : ""}</div><div class="win" style="margin:0;flex:1"><div class="bar">🏆 ${t("unlocked")}<span class="dots"><i></i><i></i><i></i></span></div><div class="wbody"><div style="font-size:1.2rem;font-weight:900">${em} ${esc(nm[0])}</div><p style="margin:6px 0">${esc(nm[1])}</p><div class="nav"><button class="cute">✨ OK</button></div></div></div>`;
    document.body.appendChild(el); G.burst(el, 120);
    el.querySelector("button").onclick = () => el.remove(); setTimeout(() => el.isConnected && el.remove(), 9000);
  };

  /* ================= CALENDÁRIO / CALENDAR ================= */
  function pCal() {
    const keys = Object.keys(G.state.plan).sort(), td = G.todayIso();
    const body = keys.length ? `<div class="grid">${keys.map(k => {
      const ts = G.state.plan[k], n = ts.filter(x => x.done).length, ex = ts.some(x => x.kind === "exam");
      const subs = [...new Set(ts.map(x => x.subjectId))].map(G.subj).filter(Boolean);
      return `<button class="day ${ex ? "exam" : ""} ${k < td ? "past" : ""} ${k === td ? "now" : ""}" onclick="G.UI.goto('${k}')">
        <span class="moon">${ex ? "📝" : moonOf(ts.length ? n / ts.length : 0)}</span><h4>${fmt(k)} ${k === td ? "✦" : ""}</h4><p><b style="color:var(--ink)">${esc(G.dayTitle(k))}</b></p>
        <p style="margin-top:6px;display:flex;gap:2px;align-items:center">${subs.slice(0, 4).map(s => G.petSVG(G.pet(s.petId), 28)).join("")}<span style="margin-left:6px">${n}/${ts.length}</span></p></button>`;
    }).join("")}</div><p class="small">${t("calHelp")}</p>` : `<p>${t("emptyPlan")}</p>`;
    $("#panel").innerHTML = win("☾ " + (G.lang === "en" ? "moon_calendar.exe" : "calendario_lunar.exe"), body);
  }

  /* ================= TAROT ================= */
  function pTarot() {
    if (!tarotFilter) tarotFilter = new Set(G.state.subjects.map(s => s.id).concat([""]));
    const chips = G.state.subjects.map(s => `<button class="chip ${tarotFilter.has(s.id) ? "" : "off"}" style="background:${esc(s.color)}" onclick="G.UI.chip('${s.id}')">${G.petSVG(G.pet(s.petId), 28)}${esc(s.short || s.name)}</button>`).join("");
    const body = `<div class="chips">${chips}</div><div class="flash-area"><div class="small" id="fcount"></div>
      <div class="flash" id="flash"><div class="inner"><div class="face front" id="ffront"></div><div class="face back" id="fback"></div></div></div>
      <div class="btns"><button class="big" style="background:var(--accent)" onclick="G.UI.forgot()">${t("forgot")}</button>
      <button class="big" style="background:var(--primary)" onclick="G.UI.knew(this)">${t("knew")}</button><button class="big" style="background:var(--accent2)" onclick="G.UI.nextCard()">${t("another")}</button></div>
      <div class="small">${t("tapCard")}</div></div>`;
    const manage = `<div class="row2" style="grid-template-columns:1fr 2fr 2fr auto;align-items:end">
      <label class="f">${t("subject")}<select id="cSub">${subjOptions("")}</select></label>
      <label class="f">${t("question")}<input type="text" id="cQ"></label><label class="f">${t("answer")}<input type="text" id="cA"></label>
      <button class="cute" onclick="G.UI.addCard()">${t("add")}</button></div>
      <label class="f">${t("bulkCards")}<textarea id="cBulk" placeholder="O que é MQTT? ;; Protocolo publish/subscribe leve"></textarea></label>
      <div class="nav" style="margin-top:8px"><button class="cute alt" onclick="G.UI.addBulk()">${t("add")}</button></div>
      <details><summary class="small">${t("manageCards")} (${G.state.cards.length})</summary>${G.state.cards.map(c => { const s = G.subj(c.subjectId); return `<div class="task" style="margin:8px 0;padding:6px 10px"><div class="t"><strong>${esc(c.q)}</strong><span>${esc(c.a)}</span><div class="prof">${s ? esc(s.short || s.name) : "—"}</div></div><button class="x" onclick="G.UI.delCard('${c.id}')">✕</button></div>`; }).join("")}</details>`;
    $("#panel").innerHTML = win("🔮 " + (G.lang === "en" ? "study_tarot.exe" : "tarot_dos_estudos.exe"), body) + win("🃏 " + t("newCard").toLowerCase().replace(/ /g, "_") + ".exe", manage);
    $("#flash").onclick = () => $("#flash").classList.toggle("flip");
    UI.nextCard();
  }
  const ROM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
  UI.chip = id => { tarotFilter.has(id) ? tarotFilter.delete(id) : tarotFilter.add(id); pTarot(); };
  UI.nextCard = () => {
    const pool = G.state.cards.filter(c => tarotFilter.has(c.subjectId || ""));
    const wait = pool.flatMap(c => Array(1 + (c.miss || 0) * 2).fill(c));
    if (!pool.length) { $("#ffront").innerHTML = `<div>${t("noCards")}</div>`; $("#fback").innerHTML = ""; $("#fcount").textContent = ""; return; }
    let c; do { c = G.rnd(wait); } while (pool.length > 1 && c === curCard);
    curCard = c; const s = G.subj(c.subjectId), p = s ? G.pet(s.petId) : G.state.pets[0], i = G.state.cards.indexOf(c);
    $("#flash").classList.remove("flip");
    setTimeout(() => {
      $("#ffront").innerHTML = `<span class="arc">✦ ${ROM[i % 21]} · ${esc((s ? s.short || s.name : "✨").toUpperCase())} ✦</span>${p ? G.petSVG(p, 64, "ok", "witch") : ""}<div style="margin-top:8px">${esc(c.q)}</div><span class="stars">☾ ✦ ★ ✦ ☽</span>`;
      $("#fback").style.background = `linear-gradient(180deg,${s ? s.color : "var(--accent2)"} 0 18%,var(--card) 18%)`;
      $("#fback").innerHTML = `<span class="arc">${t("revealed")}</span><div style="margin-top:24px">${esc(c.a)}</div><div style="margin-top:10px">${p ? G.petSVG(p, 44, "happy") : ""}</div>`;
    }, 220);
    $("#fcount").textContent = `${pool.length} ${t("cards")} · ${pool.filter(x => x.miss > 0).length} ${t("toReinforce")}`;
  };
  UI.knew = el => { if (!curCard) return; G.state.stats = G.state.stats || {}; G.state.stats.cardsKnown = (G.state.stats.cardsKnown || 0) + 1; curCard.miss = Math.max(0, (curCard.miss || 0) - 1); G.addXP(5); G.burst(el, 30); UI.nextCard(); };
  UI.forgot = () => { if (!curCard) return; curCard.miss = (curCard.miss || 0) + 1; G.save(); G.toast(t("forgotToast")); UI.nextCard(); };
  UI.addCard = () => { if (G.addCard($("#cSub").value, $("#cQ").value, $("#cA").value)) { G.save(); tarotFilter = null; pTarot(); G.toast(t("saved")); } };
  UI.addBulk = () => { const sid = $("#cSub").value; let n = 0; $("#cBulk").value.split("\n").forEach(l => { const [q, a] = l.split(";;"); if (G.addCard(sid, (q || "").trim(), (a || "").trim())) n++; }); G.save(); tarotFilter = null; pTarot(); G.toast("+" + n + " 🃏"); };
  UI.delCard = id => { G.state.cards = G.state.cards.filter(c => c.id !== id); G.save(); pTarot(); };

  /* ================= MATÉRIAS / SUBJECTS ================= */
  function pSubjects() {
    const petOpts = sel => G.state.pets.map(p => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.name)}</option>`).join("");
    const subs = G.state.subjects.map(s => `<details class="sub" ${G.state.subjects.length < 3 ? "open" : ""}><summary><span style="width:22px;height:22px;border-radius:50%;background:${esc(s.color)};border:2.5px solid var(--ink);display:inline-block"></span>${G.petSVG(G.pet(s.petId), 34)} ${esc(s.emoji || "📚")} ${esc(s.name)} <span class="small">· ${s.topics.length} ${G.lang === "en" ? "topics" : "temas"}</span></summary><div class="in">
      <div class="row2"><label class="f">${t("name")}<input type="text" value="${esc(s.name)}" oninput="G.UI.sset('${s.id}','name',this.value)"></label>
      <label class="f">${t("shortName")}<input type="text" value="${esc(s.short)}" oninput="G.UI.sset('${s.id}','short',this.value)"></label>
      <label class="f">${t("emoji")}<input type="text" value="${esc(s.emoji)}" maxlength="4" oninput="G.UI.sset('${s.id}','emoji',this.value)"></label>
      <label class="f">${t("color")}<input type="color" value="${esc(s.color)}" oninput="G.UI.sset('${s.id}','color',this.value)"></label>
      <label class="f">${t("petTeacher")}<select onchange="G.UI.sset('${s.id}','petId',this.value)">${petOpts(s.petId)}</select></label></div>
      <label class="f">${t("topics")}<textarea onchange="G.UI.topics('${s.id}',this.value)">${esc(s.topics.map(x => x.title + (x.detail ? " | " + x.detail : "")).join("\n"))}</textarea></label>
      <label class="f" style="margin-top:8px">${t("notes")}<textarea oninput="G.UI.sset('${s.id}','notes',this.value)">${esc(s.notes)}</textarea></label>
      <div class="nav" style="margin-top:10px"><button class="cute danger" onclick="G.UI.delSubject('${s.id}')">🗑️ ${t("deleteSubject")}</button></div></div></details>`).join("");
    const exams = G.state.exams.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map(e => `<div class="erow">
      <select onchange="G.UI.eset('${e.id}','subjectId',this.value)">${subjOptions(e.subjectId)}</select>
      <input type="date" value="${esc(e.date)}" onchange="G.UI.eset('${e.id}','date',this.value)"><input type="time" value="${esc(e.time)}" onchange="G.UI.eset('${e.id}','time',this.value)">
      <input type="text" value="${esc(e.place)}" placeholder="${t("place")}" oninput="G.UI.eset('${e.id}','place',this.value)"><button class="x" onclick="G.UI.delExam('${e.id}')">✕</button></div>`).join("");
    const st = G.state.settings;
    const plan = `<p class="small">${t("regenHelp")}</p><div class="row2">
      <label class="f">${t("blocksPerDay")}<input type="number" min="1" max="8" value="${st.blocksPerDay}" onchange="G.UI.setset('blocksPerDay',this.value)"></label>
      <label class="f">${t("startDate")}<input type="date" value="${esc(st.startDate)}" onchange="G.UI.setset('startDate',this.value)"></label>
      <label class="f">${t("focusMin")}<input type="number" min="5" max="90" value="${st.focus}" onchange="G.UI.setset('focus',this.value)"></label>
      <label class="f">${t("pauseMin")}<input type="number" min="1" max="30" value="${st.pause}" onchange="G.UI.setset('pause',this.value)"></label></div>
      <div class="nav"><button class="cute" style="font-size:1.05rem" onclick="G.UI.regen()">${t("regen")}</button></div>`;
    $("#panel").innerHTML =
      win("📚 " + t("subjects").toLowerCase() + ".exe", subs + `<div class="nav" style="margin-top:12px"><button class="cute" onclick="G.UI.addSubject()">${t("addSubject")}</button><button class="cute alt" onclick="G.UI.show('data')">🎓 ${t("goImport")}</button></div>`) +
      win("📝 " + t("exams").toLowerCase() + ".exe", (exams || "") + `<div class="nav" style="margin-top:10px"><button class="cute" onclick="G.UI.addExam()" ${G.state.subjects.length ? "" : "disabled"}>${t("addExam")}</button></div>`) +
      win("✨ " + (G.lang === "en" ? "study_plan.exe" : "plano_de_estudos.exe"), plan);
  }
  UI.sset = (id, k, v) => { const s = G.subj(id); if (!s) return; s[k] = v; later(); if (k === "petId" || k === "color" || k === "emoji") setTimeout(pSubjects, 0); };
  UI.topics = (id, v) => {
    const s = G.subj(id), old = s.topics;
    s.topics = v.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const [title, detail] = l.split("|").map(x => x.trim()); const o = old.find(x => x.title === title); return { id: o ? o.id : G.uid(), title, detail: detail || "" }; });
    G.save();
  };
  UI.addSubject = () => { const s = G.findOrCreateSubject((G.lang === "en" ? "New subject " : "Nova matéria ") + (G.state.subjects.length + 1)); G.save(); pSubjects(); };
  UI.delSubject = id => { if (!confirm(t("confirmDelete"))) return; G.state.subjects = G.state.subjects.filter(s => s.id !== id); G.state.exams = G.state.exams.filter(e => e.subjectId !== id); G.save(); pSubjects(); renderHeader(); };
  UI.addExam = () => { G.state.exams.push({ id: G.uid(), subjectId: G.state.subjects[0].id, date: G.addDays(G.todayIso(), 7), time: "09:00", place: "" }); G.save(); pSubjects(); renderCountdowns(); };
  UI.eset = (id, k, v) => { const e = G.state.exams.find(x => x.id === id); e[k] = v; later(); renderCountdowns(); };
  UI.delExam = id => { G.state.exams = G.state.exams.filter(e => e.id !== id); G.save(); pSubjects(); renderCountdowns(); };
  UI.setset = (k, v) => { G.state.settings[k] = (k === "startDate") ? v : +v; G.save(); };
  UI.regen = () => { G.buildPlan(); viewDay = null; G.toast(t("regenDone")); G.burst(null, 80); renderHeader(); UI.show("today"); };

  /* ================= PETS ================= */
  function pPets() {
    const opt = (arr, sel, names) => arr.map(v => `<option value="${v}" ${v === sel ? "selected" : ""}>${esc(names ? names[v] || v : v)}</option>`).join("");
    const cards = G.state.pets.map(p => {
      const sp = G.SPECIES[p.species] || G.SPECIES.cat, d = Object.assign({}, sp.d, p);
      return `<div class="petcard" id="pc-${p.id}"><div class="pv" id="pv-${p.id}">${pv(p)}</div>
      <div class="row2"><label class="f">${t("name")}<input type="text" value="${esc(p.name)}" oninput="G.UI.pset('${p.id}','name',this.value)"></label>
      <label class="f">${t("gender")}<select onchange="G.UI.pset('${p.id}','gender',this.value)">${opt(["f", "m", "n"], p.gender, { f: t("female"), m: t("male"), n: t("neutral") })}</select></label></div>
      <div class="row2"><label class="f">${t("species")}<select onchange="G.UI.species('${p.id}',this.value)">${opt(G.SPECIES_ORDER, p.species, t("speciesNames"))}</select></label>
      <label class="f">${t("pattern")}<select onchange="G.UI.pset('${p.id}','pattern',this.value)">${opt(sp.patterns, d.pattern, t("patternNames"))}</select></label></div>
      <div class="row2" style="grid-template-columns:repeat(3,1fr)"><label class="f">${t("baseColor")}<input type="color" value="${esc(d.base)}" oninput="G.UI.pset('${p.id}','base',this.value)"></label>
      <label class="f">${t("accentColor")}<input type="color" value="${esc(d.accent)}" oninput="G.UI.pset('${p.id}','accent',this.value)"></label>
      <label class="f">${t("eyes")}<input type="color" value="${esc(d.eye)}" oninput="G.UI.pset('${p.id}','eye',this.value)"></label></div>
      <div class="row2"><label class="f">${t("accessory")}<select onchange="G.UI.pset('${p.id}','accessory',this.value)">${opt(G.ACCESSORIES, p.accessory || "none", t("accNames"))}</select></label>
      ${sp.ears ? `<label class="f">${t("earsStyle")}<select onchange="G.UI.pset('${p.id}','ears',this.value)">${opt(sp.ears, d.ears, t("earNames"))}</select></label>` : ""}</div>
      <div class="nav"><button class="cute alt" onclick="G.UI.rndPet('${p.id}')">${t("randomize")}</button>${G.state.pets.length > 1 ? `<button class="cute danger" onclick="G.UI.delPet('${p.id}')">🗑️</button>` : ""}</div></div>`;
    }).join("");
    $("#panel").innerHTML = win("🐾 " + (G.lang === "en" ? "my_pets.exe" : "meus_pets.exe"), `<div class="petgrid">${cards}</div><div class="nav" style="margin-top:14px"><button class="cute" onclick="G.UI.addPet()">${t("addPet")}</button></div>`);
  }
  const pv = p => ["ok", "happy", "sleep"].map(m => G.petSVG(p, 78, m)).join("");
  UI.pset = (id, k, v) => { const p = G.pet(id); p[k] = v; later(); const el = $("#pv-" + id); if (el) el.innerHTML = pv(p); if (k === "name" || k === "gender") return; clearTimeout(UI._h); UI._h = setTimeout(renderHeader, 300); };
  UI.species = (id, v) => { const p = G.pet(id), d = G.SPECIES[v].d; Object.assign(p, { species: v, base: d.base, accent: d.accent, pattern: d.pattern, eye: d.eye, ears: d.ears }); G.save(); pPets(); renderHeader(); };
  UI.rndPet = id => { const p = G.pet(id); Object.assign(p, G.randomPet()); G.save(); pPets(); renderHeader(); };
  UI.addPet = () => { const np = Object.assign({ id: G.uid(), name: "Pet " + (G.state.pets.length + 1), gender: "n" }, G.randomPet()); G.state.pets.push(np); G.save(); pPets(); renderHeader(); renderTabs(); };
  UI.delPet = id => { if (!confirm(t("confirmDelete"))) return; G.state.pets = G.state.pets.filter(p => p.id !== id); G.save(); pPets(); renderHeader(); renderTabs(); };

  /* ================= APARÊNCIA / LOOK ================= */
  function pLook() {
    const th = G.state.theme, cur = Object.assign({}, G.THEMES[th.preset] || G.THEMES.halloween, th.custom);
    const sw = Object.keys(G.THEMES).map(k => { const c = G.THEMES[k]; return `<button class="sw ${k === th.preset ? "on" : ""}" onclick="G.UI.preset('${k}')"><span class="dots">${["bg", "primary", "accent", "accent2", "card"].map(x => `<i style="background:${c[x]}"></i>`).join("")}</span>${esc(t("presetNames")[k] || k)}</button>`; }).join("");
    const pick = ["bg", "dot", "primary", "primary2", "accent", "accent2", "card", "cardAlt", "ink", "onBg", "screen"].map(k => `<label class="f">${esc(t(k) === k ? k : t(k))}<input type="color" value="${cur[k]}" oninput="G.UI.color('${k}',this.value)"></label>`).join("");
    const shapes = Object.keys(G.TAMA_SHAPES).map(k => { const s = G.TAMA_SHAPES[k]; return `<button class="shape ${k === G.state.tamaShape ? "on" : ""}" onclick="G.UI.shape('${k}')"><svg width="44" height="50" viewBox="0 0 ${s.vb[0]} ${s.vb[1]}"><path d="${s.path}" fill="var(--primary)" stroke="var(--ink)" stroke-width="8"/></svg>${esc(t("shapeNames")[k])}</button>`; }).join("");
    const arts = pronSelect("", "G.UI.setPronoun(this.value)");
    $("#panel").innerHTML =
      win("👑 " + t("owner").toLowerCase().replace(/ /g, "_") + ".exe", `<div class="row2"><label class="f">${t("yourName")}<input type="text" value="${esc(G.state.owner.name)}" oninput="G.UI.owner('name',this.value)"></label>${arts}
        <label class="f">${t("language")}<select onchange="G.UI.lang(this.value)">${Object.keys(G.I18N).map(l => `<option value="${l}" ${l === G.lang ? "selected" : ""}>${G.I18N[l].langName}</option>`).join("")}</select></label></div>
        <p class="small">→ <b>${esc(G.pageTitle())}</b></p>`) +
      win("🎨 " + (G.lang === "en" ? "colors.exe" : "cores.exe"), `<h3>${t("preset")}</h3><div class="swatches">${sw}</div><h3>${t("custom")}</h3><div class="row2" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">${pick}</div>
        <div class="nav"><button class="cute ghost" onclick="G.UI.preset('${th.preset}')">↺ reset</button></div>`) +
      win("🥚 " + (G.lang === "en" ? "virtual_pet.exe" : "bichinho_virtual.exe"), `<h3>${t("tamaShape")}</h3><div class="shapes">${shapes}</div>
        <h3>${t("tamaBigger")} / ${t("tamaSmaller").toLowerCase()}</h3><div class="nav"><button class="cute iconbtn" onclick="G.tamaScale(-1)">−</button><button class="cute iconbtn" onclick="G.tamaScale(1)">+</button></div>`) +
      win("♿ " + (G.lang === "en" ? "accessibility.exe" : "acessibilidade.exe"), `<h3>${t("textSize")}</h3><div class="nav"><button class="cute iconbtn" onclick="G.UI.textSize(-10)">A−</button><span style="align-self:center;font-weight:900">${(G.state.a11y || {}).text || 100}%</span><button class="cute iconbtn" onclick="G.UI.textSize(10)">A+</button></div>
        <label class="toggle"><input type="checkbox" ${(G.state.a11y || {}).lessMotion ? "checked" : ""} onchange="G.UI.lessMotion(this.checked)"> ${t("lessMotion")}</label>`);
  }
  G.applyA11y = () => { const a = G.state.a11y || {}; document.documentElement.style.fontSize = (a.text || 100) + "%"; document.body.classList.toggle("calm", !!a.lessMotion); };
  UI.textSize = d => { G.state.a11y = G.state.a11y || {}; G.state.a11y.text = Math.max(80, Math.min(150, (G.state.a11y.text || 100) + d)); G.applyA11y(); G.save(); pLook(); };
  UI.lessMotion = v => { G.state.a11y = G.state.a11y || {}; G.state.a11y.lessMotion = v; G.applyA11y(); G.save(); };
  UI.preset = k => { G.state.theme = { preset: k, custom: {} }; G.applyTheme(G.state.theme); G.save(); pLook(); G.tamaRender(); };
  UI.color = (k, v) => { G.state.theme.custom[k] = v; G.applyTheme(G.state.theme); later(); };
  UI.shape = k => { G.state.tamaShape = k; G.save(); G.tamaRender(); pLook(); };
  UI.owner = (k, v) => { G.state.owner[k] = v; later(); renderHeader(); const el = document.querySelector("#panel p.small b"); if (el) el.textContent = G.pageTitle(); };
  UI.lang = l => { G.state.lang = G.lang = l; G.save(); document.documentElement.lang = l === "pt" ? "pt-BR" : l; marquee(); UI.refresh(); };

  /* ================= IMPORTAR / DATA ================= */
  function pData() {
    const ci = G.state.institution;
    const c = G.connectors.get(ci);
    const conns = G.connectors.list.map(x => `<button class="cute ${x.id === ci ? "" : "ghost"}" onclick="G.UI.inst('${x.id}')">${x.emoji} ${esc(G.lang === "en" && x.nameEn ? x.nameEn : x.name)}</button>`).join("");
    $("#panel").innerHTML = transferWin() + safetyWin() +
      win("🎓 " + (G.lang === "en" ? "connect_school.exe" : "conectar_faculdade.exe"), `<h3>${t("institution")}</h3><div class="conns">${conns}</div>
        <div class="found"><b>${t("connectorHelp")}:</b><br>${c.help[G.lang] || c.help.pt}</div>
        <textarea id="paste" style="min-height:150px" placeholder="${t("pasteHere")}"></textarea>
        <div class="nav" style="margin-top:8px"><button class="cute" onclick="G.UI.analyze()">${t("analyze")}</button></div><div id="parsed"></div>
        <p class="small">${t("privacy")}<br>${t("newConnector")}</p>`) +
      win("💾 " + (G.lang === "en" ? "files.exe" : "arquivos.exe"), `<div class="nav">
        <label class="cute alt" style="display:inline-block">${t("importFile")}<input type="file" accept=".json,.grimorio,.csv,.ics" style="display:none" onchange="G.UI.file(this)"></label>
        <button class="cute" onclick="G.exportJSON()">${t("exportJson")}</button><button class="cute ghost" onclick="G.download('grimorio-modelo.csv',G.csvTemplate(),'text/csv')">${t("csvTemplate")}</button>
<button class="cute danger" onclick="G.UI.reset()">${t("resetAll")}</button></div>
        <p class="small">${t("privacy")}</p>`);
    fillSnaps();
  }
  const when = ts => ts ? new Date(ts).toLocaleString(G.lang === "en" ? "en-US" : "pt-BR", { dateStyle: "short", timeStyle: "short" }) : t("never");
  /* passar para outro aparelho: só por arquivo, nada fica em servidor / move to another device: by file only */
  function transferWin() {
    return win("📲 " + (G.lang === "en" ? "move_device.exe" : "passar_aparelho.exe") + " · " + t("moveTitle"), `<p>${t("localOnly")}</p>
      <ol class="small steps"><li>${t("move1")}</li><li>${t("move2")}</li><li>${t("move3")}</li></ol>
      <div class="nav"><button class="cute big-cta" onclick="G.UI.exportEnc()">${t("exportEnc")}</button>
      <label class="cute alt" style="display:inline-block">${t("importFile")}<input type="file" accept=".json,.grimorio,.csv,.ics" style="display:none" onchange="G.UI.file(this)"></label></div>`, "moveWin");
  }
  function safetyWin() {
    const S = G.safety;
    const fileTxt = { on: t("fileOn"), paused: t("filePaused"), off: t("fileOff"), unsupported: t("fileUnsupported") }[S.fileStatus] || "";
    const fileBtn = S.fileStatus === "on" ? `<button class="cute ghost" onclick="G.UI.fileOff()">${t("fileDisable")}</button>`
      : S.fileStatus === "paused" ? `<button class="cute" onclick="G.UI.fileResume()">${t("fileResume")}</button>`
      : S.fileStatus === "off" ? `<button class="cute" onclick="G.UI.fileOn()">${t("fileEnable")}</button>` : "";
    return win("🛡️ " + (G.lang === "en" ? "data_protection.exe" : "protecao_dos_dados.exe"), `<p class="small">${S.persisted ? t("persistOn") : t("persistOff")}</p>
      <h3>💾 ${t("fileBackup")}</h3><p class="small">${fileTxt}</p><div class="nav">${fileBtn}<button class="cute alt" onclick="G.UI.exportNow()">${t("exportJson")}</button>${G.vault.supported() ? `<button class="cute" onclick="G.UI.exportEnc()">${t("exportEnc")}</button>` : ""}</div>
      <p class="small">${t("lastBackup", { d: when(G.state.lastBackupAt) })}</p>
      <details id="snaps"><summary class="small">${t("snapshots")}</summary><div id="snapList" class="small">…</div></details>`, "safetyWin");
  }
  UI.exportEnc = async () => { const p = await G.vault.ask("new", t("exportEncMsg")); if (!p) return; await G.vault.exportFile(p); G.state.lastBackupAt = Date.now(); G.save({ keepTime: true }); pData(); };
  // limpa restos da antiga nuvem (sessão, chaves, avisos) / clean up leftovers from the old cloud version
  async function cleanupCloud() {
    try { Object.keys(localStorage).filter(k => /^sb-|^grimorio\.(cloud|e2e)$/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { }
    if (G.idbSet) G.idbSet("vaultKey", null);
    delete G.state.cloudUser; delete G.state.tz;
    try { if ("serviceWorker" in navigator) { const r = await navigator.serviceWorker.getRegistration(); const s = r && r.pushManager && await r.pushManager.getSubscription(); if (s) await s.unsubscribe(); } } catch (e) { }
  }
  UI.fileOn = async () => { if (await G.safety.enableFile()) { G.toast(t("saved")); } pData(); renderXP(); };
  UI.fileResume = async () => { await G.safety.resumeFile(); pData(); renderXP(); };
  UI.fileOff = async () => { await G.safety.disableFile(); pData(); renderXP(); };
  UI.exportNow = () => { G.exportJSON(); G.state.lastBackupAt = Date.now(); G.save({ keepTime: true }); pData(); };
  UI.restore = async i => {
    if (!confirm(t("restoreConfirm"))) return;
    const list = await G.safety.snapshots(), s = list[i]; if (!s) return;
    await G.safety.snapshot("before-restore");
    G.state = Object.assign(G.defaultState(), s.state); G.lang = G.state.lang; G.save();
    G.applyTheme(G.state.theme); G.tamaRender(); UI.refresh(); G.toast(t("restored"));
  };
  async function fillSnaps() {
    const el = $("#snapList"); if (!el) return;
    const list = await G.safety.snapshots();
    el.innerHTML = list.length ? list.map((s, i) => `<div style="display:flex;gap:8px;align-items:center;margin:4px 0">${when(s.at)} · ${esc(s.reason)} · ${s.state.subjects.length} 📚 <button class="cute ghost" style="padding:2px 10px" onclick="G.UI.restore(${i})">${t("restore")}</button></div>`).join("") : t("never");
  }
  UI.inst = id => { G.state.institution = id; G.save(); pData(); };
  UI.analyze = () => {
    const r = G.connectors.get(G.state.institution).parse($("#paste").value || "");
    lastParsed = r;
    const n = r.subjects.length + r.exams.length + r.cards.length + r.topicsOnly.length;
    if (!n) { $("#parsed").innerHTML = `<div class="found">${t("nothingFound")}</div>`; return; }
    const li = a => a.length ? `<ul>${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    $("#parsed").innerHTML = `<div class="found"><b>${t("preview")}</b>
      ${r.subjects.length ? `<div>📚 ${t("subjects")}</div>${li(r.subjects.map(s => s.name))}` : ""}
      ${r.exams.length ? `<div>📝 ${t("exams")}</div>${li(r.exams.map(e => `${e.subject} — ${fmt(e.date)} ${e.time} ${e.place || ""}`))}` : ""}
      ${r.cards.length ? `<div>🃏 ${r.cards.length}</div>` : ""}
      ${r.topicsOnly.length ? `<div>✨ ${G.lang === "en" ? "Topics" : "Temas"}</div>${li(r.topicsOnly)}<label class="f">${t("topicsFor")}<select id="topSub">${G.state.subjects.concat(r.subjects.filter(x => !G.state.subjects.some(y => G.norm(y.name) === G.norm(x.name))).map(x => ({ id: "new:" + x.name, name: x.name }))).map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</select></label>` : ""}
      <div class="nav" style="margin-top:10px"><button class="cute" onclick="G.UI.applyParsed()">${t("apply")}</button></div></div>`;
  };
  UI.applyParsed = () => {
    if (!lastParsed) return;
    let sid = $("#topSub") ? $("#topSub").value : "";
    if (sid.startsWith("new:")) sid = G.findOrCreateSubject(sid.slice(4)).id;
    const r = G.applyParsed(lastParsed, sid);
    if (lastParsed.exams.length || lastParsed.topicsOnly.length) G.buildPlan();
    G.toast(t("importDone", r)); G.burst(null, 100); lastParsed = null; $("#paste").value = ""; $("#parsed").innerHTML = ""; renderHeader(); renderTabs();
  };
  UI.file = async inp => {
    const f = inp.files[0]; if (!f) return;
    try { const r = await G.readFile(f); if (r) { if (!r.full) G.buildPlan(); G.applyTheme(G.state.theme); G.toast(t("importDone", r)); G.tamaRender(); UI.refresh(); } }
    catch (e) { alert("⚠️ " + e.message); }
  };

  UI.reset = async () => { if (!confirm(t("resetConfirm"))) return; await G.reset(); G.applyTheme(G.state.theme); G.tamaRender(); viewDay = null; tarotFilter = null; UI.refresh(); onboarding(); };

  /* ================= O QUE CAI / NOTES ================= */
  function pNotes() {
    const subs = G.state.subjects;
    const body = subs.length ? `<p class="small">${t("notesHelp")}</p>` + subs.map(s => {
      const ex = G.state.exams.filter(e => e.subjectId === s.id).map(e => `📝 ${fmt(e.date)} ${esc(e.time)} ${esc(e.place)}`).join(" · ");
      return `<div class="mat" style="border-color:${esc(s.color)}"><h3>${G.petSVG(G.pet(s.petId), 40)} ${esc(s.emoji || "📚")} ${esc(s.name)}</h3>
        ${ex ? `<div class="small">${ex}</div>` : ""}
        ${s.topics.length ? `<ol>${s.topics.map(x => `<li><b>${esc(x.title)}</b>${x.detail ? ` <span class="small">— ${esc(x.detail)}</span>` : ""}</li>`).join("")}</ol>` : ""}
        ${s.notes ? `<p>🎯 ${esc(s.notes).replace(/\n/g, "<br>")}</p>` : ""}</div>`;
    }).join("") : `<p>${t("emptyPlan")}</p>`;
    $("#panel").innerHTML = win("📜 " + (G.lang === "en" ? "whats_on_the_exam.txt" : "o_que_cai.txt"), body);
  }

  /* ================= DICAS / TIPS ================= */
  function pTips() { $("#panel").innerHTML = win("🕯️ " + (G.lang === "en" ? "focus_tips.doc" : "dicas_de_foco.doc"), `<ul class="tip">${t("tipList").map(x => `<li>${x}</li>`).join("")}</ul>`) +
    win("📖 " + (G.lang === "en" ? "how_to_use.doc" : "como_usar.doc"), `<p>${t("tutorialText")}</p><div class="nav"><a class="cute" style="text-decoration:none;color:var(--ink)" href="https://github.com/sabrinadandrade/Grimorio/blob/main/docs/TUTORIAL.md" target="_blank" rel="noopener">${t("tutorialBtn")}</a></div>`); }

  /* ================= BOAS-VINDAS / ONBOARDING ================= */
  function onboarding() {
    if (G.state.onboarded) return;
    const m = document.createElement("div"); m.className = "modal";
    m.innerHTML = win("✨ " + (G.lang === "en" ? "welcome.exe" : "bem_vinda.exe"), `<div style="text-align:center">${G.state.pets.map(p => G.petSVG(p, 90, "happy")).join("")}</div>
      <h2 style="text-align:center">${t("welcome")}</h2><p>${t("welcomeText")}</p>
      <div class="row2"><label class="f">${t("yourName")}<input type="text" id="obName"></label>
      ${pronSelect("obPron")}
      <label class="f">${t("language")}<select id="obLang">${Object.keys(G.I18N).map(l => `<option value="${l}" ${l === G.lang ? "selected" : ""}>${G.I18N[l].langName}</option>`).join("")}</select></label></div>
      <div class="nav" style="justify-content:center;margin-top:10px"><button class="cute" id="obGo">${t("start")}</button><button class="cute ghost" id="obSkip">${t("skip")}</button></div>`);
    document.body.appendChild(m);
    const done = () => { G.state.onboarded = true; G.save(); m.remove(); UI.refresh(); marquee(); };
    m.querySelector("#obLang").onchange = e => { G.state.lang = G.lang = e.target.value; G.save(); m.remove(); onboarding(); };
    m.querySelector("#obGo").onclick = () => { G.state.owner.name = m.querySelector("#obName").value.trim(); const pv = m.querySelector("#obPron").value; G.state.owner.pronoun = pv; const r = PRON.find(x => x[0] === pv); if (r) G.state.owner.art = r[2]; done(); G.burst(null, 150); };
    m.querySelector("#obSkip").onclick = done;
  }
  function marquee() {
    $("#footTxt").textContent = t("footer").replace(/ ✦ open source ✦$/, " ✦");
    $("#marq").innerHTML = G.lang === "en"
      ? "🎃 ☾ ✦ welcome to your grimoire ✦ every mission is a spell ✦ your pets believe in you ✦ a few minutes of focus, then a nap ✦ 🦇 ✦ ☽ ✦ 🐾 ✦ 👻 ✦ 🎃"
      : "🎃 ☾ ✦ " + G.pw("bem-vinda", "bem-vindo", "bem-vinde") + " ao seu grimório ✦ cada missão é um feitiço ✦ seus pets acreditam em você ✦ alguns minutinhos de foco, depois sonequinha ✦ 🦇 ✦ ☽ ✦ 🐾 ✦ 👻 ✦ 🎃";
  }

  /* ================= AVISO DE INSTALAÇÃO NO IPHONE / iOS INSTALL HINT ================= */
  function iosHint() {
    const ua = navigator.userAgent || "";
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
    let dismissed = false; try { dismissed = localStorage.getItem("grimorio.iosHint") === "1"; } catch (e) { }
    if (!isIOS || standalone || dismissed || G.isNative()) return;
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV/.test(ua);
    const el = document.createElement("div"); el.className = "ioshint";
    el.innerHTML = `<div class="win" style="margin:0"><div class="bar">📱 ${G.lang === "en" ? "install.exe" : "instalar.exe"}<span class="dots"><i></i><i></i><i></i></span></div><div class="wbody">
      ${safari ? t("iosHint") : t("iosHintSafari")}<div class="nav" style="margin-top:8px"><button class="cute" id="iosOk">${t("iosOk")}</button></div></div></div>`;
    document.body.appendChild(el);
    el.querySelector("#iosOk").onclick = () => { try { localStorage.setItem("grimorio.iosHint", "1"); } catch (e) { } el.remove(); };
  }

  /* ================= INÍCIO / START ================= */
  G.start = async function () {
    G.load(); G.applyTheme(G.state.theme); document.documentElement.lang = G.lang === "pt" ? "pt-BR" : G.lang;
    G.applyA11y(); G.fxInit(); marquee(); G.tamaRender(); UI.refresh();
    document.addEventListener("click", e => { if ($("#tabs").classList.contains("open") && !e.target.closest("#tabs,#menuBtn")) UI.menu(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#tabs").classList.contains("open")) UI.menu(false); });
    // arrastar para a esquerda fecha a gaveta / swipe left closes the drawer
    let sx = null; $("#tabs").addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
    $("#tabs").addEventListener("touchend", e => { if (sx != null && sx - e.changedTouches[0].clientX > 60) UI.menu(false); sx = null; }, { passive: true });
    // proteção: recupera do IndexedDB se o localStorage foi limpo / recover from IndexedDB if needed
    if (await G.safety.recover()) { G.applyTheme(G.state.theme); G.tamaRender(); UI.refresh(); G.toast(t("recovered")); }
    else G.safety.mirror();
    onboarding(); iosHint();
    await G.safety.requestPersist(); await G.safety.initFile(); renderXP();
    G.reminders.start();
    cleanupCloud();
  };
})();
