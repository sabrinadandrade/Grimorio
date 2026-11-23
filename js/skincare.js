/* Rotina de skincare Creamy baseada no cronograma atualizado da usuária.
 * Checklist e preferências ficam apenas no armazenamento local do Grimório. */
window.G = window.G || {};
(function () {
  const esc = s => String(s ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
  const pt = () => G.lang !== "en";
  const t = (ptText, enText) => pt() ? ptText : enText;
  const days = () => pt() ? ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const date = () => G.todayIso();
  const state = () => {
    G.state.skincare = G.state.skincare || { phase4: false, phase4Ready: false, morningMoisturizer: "serum", done: {}, laser: { date: "", beard: true, txPauseDays: 5, recoveryDays: 7, recoveryConfirmed: false } };
    const s = G.state.skincare;
    s.done = s.done || {};
    s.laser = Object.assign({ date: "", beard: true, txPauseDays: 5, recoveryDays: 7, recoveryConfirmed: false }, s.laser || {});
    return s;
  };

  const PRODUCTS = {
    cleanser: ["#f3afc7", "Emulsão de Limpeza", "Lavar o rosto e secar bem."],
    tranexamic: ["#74b878", "Solução de Ácido Tranexâmico", "Aplicar 5 a 10 gotas no rosto."],
    eyes: ["#8d9097", "Eye Cream", "Aplicar com batidinhas suaves na área dos olhos."],
    serum: ["#9ed7f5", "Sérum Hidratante", "Hidratação."],
    calming: ["#d9485f", "Calming Cream", "Hidratação; nas noites de ácido, aplicar antes do ácido."],
    sunscreen: ["#f1cf45", "Protetor Solar Facial", "Usar todas as manhãs."],
    mandelic: ["#b92e66", "Ácido Mandélico 7% (AHA)", "Aplicar por último, depois do Calming Cream. Evitar pálpebras e cantos do nariz e da boca."],
    glycolic: ["#2365a5", "Ácido Glicólico 10% (AHA)", "Aplicar por último, depois do Calming Cream. Evitar pálpebras e cantos do nariz e da boca."]
  };
  const EN = {
    cleanser: ["#f3afc7", "Cleansing Emulsion", "Wash your face and dry it well."],
    tranexamic: ["#74b878", "Tranexamic Acid Solution", "Apply 5 to 10 drops to the face."],
    eyes: ["#8d9097", "Eye Cream", "Gently tap around the eye area."],
    serum: ["#9ed7f5", "Hydrating Serum", "Hydration."],
    calming: ["#d9485f", "Calming Cream", "Moisturize; on acid nights, apply before the acid."],
    sunscreen: ["#f1cf45", "Facial Sunscreen", "Use every morning."],
    mandelic: ["#b92e66", "Mandelic Acid 7% (AHA)", "Apply last, after Calming Cream. Avoid eyelids and the corners of the nose and mouth."],
    glycolic: ["#2365a5", "Glycolic Acid 10% (AHA)", "Apply last, after Calming Cream. Avoid eyelids and the corners of the nose and mouth."]
  };
  const product = id => (pt() ? PRODUCTS : EN)[id];
  const dayIndex = iso => new Date(iso + "T12:00:00").getDay();
  const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
  const laserInfo = () => {
    const l = state().laser, today = date();
    if (!l.date) return { l, daysUntil: null, post: false, acidPaused: false, txPaused: false, nearby: false };
    const until = daysBetween(today, l.date);
    const post = until <= 0 && !l.recoveryConfirmed;
    return {
      l, daysUntil: until, post,
      acidPaused: until >= 0 && until <= 7,
      txPaused: !!l.beard && until > 0 && until <= (+l.txPauseDays || 5),
      nearby: post || (until >= 0 && until <= 7)
    };
  };
  const phase4Allowed = () => {
    const li = laserInfo();
    return !li.nearby && !li.post;
  };
  const phase4Active = () => {
    const s = state();
    return !!(s.phase4 && s.phase4Ready && phase4Allowed());
  };
  const acidNight = day => {
    if (day === 2 || day === 6) return "mandelic";
    if (day === 4 || (day === 0 && phase4Active())) return "glycolic";
    return "";
  };
  const mark = (dateKey, period, id) => !!state().done[dateKey + "|" + period + "|" + id];
  const step = (dateKey, period, id, noteOverride) => {
    const [emoji, name, note] = product(id), done = mark(dateKey, period, id);
    return `<button class="skin-step ${done ? "done" : ""}" type="button" onclick="G.SkinCare.toggle('${dateKey}','${period}','${id}')" aria-pressed="${done}">
      <span class="skin-check" aria-hidden="true">${done ? "✓" : ""}</span><span class="skin-product"><b><i class="skin-swatch" style="--swatch:${emoji}" aria-hidden="true"></i> ${esc(name)}</b><small>${esc(noteOverride || note)}</small></span></button>`;
  };
  const order = (dateKey, period, ids, li) => {
    if (li.post) {
      const postIds = period === "morning" ? ["cleanser", "eyes", "calming", "sunscreen"] : ["cleanser", "eyes", "calming"];
      return postIds.map(id => step(dateKey, period, id, id === "sunscreen" ? t("Reaplicar ao longo do dia, conforme o cronograma.", "Reapply during the day, as the schedule advises.") : null)).join("");
    }
    if (period === "morning") {
      const moisturizer = state().morningMoisturizer === "calming" ? "calming" : "serum";
      const ids = ["cleanser", ...(li.txPaused ? [] : ["tranexamic"]), "eyes", moisturizer, "sunscreen"];
      return ids.map(id => step(dateKey, period, id)).join("");
    }    const acid = acidNight(dayIndex(dateKey));
    const useAcid = acid && !li.acidPaused;
    const ids = ["cleanser", ...(li.txPaused ? [] : ["tranexamic"]), "eyes", "calming", ...(useAcid ? [acid] : [])];
    return ids.map(id => step(dateKey, period, id)).join("");
  };
  const nightFocus = (d, li) => {
    if (li.post) return t("Pós-laser · rotina suave", "Post-laser · gentle routine");
    if (li.acidPaused) return t("Recuperação pré-laser", "Pre-laser recovery");
    const acid = acidNight(d);
    if (!acid) return t("Recuperação", "Recovery");
    return product(acid)[1];
  };
  const laserNotice = li => {
    if (!li.l.date) return `<p class="small">${t("Cadastre a data do laser abaixo para o Grimório sinalizar as pausas previstas no cronograma.", "Add your laser date below so the Grimoire can show the pauses in the schedule.")}</p>`;
    if (li.post) {
      const elapsed = -li.daysUntil, ready = elapsed >= (+li.l.recoveryDays || 7);
      return `<div class="skin-alert"><b>${t("Protocolo pós-laser ativo", "Post-laser protocol active")}</b><p>${t(`Use apenas Emulsão + Eye Cream + Calming Cream + Protetor Solar por ${li.l.recoveryDays} dias, reaplicando o protetor ao longo do dia. Retome os ácidos somente quando a pele estiver totalmente calma.`, `Use only Cleansing Emulsion + Eye Cream + Calming Cream + Sunscreen for ${li.l.recoveryDays} days, reapplying sunscreen during the day. Resume acids only when your skin is fully calm.`)}</p>
        ${ready ? `<label class="skin-confirm"><input type="checkbox" onchange="G.SkinCare.confirmRecovery(this.checked)"> ${t("Já passaram os dias de pausa e minha pele está totalmente calma", "The pause period has passed and my skin is fully calm")}</label>` : `<p class="small">${t(`Dia ${elapsed} de ${li.l.recoveryDays} do período de recuperação.`, `Day ${elapsed} of ${li.l.recoveryDays} in the recovery period.`)}</p>`}</div>`;
    }
    if (li.daysUntil > 0 && li.daysUntil <= 7) {
      const tx = li.txPaused ? t("O tranexâmico também está pausado na área da barba.", "Tranexamic acid is also paused on the beard area.") : "";
      return `<div class="skin-alert"><b>${t("Pausa pré-laser", "Pre-laser pause")}</b><p>${t(`Faltam ${li.daysUntil} dias. Suspenda mandélico e glicólico a partir de 7 dias antes do laser. ${tx}`, `Laser is in ${li.daysUntil} days. Pause mandelic and glycolic acids starting 7 days before. ${tx}`)}</p></div>`;
    }
    return `<p class="small">${t("Laser agendado para", "Laser scheduled for")} <b>${esc(li.l.date)}</b>.</p>`;
  };
  const renderLaserForm = l => `<div class="skin-laser-form">
    <label class="f">${t("Data da sessão", "Session date")}<input id="skinLaserDate" type="date" value="${esc(l.date)}"></label>
    <label class="f">${t("Pausa do tranexâmico na área da barba", "Pause tranexamic acid on the beard area")}<select id="skinTxPause">${[3,4,5].map(n => `<option value="${n}" ${+l.txPauseDays === n ? "selected" : ""}>${n} ${t("dias antes", "days before")}</option>`).join("")}</select></label>
    <label class="f">${t("Rotina suave após o laser", "Gentle routine after laser")}<select id="skinRecoveryDays">${[3,4,5,6,7].map(n => `<option value="${n}" ${+l.recoveryDays === n ? "selected" : ""}>${n} ${t("dias", "days")}</option>`).join("")}</select></label>
    <label class="skin-confirm"><input id="skinLaserBeard" type="checkbox" ${l.beard ? "checked" : ""}> ${t("O laser inclui a área da barba/rosto", "Laser includes the beard/face area")}</label>
    <div class="nav"><button class="cute" onclick="G.SkinCare.saveLaser()">${t("Salvar data do laser", "Save laser date")}</button>${l.date ? `<button class="cute ghost" onclick="G.SkinCare.clearLaser()">${t("Remover sessão", "Remove session")}</button>` : ""}</div>
  </div>`;
  const render = () => {
    const s = state(), today = date(), day = dayIndex(today), weekday = days(), li = laserInfo();
    const phase4 = phase4Active();
    const weekRows = [1,2,3,4,5,6,0].map(d => {
      let acid = acidNight(d);
      if (li.acidPaused || li.post) acid = "";
      const focus = li.post ? t("Pós-laser · rotina suave", "Post-laser · gentle routine") : li.acidPaused ? t("Recuperação pré-laser", "Pre-laser recovery") : acid ? product(acid)[1] : t("Recuperação", "Recovery");
      return `<div class="skin-day ${d === day ? "is-today" : ""}"><b>${esc(weekday[d])}</b><span>${esc(focus)}</span></div>`;
    }).join("");
    const readyControl = phase4Allowed()
      ? `<label class="skin-confirm"><input type="checkbox" ${s.phase4Ready ? "checked" : ""} onchange="G.SkinCare.setPhase4Ready(this.checked)"> ${t("Minha pele está confortável e sem descamação", "My skin feels comfortable and is not peeling")}</label>
         <label class="skin-confirm"><input type="checkbox" ${s.phase4 ? "checked" : ""} ${s.phase4Ready ? "" : "disabled"} onchange="G.SkinCare.setPhase4(this.checked)"> ${t("Ativar a semana 4: glicólico extra no domingo", "Enable week 4: extra glycolic night on Sunday")}</label>`
      : `<p class="small">${t("A semana 4 fica indisponível durante a pausa ou recuperação do laser.", "Week 4 is unavailable during the laser pause or recovery period.")}</p>`;
    const progress = (period, ids, recoveryMode) => {
      const count = ids.filter(id => mark(today, period, id)).length;
      return `<p class="small">${count}/${ids.length} ${t("passos concluídos", "steps complete")}</p>`;
    };
    const moisturizer = s.morningMoisturizer === "calming" ? "calming" : "serum";
    const mIds = li.post ? ["cleanser","eyes","calming","sunscreen"] : ["cleanser",...(li.txPaused?[]:["tranexamic"]),"eyes",moisturizer,"sunscreen"];
    const nightAcid = acidNight(day);
    const nIds = li.post ? ["cleanser","eyes","calming"] : ["cleanser",...(li.txPaused?[]:["tranexamic"]),"eyes","calming",...(nightAcid && !li.acidPaused?[nightAcid]:[])];
    return `<div class="skin-page">
      <section class="win"><div class="bar">🧴 ${t("rotina_de_skincare.exe", "skincare_routine.exe")}<span class="dots"><i></i><i></i><i></i></span></div><div class="wbody">
        <h2>${t("Rotina de hoje", "Today's routine")}</h2><p><b>${esc(weekday[day])} · ${esc(today)}</b></p>
        <p class="small">${t("Cronograma Creamy atualizado · foco em clareamento e uniformização, com protocolo para laser facial.", "Updated Creamy schedule · tone-evening focus, with a facial laser protocol.")}</p>
        ${laserNotice(li)}
        <p class="skin-safety">${t("Nunca combine mandélico e glicólico na mesma noite. Use o protetor solar todas as manhãs. Siga as orientações do profissional que fará o laser.", "Never combine mandelic and glycolic acids on the same night. Use sunscreen every morning. Follow the instructions of your laser provider.")}</p>
      </div></section>
      <section class="win"><div class="bar">☀️ ${t("manhã.exe", "morning.exe")}<span class="dots"><i></i><i></i><i></i></span></div><div class="wbody">
        <p class="small">${li.post ? t("Pos-laser - rotina suave", "Post-laser - gentle routine only") : t("Todos os dias - ordem do cronograma", "Every day - schedule order")}</p>
        ${!li.post ? `<label class="f">${t("Escolha sua hidratacao", "Choose moisturizer")}<select onchange="G.SkinCare.setMorningMoisturizer(this.value)"><option value="serum" ${moisturizer === "serum" ? "selected" : ""}>${product("serum")[1]}</option><option value="calming" ${moisturizer === "calming" ? "selected" : ""}>Calming Cream</option></select></label>` : ""}
        ${progress("morning", mIds)}${order(today,"morning",mIds,li)}
      </div></section>
      <section class="win"><div class="bar">🌙 ${t("noite.exe", "evening.exe")}<span class="dots"><i></i><i></i><i></i></span></div><div class="wbody">
        <p class="small"><b>${esc(nightFocus(day,li))}</b> · ${t("hidratante antes do ácido", "moisturizer before acid")}</p>${progress("night", nIds)}${order(today,"night",nIds,li)}
      </div></section>
      <section class="win"><div class="bar">📅 ${t("cronograma_semanal.exe", "weekly_schedule.exe")}<span class="dots"><i></i><i></i><i></i></span></div><div class="wbody">
        <div class="skin-week">${weekRows}</div><p class="small">${phase4 ? t("Semana 4 ativa: domingo com glicólico adicional.", "Week 4 active: extra glycolic night on Sunday.") : t("Semanas 1 a 3: adaptação conforme o cronograma.", "Weeks 1 to 3: adaptation schedule.")}</p>
        <h3>${t("Evolução para a semana 4", "Progression to week 4")}</h3><p class="small">${t("Só ative se a pele estiver confortável, sem descamação e sem laser próximo.", "Enable only if your skin feels comfortable, is not peeling, and no laser is near.")}</p>${readyControl}
      </div></section>
      <section class="win"><div class="bar">⚡ ${t("laser_facial.exe", "facial_laser.exe")}<span class="dots"><i></i><i></i><i></i></span></div><div class="wbody">
        <p>${t("O cronograma recomenda suspender os ácidos 7 dias antes. De 3 a 5 dias antes, pausar também o tranexâmico na área da barba. Após o laser, usar apenas Emulsão, Eye Cream, Calming Cream e Protetor Solar por 3 a 7 dias; retomar os ácidos somente com a pele totalmente calma.", "The schedule recommends pausing acids 7 days before. From 3 to 5 days before, also pause tranexamic acid on the beard area. After laser, use only Cleansing Emulsion, Eye Cream, Calming Cream and Sunscreen for 3 to 7 days; resume acids only when skin is fully calm.")}</p>
        ${renderLaserForm(s.laser)}
      </div></section>
    </div>`;
  };
  G.SkinCare = {
    render,
    toggle(iso, period, id) { const s=state(), k=iso+"|"+period+"|"+id; if(s.done[k]) delete s.done[k]; else s.done[k]=true; G.save(); G.UI.refresh(); },
    setPhase4Ready(value) { const s=state(); s.phase4Ready=!!value; if(!value) s.phase4=false; G.save(); G.UI.refresh(); },
    setPhase4(value) { const s=state(); s.phase4=!!value && !!s.phase4Ready && phase4Allowed(); G.save(); G.UI.refresh(); },
    setMorningMoisturizer(value) { state().morningMoisturizer=value === "calming" ? "calming" : "serum"; G.save(); G.UI.refresh(); },
    saveLaser() {
      const dateValue=document.querySelector("#skinLaserDate")?.value || "";
      if (!dateValue) { G.toast(t("Escolha a data da sessão de laser.", "Choose the laser session date.")); return; }
      const s=state(); s.laser={ date:dateValue, beard:!!document.querySelector("#skinLaserBeard")?.checked, txPauseDays:+document.querySelector("#skinTxPause")?.value || 5, recoveryDays:+document.querySelector("#skinRecoveryDays")?.value || 7, recoveryConfirmed:false };
      G.save(); G.UI.refresh();
    },
    clearLaser() { const s=state(); s.laser={date:"",beard:true,txPauseDays:5,recoveryDays:7,recoveryConfirmed:false}; G.save(); G.UI.refresh(); },
    confirmRecovery(value) { if(value) state().laser.recoveryConfirmed=true; G.save(); G.UI.refresh(); }
  };
})();
