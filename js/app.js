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
  }
  function renderXP() {
    const lv = Math.floor(G.state.xp / 100) + 1, rest = G.state.xp % 100, L = t("levels");
    const all = allTasks(), f = all.length ? all.filter(x => x.done).length / all.length : 0;
    $("#xpbox").innerHTML = `<div><b>${t("level")} ${lv} · ${L[Math.min(lv - 1, L.length - 1)]}</b> · ${G.state.xp} ${t("xp")} · 🕯️ ${G.state.pomos} ${t("candles")}</div>
      <div class="xpbar"><div class="xpfill" style="width:${rest}%"></div></div><div class="small" style="color:var(--onBg)">${t("toNext", { n: 100 - rest })}</div>
      <div style="margin-top:4px">${t("moonOfTerm")}: ${moonOf(f)} ${Math.round(f * 100)}% ${t("ofSpells")}</div>
      <div style="margin-top:4px"><button class="cute ghost" style="padding:2px 10px;font-size:.78rem" onclick="G.UI.show('data')">${G.cloud && G.cloud.user ? t("badgeCloud") : G.safety && G.safety.fileStatus === "on" ? t("badgeFile") : t("badgeLocal")}</button></div>`;
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
  const TABS = ["today", "cal", "tarot", "notes", "subjects", "pets", "look", "data", "tips"];
  function renderTabs() {
    const pets = G.state.pets;
    $("#tabs").innerHTML = TABS.map((k, i) => {
      const p = pets[i % Math.max(1, pets.length)];
      return `<button class="tab ${k === tab ? "on" : ""}" data-tab="${k}">${p ? G.petSVG(p, 32, k === tab ? "happy" : "ok") : ""}${t("tabs." + k)}</button>`;
    }).join("");
    document.querySelectorAll(".tab").forEach(b => b.onclick = () => UI.show(b.dataset.tab));
  }
  UI.show = k => { tab = k; renderTabs(); renderPanel(); window.scrollTo({ top: $("#tabs").offsetTop - 10, behavior: "smooth" }); };
  function renderPanel() {
    const P = { today: pToday, cal: pCal, tarot: pTarot, notes: pNotes, subjects: pSubjects, pets: pPets, look: pLook, data: pData, tips: pTips };
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
    if (!G.state.subjects.length && !keys.length) {
      $("#panel").innerHTML = win("✦ " + t("tabs.today").toLowerCase().replace(/ /g, "_") + ".exe", `<p>${t("emptyPlan")}</p><div class="nav">
        <button class="cute" onclick="G.UI.show('subjects')">📚 ${t("goSubjects")}</button><button class="cute alt" onclick="G.UI.show('data')">🎓 ${t("goImport")}</button>
</div>`);
      return;
    }
    const tasks = P[viewDay] || [], n = tasks.filter(x => x.done).length;
    const remind = G.safety && G.safety.needsReminder() ? `<div class="found" style="background:var(--accent);display:flex;gap:10px;align-items:center;flex-wrap:wrap">${t("reminder")}<button class="cute ghost" onclick="G.UI.show('data')">${t("reminderBtn")}</button></div>` : "";
    const isExam = tasks.some(x => x.kind === "exam");
    const allDays = [...new Set(keys.concat([td]))].sort(), idx = allDays.indexOf(viewDay);
    const body = remind + `<div class="nav"><button class="cute" ${idx <= 0 ? "disabled" : ""} onclick="G.UI.go(-1)">${t("before")}</button>
      <button class="cute" onclick="G.UI.goto('${td}')">${t("today")}</button><button class="cute" ${idx >= allDays.length - 1 ? "disabled" : ""} onclick="G.UI.go(1)">${t("after")}</button></div>
      <div class="daytitle"><span class="pill">${viewDay === td ? t("todayTag") : fmt(viewDay).toUpperCase()}</span><h2 style="margin:0">${esc(G.dayTitle(viewDay))}</h2><span style="font-size:1.6rem">${isExam ? "📝" : moonOf(tasks.length ? n / tasks.length : 0)}</span></div>
      <p class="small">${isExam ? t("examHelp") : tasks.length ? t("spellHelp") : t("noPlan")}</p>
      ${tasks.map(x => taskHTML(x)).join("")}
      <div class="row2" style="grid-template-columns:2fr 1fr auto;align-items:end">
        <label class="f">${t("taskTitle")}<input type="text" id="newTask" placeholder="✨"></label>
        <label class="f">${t("subject")}<select id="newTaskSub">${subjOptions("")}</select></label>
        <button class="cute alt" onclick="G.UI.addTask()">${t("addTask")}</button></div>`;
    $("#panel").innerHTML = win("✦ " + (G.lang === "en" ? "todays_spells.exe" : "feiticos_de_hoje.exe"), body);
    $("#newTask").onkeydown = e => { if (e.key === "Enter") UI.addTask(); };
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
  UI.go = d => { const keys = [...new Set(Object.keys(G.state.plan).concat([G.todayIso()]))].sort(); const i = keys.indexOf(viewDay) + d; if (keys[i]) { viewDay = keys[i]; pToday(); } };
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
  UI.knew = el => { if (!curCard) return; curCard.miss = Math.max(0, (curCard.miss || 0) - 1); G.addXP(5); G.burst(el, 30); UI.nextCard(); };
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
    const arts = G.lang === "en" ? "" : `<label class="f">${t("article")}<select onchange="G.UI.owner('art',this.value)">${["da", "do", "de", ""].map(a => `<option ${a === G.state.owner.art ? "selected" : ""} value="${a}">${a || "—"}</option>`).join("")}</select></label>`;
    $("#panel").innerHTML =
      win("👑 " + t("owner").toLowerCase().replace(/ /g, "_") + ".exe", `<div class="row2"><label class="f">${t("yourName")}<input type="text" value="${esc(G.state.owner.name)}" oninput="G.UI.owner('name',this.value)"></label>${arts}
        <label class="f">${t("language")}<select onchange="G.UI.lang(this.value)">${Object.keys(G.I18N).map(l => `<option value="${l}" ${l === G.lang ? "selected" : ""}>${G.I18N[l].langName}</option>`).join("")}</select></label></div>
        <p class="small">→ <b>${esc(G.pageTitle())}</b></p>`) +
      win("🎨 " + (G.lang === "en" ? "colors.exe" : "cores.exe"), `<h3>${t("preset")}</h3><div class="swatches">${sw}</div><h3>${t("custom")}</h3><div class="row2" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">${pick}</div>
        <div class="nav"><button class="cute ghost" onclick="G.UI.preset('${th.preset}')">↺ reset</button></div>`) +
      win("🥚 " + (G.lang === "en" ? "virtual_pet.exe" : "bichinho_virtual.exe"), `<h3>${t("tamaShape")}</h3><div class="shapes">${shapes}</div>`);
  }
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
    $("#panel").innerHTML = cloudWin() + safetyWin() +
      win("🎓 " + (G.lang === "en" ? "connect_school.exe" : "conectar_faculdade.exe"), `<h3>${t("institution")}</h3><div class="conns">${conns}</div>
        <div class="found"><b>${t("connectorHelp")}:</b><br>${c.help[G.lang] || c.help.pt}</div>
        <textarea id="paste" style="min-height:150px" placeholder="${t("pasteHere")}"></textarea>
        <div class="nav" style="margin-top:8px"><button class="cute" onclick="G.UI.analyze()">${t("analyze")}</button></div><div id="parsed"></div>
        <p class="small">${t("privacy")}<br>${t("newConnector")}</p>`) +
      win("💾 " + (G.lang === "en" ? "files.exe" : "arquivos.exe"), `<div class="nav">
        <label class="cute alt" style="display:inline-block">${t("importFile")}<input type="file" accept=".json,.csv,.ics" style="display:none" onchange="G.UI.file(this)"></label>
        <button class="cute" onclick="G.exportJSON()">${t("exportJson")}</button><button class="cute ghost" onclick="G.download('grimorio-modelo.csv',G.csvTemplate(),'text/csv')">${t("csvTemplate")}</button>
<button class="cute danger" onclick="G.UI.reset()">${t("resetAll")}</button></div>
        <p class="small">${t("privacy")}</p>`);
    fillSnaps();
  }
  const when = ts => ts ? new Date(ts).toLocaleString(G.lang === "en" ? "en-US" : "pt-BR", { dateStyle: "short", timeStyle: "short" }) : t("never");
  function cloudWin() {
    const C = G.cloud;
    let body;
    if (!C.configured()) {
      body = `<p class="small">${t("cloudOffInfo")}</p>`;
    } else if (!C.user) {
      body = `<div class="row2" style="grid-template-columns:2fr auto;align-items:end"><label class="f">${t("cloudEmail")}<input type="text" id="cEmail" inputmode="email" autocomplete="email" placeholder="voce@email.com" value="${esc(UI._email || "")}"></label>
        <button class="cute" onclick="G.UI.cloudSignIn()">${t("cloudSend")}</button></div>
        ${UI._email ? `<div class="row2" style="grid-template-columns:1fr auto;align-items:end"><label class="f">${t("cloudCode")}<input type="text" id="cCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456"></label>
        <button class="cute alt" onclick="G.UI.cloudCode()">${t("cloudEnter")}</button></div><p class="small">${t("cloudCodeHelp")}</p>` : ""}`;
    } else {
      body = `<p>☁️ ${t("cloudSignedAs", { e: esc(C.user.email || "") })}</p><p class="small">${t("cloudLast", { d: when(C.lastSync) })}</p>
        <div class="nav"><button class="cute" onclick="G.cloud.sync()">${t("cloudSyncNow")}</button><button class="cute ghost" onclick="G.cloud.signOut()">${t("cloudSignOut")}</button></div>`;
    }
    if (C.status === "offline") body += `<p class="small">${t("cloudOffline")}</p>`;
    if (C.status === "error") body += `<p class="small">${t("cloudErr", { e: esc(C.error) })}</p>`;
    const cc = C.config();
    body += `<details style="margin-top:8px"><summary class="small">${t("cloudAdvanced")}</summary><div class="row2"><label class="f">${t("cloudUrl")}<input type="text" id="cUrl" value="${esc(cc.url)}" placeholder="https://xxxx.supabase.co"></label>
      <label class="f">${t("cloudKey")}<input type="text" id="cKey" value="${esc(cc.key)}"></label></div><button class="cute ghost" onclick="G.UI.cloudCfg()">${t("cloudSaveCfg")}</button></details>`;
    return win("☁️ " + (G.lang === "en" ? "cloud.exe" : "nuvem.exe") + " · " + t("cloud"), body, "cloudWin");
  }
  function safetyWin() {
    const S = G.safety;
    const fileTxt = { on: t("fileOn"), paused: t("filePaused"), off: t("fileOff"), unsupported: t("fileUnsupported") }[S.fileStatus] || "";
    const fileBtn = S.fileStatus === "on" ? `<button class="cute ghost" onclick="G.UI.fileOff()">${t("fileDisable")}</button>`
      : S.fileStatus === "paused" ? `<button class="cute" onclick="G.UI.fileResume()">${t("fileResume")}</button>`
      : S.fileStatus === "off" ? `<button class="cute" onclick="G.UI.fileOn()">${t("fileEnable")}</button>` : "";
    return win("🛡️ " + (G.lang === "en" ? "data_protection.exe" : "protecao_dos_dados.exe"), `<p class="small">${S.persisted ? t("persistOn") : t("persistOff")}</p>
      <h3>💾 ${t("fileBackup")}</h3><p class="small">${fileTxt}</p><div class="nav">${fileBtn}<button class="cute alt" onclick="G.UI.exportNow()">${t("exportJson")}</button></div>
      <p class="small">${t("lastBackup", { d: when(G.state.lastBackupAt) })}</p>
      <details id="snaps"><summary class="small">${t("snapshots")}</summary><div id="snapList" class="small">…</div></details>`, "safetyWin");
  }
  UI.cloudChanged = () => { renderXP(); if (tab === "data" && $("#cloudWin")) $("#cloudWin").outerHTML = cloudWin(); };
  UI.cloudSignIn = async () => { const e = ($("#cEmail").value || "").trim(); if (!/.+@.+\..+/.test(e)) return; try { await G.cloud.signIn(e); UI._email = e; G.toast(t("cloudSent")); UI.cloudChanged(); setTimeout(() => $("#cCode") && $("#cCode").focus(), 100); } catch (err) { alert("⚠️ " + (err.message || err)); } };
  UI.cloudCode = async () => { const c = ($("#cCode").value || "").trim(); if (c.replace(/\D/g, "").length < 6) return; try { await G.cloud.verifyCode(UI._email, c); UI._email = ""; G.toast("☁️ ✨"); G.burst(null, 100); UI.cloudChanged(); } catch (err) { alert("⚠️ " + t("cloudBadCode") + "\n" + (err.message || err)); } };
  UI.cloudCfg = async () => { const u = $("#cUrl").value, k = $("#cKey").value; if ((u || k) && !G.cloud.validCustom(u, k)) { alert(t("cloudBadCfg")); return; } G.cloud.setCustom(u, k); G.cloud.client = null; await G.cloud.init(); pData(); };
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
  function pTips() { $("#panel").innerHTML = win("🕯️ " + (G.lang === "en" ? "focus_tips.doc" : "dicas_de_foco.doc"), `<ul class="tip">${t("tipList").map(x => `<li>${x}</li>`).join("")}</ul>`); }

  /* ================= BOAS-VINDAS / ONBOARDING ================= */
  function onboarding() {
    if (G.state.onboarded) return;
    const m = document.createElement("div"); m.className = "modal";
    m.innerHTML = win("✨ " + (G.lang === "en" ? "welcome.exe" : "bem_vinda.exe"), `<div style="text-align:center">${G.state.pets.map(p => G.petSVG(p, 90, "happy")).join("")}</div>
      <h2 style="text-align:center">${t("welcome")}</h2><p>${t("welcomeText")}</p>
      <div class="row2"><label class="f">${t("yourName")}<input type="text" id="obName"></label>
      ${G.lang === "en" ? "" : `<label class="f">${t("article")}<select id="obArt"><option>da</option><option>do</option><option>de</option></select></label>`}
      <label class="f">${t("language")}<select id="obLang">${Object.keys(G.I18N).map(l => `<option value="${l}" ${l === G.lang ? "selected" : ""}>${G.I18N[l].langName}</option>`).join("")}</select></label></div>
      <div class="nav" style="justify-content:center;margin-top:10px"><button class="cute" id="obGo">${t("start")}</button><button class="cute ghost" id="obSkip">${t("skip")}</button></div>`);
    document.body.appendChild(m);
    const done = () => { G.state.onboarded = true; G.save(); m.remove(); UI.refresh(); marquee(); };
    m.querySelector("#obLang").onchange = e => { G.state.lang = G.lang = e.target.value; G.save(); m.remove(); onboarding(); };
    m.querySelector("#obGo").onclick = () => { G.state.owner.name = m.querySelector("#obName").value.trim(); const a = m.querySelector("#obArt"); if (a) G.state.owner.art = a.value; done(); G.burst(null, 150); };
    m.querySelector("#obSkip").onclick = done;
  }
  function marquee() {
    $("#footTxt").textContent = t("footer").replace(/ ✦ open source ✦$/, " ✦");
    $("#marq").innerHTML = G.lang === "en"
      ? "🎃 ☾ ✦ welcome to your study grimoire ✦ every mission is a spell ✦ your pets believe in you ✦ a few minutes of focus, then a nap ✦ 🦇 ✦ ☽ ✦ 🐾 ✦ 👻 ✦ 🎃"
      : "🎃 ☾ ✦ bem-vinda(o) ao seu grimório de estudos ✦ cada missão é um feitiço ✦ seus pets acreditam em você ✦ alguns minutinhos de foco, depois sonequinha ✦ 🦇 ✦ ☽ ✦ 🐾 ✦ 👻 ✦ 🎃";
  }

  /* ================= INÍCIO / START ================= */
  G.start = async function () {
    G.load(); G.applyTheme(G.state.theme); document.documentElement.lang = G.lang === "pt" ? "pt-BR" : G.lang;
    G.fxInit(); marquee(); G.tamaRender(); UI.refresh();
    // proteção: recupera do IndexedDB se o localStorage foi limpo / recover from IndexedDB if needed
    if (await G.safety.recover()) { G.applyTheme(G.state.theme); G.tamaRender(); UI.refresh(); G.toast(t("recovered")); }
    else G.safety.mirror();
    onboarding();
    await G.safety.requestPersist(); await G.safety.initFile(); renderXP();
    G.cloud.init();
  };
})();
