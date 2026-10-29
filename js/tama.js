/* Bichinho virtual (timer de foco) / virtual pet focus timer
 * Formatos da casca em G.TAMA_SHAPES. Para criar um formato: path SVG + caixa da tela + altura dos botões.
 * Shell shapes live in G.TAMA_SHAPES: an SVG path + screen box + button row height. */
window.G = window.G || {};
(function () {
  function starPath(cx, cy, R, r) {
    let d = "";
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; d += (i ? "L" : "M") + (cx + rr * Math.cos(a)).toFixed(1) + " " + (cy + rr * Math.sin(a)).toFixed(1) + " "; }
    return d + "Z";
  }
  G.TAMA_SHAPES = {
    egg: { vb: [200, 240], path: "M100 8 C160 8 192 90 192 150 C192 205 150 232 100 232 C50 232 8 205 8 150 C8 90 40 8 100 8Z", scr: [38, 54, 124, 112], btn: 180, deco: "🌙" },
    heart: { vb: [200, 230], path: "M100 222 C40 176 6 138 6 82 C6 38 38 10 74 10 C88 10 98 18 100 30 C102 18 112 10 126 10 C162 10 194 38 194 82 C194 138 160 176 100 222Z", scr: [44, 40, 112, 100], btn: 150, deco: "💕" },
    hat: { vb: [200, 250], path: "M24 214 C42 150 72 62 124 6 C138 40 162 120 176 214 Z M4 214 A96 26 0 1 0 196 214 A96 26 0 1 0 4 214 Z", scr: [50, 118, 112, 76], btn: 206, compact: true, deco: "" },
    star: { vb: [200, 222], path: starPath(100, 118, 106, 66), scr: [52, 74, 96, 82], btn: 160, compact: true, deco: "" },
    moon: { vb: [200, 220], path: "M100 14 A96 96 0 1 1 99.9 14 Z", scr: [42, 48, 116, 100], btn: 156, deco: "", craters: true }
  };

  let mode = 0, phase = "focus", left = 0, tick = null, petId = null, label = "";
  const modes = () => [[+G.state.settings.focus || 25, +G.state.settings.pause || 5], [15, 5], [45, 10]];
  const $ = s => document.querySelector(s);

  G.tamaRender = function () {
    const sh = G.TAMA_SHAPES[G.state.tamaShape] || G.TAMA_SHAPES.egg, [W, H] = sh.vb, el = $("#tama");
    const pct = (v, t) => (v / t * 100) + "%";
    const craters = sh.craters ? `<g fill="var(--primary2)" opacity=".55"><circle cx="150" cy="70" r="12"/><circle cx="166" cy="120" r="7"/><circle cx="40" cy="170" r="9"/><circle cx="150" cy="178" r="6"/></g>` : "";
    const band = G.state.tamaShape === "hat" ? `<path d="M40 196 Q100 182 166 196 L170 212 Q100 198 34 212 Z" fill="var(--accent2)" stroke="var(--ink)" stroke-width="3"/>` : "";
    el.classList.toggle("mini", !!G.state.tamaMin);
    if (G.state.tamaMin) { // minimizado: só uma bolinha com o pet (e o tempo, se estiver contando)
      el.style.aspectRatio = ""; el.style.width = "";
      el.innerHTML = `<button class="tmini" id="tmini" aria-label="${G.t("tamaOpen")}" title="${G.t("tamaOpen")}"><span id="tcat"></span><span class="tmt" id="tm"></span></button>`;
      $("#tmini").onclick = () => G.tamaMinToggle();
      if (!left) left = modes()[mode][0] * 60;
      draw(); return;
    }
    el.style.aspectRatio = W + "/" + H;
    el.innerHTML = `<svg class="shell" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><radialGradient id="tg" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="var(--primary)" stop-opacity="1"/><stop offset="1" stop-color="var(--primary2)"/></radialGradient></defs>
      <path d="${sh.path}" fill="url(#tg)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" fill-rule="nonzero"/>${craters}${band}</svg>
      ${sh.deco ? `<span class="chain">${sh.deco}</span>` : ""}
      <button class="tsz tminus" id="tminus" title="${G.t("tamaSmaller")}" aria-label="${G.t("tamaSmaller")}">−</button>
      <button class="tsz tplus" id="tplus" title="${G.t("tamaBigger")}" aria-label="${G.t("tamaBigger")}">+</button>
      <button class="tsz tmin" id="tmin" title="${G.t("tamaMin")}" aria-label="${G.t("tamaMin")}">▾</button>
      <div class="scr ${sh.compact ? "compact" : ""}" style="left:${pct(sh.scr[0], W)};top:${pct(sh.scr[1], H)};width:${pct(sh.scr[2], W)};height:${pct(sh.scr[3], H)}">
        <div id="tcat"></div><div class="md" id="tmode"></div><div class="tm" id="tm"></div><div class="lbl" id="tlbl"></div></div>
      <div class="row" style="top:${pct(sh.btn, H)}"><button id="tplay">▶</button><button id="treset">↺</button><button id="tlen"></button></div>`;
    $("#tplay").onclick = () => { if (tick) { clearInterval(tick); tick = null; } else tick = setInterval(step, 1000); draw(); };
    $("#treset").onclick = () => { clearInterval(tick); tick = null; phase = "focus"; left = modes()[mode][0] * 60; draw(); };
    $("#tlen").onclick = () => { mode = (mode + 1) % 3; if (!tick) { phase = "focus"; left = modes()[mode][0] * 60; } draw(); };
    $("#tminus").onclick = () => G.tamaScale(-1);
    $("#tplus").onclick = () => G.tamaScale(1);
    $("#tmin").onclick = () => G.tamaMinToggle();
    applyScale();
    $("#tcat").onclick = () => { draw("happy"); G.bubble($("#tcat"), G.phrase()); setTimeout(() => draw(), 1500); };
    if (!left) left = modes()[mode][0] * 60;
    draw();
  };
  G.tamaMinToggle = () => { G.state.tamaMin = !G.state.tamaMin; G.save({ keepTime: true }); G.tamaRender(); };
  function draw(mood) {
    if (!$("#tm")) return;
    if (G.state.tamaMin) {
      const pet = G.pet(petId) || G.state.pets[0];
      $("#tcat").innerHTML = pet ? G.petSVG(pet, 44, phase === "pause" ? "sleep" : tick ? "ok" : "happy") : "";
      $("#tm").textContent = tick ? G.pad2(Math.floor(left / 60)) + ":" + G.pad2(left % 60) : "";
      $("#tmini").classList.toggle("on", !!tick);
      document.title = (tick ? `${$("#tm").textContent} ${phase === "focus" ? "🕯️" : "😴"} · ` : "") + G.pageTitle();
      return;
    }
    $("#tm").textContent = G.pad2(Math.floor(left / 60)) + ":" + G.pad2(left % 60);
    $("#tmode").textContent = phase === "focus" ? (tick ? G.t("focusing") : G.t("focusLabel")) : G.t("napping");
    $("#tplay").textContent = tick ? "❚❚" : "▶"; $("#tlen").textContent = modes()[mode][0];
    $("#tlbl").textContent = label || G.t("pick");
    const pet = G.pet(petId); const compact = (G.TAMA_SHAPES[G.state.tamaShape] || {}).compact;
    $("#tcat").innerHTML = pet ? G.petSVG(pet, compact ? 40 : 58, mood || (phase === "pause" ? "sleep" : tick ? "ok" : "happy")) : "";
    document.title = (tick ? `${$("#tm").textContent} ${phase === "focus" ? "🕯️" : "😴"} · ` : "") + G.pageTitle();
  }
  function beep() {
    try { const a = new (window.AudioContext || window.webkitAudioContext)();[659, 784, 988].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = "triangle"; o.frequency.value = f; o.connect(g); g.connect(a.destination); const t = a.currentTime + i * .18; g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.start(t); o.stop(t + .3); }); } catch (e) { }
  }
  function step() {
    left--;
    if (left <= 0) {
      beep();
      if (phase === "focus") { G.state.pomos++; G.addXP(10); G.burst($("#tama"), 80); G.toast(G.t("candleDone")); phase = "pause"; left = modes()[mode][1] * 60; }
      else { G.toast(G.t("wakeUp")); phase = "focus"; left = modes()[mode][0] * 60; clearInterval(tick); tick = null; }
    }
    draw();
  }
  G.startFocus = function (text, pid) {
    label = text; petId = pid || petId; clearInterval(tick); phase = "focus"; left = modes()[mode][0] * 60;
    tick = setInterval(step, 1000); draw(); G.toast(G.t("candleLit"));
  };
  G.tamaRedraw = () => draw();
  /* tamanho livre do bichinho / user-defined size */
  const defScale = () => innerWidth < 600 ? 0.75 : 1;
  function applyScale() {
    const el = $("#tama"); if (!el) return;
    const s = G.state.tamaScale || defScale();
    el.style.width = Math.round(200 * s) + "px";
    el.style.setProperty("--bt", Math.max(40, Math.round(46 * Math.min(s, 1.3))) + "px");
    el.style.setProperty("--fs", s);
  }
  G.tamaScale = d => {
    const s = G.state.tamaScale || defScale();
    G.state.tamaScale = Math.round(Math.max(0.6, Math.min(1.8, s + d * 0.15)) * 100) / 100;
    G.save(); applyScale();
  };
})();
