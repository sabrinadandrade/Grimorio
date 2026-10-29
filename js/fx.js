/* Efeitos visuais / visual effects: toast, balão de fala, chuva de estrelas, rastro do mouse */
window.G = window.G || {};
(function () {
  G.toast = function (t) {
    document.querySelectorAll(".toast").forEach(x => x.remove()); // um aviso por vez / one toast at a time
    const el = document.createElement("div"); el.className = "toast"; el.textContent = t;
    document.body.appendChild(el); setTimeout(() => el.remove(), 2300);
  };
  G.bubble = function (el, txt) {
    document.querySelectorAll(".bubble").forEach(b => b.remove());
    const r = el.getBoundingClientRect(), b = document.createElement("div");
    b.className = "bubble"; b.textContent = txt; document.body.appendChild(b);
    b.style.left = Math.min(innerWidth - 260, Math.max(8, r.left + r.width / 2 - 110)) + "px";
    b.style.top = Math.max(8, r.top - b.offsetHeight - 10) + "px";
    setTimeout(() => b.remove(), 2600);
  };
  G.rnd = a => a[Math.floor(Math.random() * a.length)];
  G.phrase = () => G.rnd(G.t("phrases"));

  let cv, cx, parts = [], running = false;
  const SYM = ["★", "✦", "☾", "🐾", "♥", "✧", "🌙"];
  function fit() { cv.width = innerWidth; cv.height = innerHeight; }
  G.fxInit = function () {
    cv = document.getElementById("fx"); cx = cv.getContext("2d"); fit(); addEventListener("resize", fit);
    let lt = 0;
    addEventListener("mousemove", e => {
      const now = Date.now(); if (now - lt < 70 || document.body.classList.contains("calm")) return; lt = now;
      const s = document.createElement("span"); s.className = "trail"; s.textContent = G.rnd(["✦", "✧", "★", "·"]);
      s.style.color = G.rnd([getVar("primary"), getVar("accent"), getVar("accent2")]);
      s.style.left = e.clientX + 8 + "px"; s.style.top = e.clientY + 8 + "px";
      document.body.appendChild(s); setTimeout(() => s.remove(), 800);
    });
  };
  const getVar = k => getComputedStyle(document.documentElement).getPropertyValue("--" + k).trim() || "#ff8c2b";
  G.burst = function (el, n = 120) {
    if (!cx || document.body.classList.contains("calm")) return;
    let x = innerWidth / 2, y = innerHeight / 3;
    if (el) { const r = el.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
    const col = [getVar("primary"), getVar("accent"), getVar("accent2"), getVar("ink"), "#ffd86b"];
    for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 13, vy: Math.random() * -11 - 2, c: col[i % col.length], s: SYM[i % SYM.length], z: Math.random() * 14 + 12, l: 110, r: Math.random() * 6 });
    if (!running) { running = true; anim(); }
  };
  function anim() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .3; p.l--; p.r += .1; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.font = p.z + "px serif"; cx.fillText(p.s, 0, 0); cx.restore(); });
    parts = parts.filter(p => p.l > 0 && p.y < innerHeight + 30);
    if (parts.length) requestAnimationFrame(anim); else { running = false; cx.clearRect(0, 0, cv.width, cv.height); }
  }
})();
