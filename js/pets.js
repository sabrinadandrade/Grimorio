/* Gerador de pets kawaii em SVG / kawaii SVG pet generator
 * Cada espécie desenha cabeça + extras num viewBox 0 0 100 100.
 * Para adicionar uma espécie: crie uma entrada em G.SPECIES com defaults e uma função draw().
 * To add a species: add an entry to G.SPECIES with defaults and a draw() function. */
window.G = window.G || {};
(function () {
  const INK = "#2a1d33";
  let uid = 0;

  /* ---------- cores / color helpers ---------- */
  function rgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
  function hex(a) { return "#" + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
  function lum(h) { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  function shade(h, f) { return hex(rgb(h).map(v => f < 0 ? v * (1 + f) : v + (255 - v) * f)); }
  G.colorUtils = { lum, shade };

  /* ---------- peças comuns / shared parts ---------- */
  function eyesSVG(p, mood, fc, pos) {
    const [a, b, y] = pos || [36, 64, 57];
    if (mood === "happy") return `<path d="M${a - 6} ${y + 1} q6 -8 12 0" stroke="${fc}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M${b - 6} ${y + 1} q6 -8 12 0" stroke="${fc}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    if (mood === "sleep") return `<path d="M${a - 6} ${y} q6 6 12 0" stroke="${fc}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M${b - 6} ${y} q6 6 12 0" stroke="${fc}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    const e = (x) => `<ellipse cx="${x}" cy="${y}" rx="7.2" ry="8.2" fill="${p.eye}" stroke="${INK}" stroke-width="2.3"/><ellipse cx="${x}" cy="${y + 1}" rx="3.4" ry="5" fill="${INK}"/><circle cx="${x + 2.6}" cy="${y - 3}" r="2.4" fill="#fff"/><circle cx="${x - 2}" cy="${y + 3}" r="1.1" fill="#fff"/>`;
    return e(a) + e(b);
  }
  const blush = (y = 69, a = 25, b = 75, c = "#ff8fb3") => `<ellipse cx="${a}" cy="${y}" rx="6" ry="3.5" fill="${c}" opacity=".55"/><ellipse cx="${b}" cy="${y}" rx="6" ry="3.5" fill="${c}" opacity=".55"/>`;
  const catMouth = (fc, y = 73) => `<path d="M43 ${y} q3.5 4 7 0 q3.5 4 7 0" stroke="${fc}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
  const smile = (fc, y = 72, w = 8) => `<path d="M${50 - w} ${y} q${w} ${w * .8} ${w * 2} 0" stroke="${fc}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  const whiskers = (c) => `<g stroke="${c}" stroke-width="1.4" opacity=".6"><path d="M12 64 l13 2"/><path d="M12 72 l13 -1"/><path d="M88 64 l-13 2"/><path d="M88 72 l-13 -1"/></g>`;
  const pinkNose = (y = 66, c = "#ff9fb7") => `<path d="M46 ${y} h8 l-4 4.5 z" fill="${c}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;

  function patternSVG(p, cx = 50, cy = 60) {
    const a = p.accent;
    switch (p.pattern) {
      case "stripes": return `<g stroke="${a}" stroke-width="3.4" stroke-linecap="round" fill="none"><path d="M${cx} ${cy - 30} v10"/><path d="M${cx - 8} ${cy - 29} l2 8"/><path d="M${cx + 8} ${cy - 29} l-2 8"/><path d="M${cx - 36} ${cy - 2} h9"/><path d="M${cx - 35} ${cy + 6} h8"/><path d="M${cx + 36} ${cy - 2} h-9"/><path d="M${cx + 35} ${cy + 6} h-8"/></g>`;
      case "mask": return `<ellipse cx="${cx}" cy="${cy + 6}" rx="23" ry="19" fill="${a}" opacity=".92"/><ellipse cx="${cx}" cy="${cy}" rx="30" ry="20" fill="${a}" opacity=".25"/>`;
      case "tuxedo": return `<path d="M${cx} ${cy - 20} L${cx - 6} ${cy + 2} Q${cx - 20} ${cy + 10} ${cx - 20} ${cy + 22} Q${cx} ${cy + 36} ${cx + 20} ${cy + 22} Q${cx + 20} ${cy + 10} ${cx + 6} ${cy + 2} Z" fill="${a}"/>`;
      case "spots": return `<g fill="${a}"><circle cx="${cx - 22}" cy="${cy - 18}" r="8"/><circle cx="${cx + 24}" cy="${cy - 10}" r="6"/><circle cx="${cx + 14}" cy="${cy + 24}" r="7"/><circle cx="${cx - 28}" cy="${cy + 14}" r="5"/></g>`;
      case "patch": return `<ellipse cx="${cx + 14}" cy="${cy - 4}" rx="15" ry="14" fill="${a}"/>`;
      case "belly": return `<ellipse cx="${cx}" cy="${cy + 18}" rx="26" ry="16" fill="${a}"/>`;
      default: return "";
    }
  }

  function accessorySVG(acc, top) {
    const y = top;
    switch (acc) {
      case "witch": return `<g transform="translate(0,${y - 30})"><path d="M24 30 Q50 21 76 30 L69 34 Q50 28 31 34 Z" fill="#2a1d33" stroke="#b98cff" stroke-width="2"/><path d="M35 30 L55 -4 Q59 3 66 5 L63 29 Z" fill="#2a1d33" stroke="#b98cff" stroke-width="2"/><path d="M37 26 Q50 22 62 26" stroke="#ff8c2b" stroke-width="3.2" fill="none"/><text x="48" y="17" font-size="9" fill="#ffd86b">★</text></g>`;
      case "bow": return `<g transform="translate(66,${y + 1})"><path d="M0 0 L-12 -8 L-12 8 Z M0 0 L12 -8 L12 8 Z" fill="#ff7aa8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle r="4" fill="#ff4f8b" stroke="${INK}" stroke-width="2"/></g>`;
      case "crown": return `<path d="M34 ${y + 2} L36 ${y - 12} L43 ${y - 4} L50 ${y - 15} L57 ${y - 4} L64 ${y - 12} L66 ${y + 2} Z" fill="#ffd86b" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="50" cy="${y - 3}" r="2.5" fill="#ff6f91"/>`;
      case "flower": return `<g transform="translate(70,${y + 2})">${[0, 72, 144, 216, 288].map(r => `<ellipse rx="4.5" ry="7" transform="rotate(${r}) translate(0,-6)" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`).join("")}<circle r="4" fill="#ffd86b" stroke="${INK}" stroke-width="1.5"/></g>`;
      case "star": return `<path transform="translate(70,${y + 2}) scale(.9)" d="M0 -11 L3.2 -3.5 L11 -3.4 L5 1.8 L7 10 L0 5.4 L-7 10 L-5 1.8 L-11 -3.4 L-3.2 -3.5 Z" fill="#ffd86b" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
      case "moon": return `<g transform="translate(50,${y - 4})"><path d="M-30 10 Q0 -4 30 10" stroke="#ffd86b" stroke-width="3.5" fill="none"/><path d="M3 -12 A10 10 0 1 0 3 8 A7.5 7.5 0 1 1 3 -12 Z" fill="#ffd86b" stroke="${INK}" stroke-width="2"/></g>`;
      default: return "";
    }
  }

  /* ---------- espécies / species ---------- */
  // each draw returns { back, headShape (path/ellipse markup WITHOUT fill), front, top, eyePos?, extraClip? }
  G.SPECIES = {
    cat: {
      d: { base: "#a4896a", accent: "#4f3f2e", pattern: "stripes", eye: "#8cc265" },
      patterns: ["none", "stripes", "mask", "tuxedo", "spots", "patch", "belly"],
      draw(p, o, fc) {
        const ear = p.pattern === "mask" ? p.accent : p.base, inner = p.pattern === "mask" ? shade(p.accent, .2) : "#ffb8cf";
        return {
          back: `<polygon points="16,46 22,10 48,32" fill="${ear}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><polygon points="84,46 78,10 52,32" fill="${ear}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><polygon points="23,36 26,19 38,31" fill="${inner}"/><polygon points="77,36 74,19 62,31" fill="${inner}"/>`,
          head: `<ellipse cx="50" cy="60" rx="38" ry="32"/>`,
          front: pinkNose() + catMouth(fc) + whiskers(fc), top: 30
        };
      }
    },
    fox: {
      d: { base: "#ff9147", accent: "#ffffff", pattern: "belly", eye: "#6b4a2a" },
      patterns: ["none", "belly", "mask", "spots"],
      draw(p, o, fc) {
        return {
          back: `<polygon points="14,48 18,6 46,30" fill="${p.base}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><polygon points="86,48 82,6 54,30" fill="${p.base}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><polygon points="21,36 22,17 36,29" fill="#2a1d33"/><polygon points="79,36 78,17 64,29" fill="#2a1d33"/>`,
          head: `<path d="M12 52 Q14 28 50 28 Q86 28 88 52 Q86 72 50 92 Q14 72 12 52 Z"/>`,
          front: `<ellipse cx="50" cy="70" rx="4.5" ry="3.3" fill="${INK}"/>` + smile(fc, 76, 5), top: 30
        };
      }
    },
    dog: {
      d: { base: "#e8c49a", accent: "#8a5a3b", pattern: "patch", eye: "#6b4a2a", ears: "floppy" },
      patterns: ["none", "patch", "spots", "mask", "tuxedo", "belly"], ears: ["floppy", "up"],
      draw(p, o, fc, mood) {
        const ec = shade(p.pattern === "none" || p.pattern === "belly" ? p.base : p.accent, -.12);
        const ears = p.ears === "up"
          ? `<path d="M18 46 Q16 14 30 10 Q40 22 44 34 Z" fill="${ec}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><path d="M82 46 Q84 14 70 10 Q60 22 56 34 Z" fill="${ec}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>`
          : "";
        const flop = p.ears === "up" ? "" : `<ellipse cx="17" cy="56" rx="11" ry="21" transform="rotate(18 17 56)" fill="${ec}" stroke="${o}" stroke-width="3"/><ellipse cx="83" cy="56" rx="11" ry="21" transform="rotate(-18 83 56)" fill="${ec}" stroke="${o}" stroke-width="3"/>`;
        const tongue = mood === "happy" ? `<path d="M46 76 q4 9 8 0 z" fill="#ff7a9a" stroke="${INK}" stroke-width="1.5"/>` : "";
        return {
          back: ears, head: `<ellipse cx="50" cy="60" rx="35" ry="31"/>`,
          front: `<ellipse cx="50" cy="69" rx="14" ry="10" fill="#fff" opacity=".55"/><ellipse cx="50" cy="66" rx="5.5" ry="4" fill="${INK}"/><circle cx="48.5" cy="65" r="1.2" fill="#fff"/>` + smile(fc === "#fff" ? "#fff" : INK, 72, 5) + tongue + flop,
          top: 30
        };
      }
    },
    mouse: {
      d: { base: "#c9c3cf", accent: "#ffffff", pattern: "belly", eye: "#2a1d33" },
      patterns: ["none", "belly", "spots", "patch"],
      draw(p, o, fc) {
        return {
          back: `<circle cx="20" cy="32" r="17" fill="${p.base}" stroke="${o}" stroke-width="3"/><circle cx="80" cy="32" r="17" fill="${p.base}" stroke="${o}" stroke-width="3"/><circle cx="20" cy="32" r="10" fill="#ffb8cf"/><circle cx="80" cy="32" r="10" fill="#ffb8cf"/>`,
          head: `<path d="M18 58 Q18 34 50 34 Q82 34 82 58 Q80 84 50 90 Q20 84 18 58 Z"/>`,
          front: `<circle cx="50" cy="70" r="3.6" fill="#ff8fb3" stroke="${INK}" stroke-width="1.2"/>` + smile(fc, 75, 4) + whiskers(fc), top: 34
        };
      }
    },
    hamster: {
      d: { base: "#f2b66d", accent: "#fff6e8", pattern: "belly", eye: "#2a1d33" },
      patterns: ["none", "belly", "patch", "spots"],
      draw(p, o, fc) {
        return {
          back: `<circle cx="25" cy="33" r="9" fill="${p.base}" stroke="${o}" stroke-width="3"/><circle cx="75" cy="33" r="9" fill="${p.base}" stroke="${o}" stroke-width="3"/><circle cx="25" cy="33" r="4.5" fill="#ffb8cf"/><circle cx="75" cy="33" r="4.5" fill="#ffb8cf"/>`,
          head: `<ellipse cx="50" cy="62" rx="41" ry="33"/>`,
          front: `<ellipse cx="22" cy="72" rx="11" ry="9" fill="#fff" opacity=".45"/><ellipse cx="78" cy="72" rx="11" ry="9" fill="#fff" opacity=".45"/><path d="M47.5 67 h5 l-2.5 3 z" fill="#ff8fb3" stroke="${INK}" stroke-width="1"/>` + catMouth(fc, 72), top: 30
        };
      }
    },
    rabbit: {
      d: { base: "#f4efe9", accent: "#b8a493", pattern: "none", eye: "#d65a7a", ears: "up" },
      patterns: ["none", "patch", "spots", "belly", "mask"], ears: ["up", "floppy"],
      draw(p, o, fc) {
        const ears = p.ears === "floppy"
          ? `<ellipse cx="18" cy="50" rx="9" ry="24" transform="rotate(30 18 50)" fill="${p.base}" stroke="${o}" stroke-width="3"/><ellipse cx="82" cy="50" rx="9" ry="24" transform="rotate(-30 82 50)" fill="${p.base}" stroke="${o}" stroke-width="3"/>`
          : `<ellipse cx="36" cy="20" rx="9" ry="22" transform="rotate(-8 36 20)" fill="${p.base}" stroke="${o}" stroke-width="3"/><ellipse cx="64" cy="20" rx="9" ry="22" transform="rotate(8 64 20)" fill="${p.base}" stroke="${o}" stroke-width="3"/><ellipse cx="36" cy="21" rx="4.5" ry="15" transform="rotate(-8 36 21)" fill="#ffb8cf"/><ellipse cx="64" cy="21" rx="4.5" ry="15" transform="rotate(8 64 21)" fill="#ffb8cf"/>`;
        return {
          back: p.ears === "floppy" ? "" : ears, head: `<ellipse cx="50" cy="64" rx="34" ry="29"/>`,
          front: `<path d="M47 68 h6 l-3 3.5 z" fill="#ff8fb3" stroke="${INK}" stroke-width="1.1"/>` + catMouth(fc, 74) + (p.ears === "floppy" ? ears : ""), top: 38, eyePos: [37, 63, 60]
        };
      }
    },
    chicken: {
      d: { base: "#fffaf0", accent: "#e8c49a", pattern: "none", eye: "#2a1d33" },
      patterns: ["none", "spots", "belly"],
      draw(p, o, fc) {
        return {
          back: `<g fill="#ff5a5a" stroke="${o}" stroke-width="2.5"><circle cx="41" cy="28" r="7"/><circle cx="50" cy="23" r="8"/><circle cx="59" cy="28" r="7"/></g>`,
          head: `<circle cx="50" cy="60" r="35"/>`,
          front: `<path d="M44 64 L56 64 L50 73 Z" fill="#ffb347" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="50" cy="78" rx="4" ry="5" fill="#ff5a5a" stroke="${INK}" stroke-width="1.5"/>`, top: 26
        };
      }
    },
    duck: {
      d: { base: "#ffe27a", accent: "#ffffff", pattern: "none", eye: "#2a1d33" },
      patterns: ["none", "belly", "spots"],
      draw(p, o, fc) {
        return {
          back: "", head: `<circle cx="50" cy="58" r="35"/>`,
          front: `<ellipse cx="50" cy="71" rx="16" ry="7.5" fill="#ffa53a" stroke="${INK}" stroke-width="2.3"/><path d="M36 71 Q50 75 64 71" stroke="${INK}" stroke-width="1.5" fill="none"/><circle cx="46" cy="68" r="1" fill="${INK}"/><circle cx="54" cy="68" r="1" fill="${INK}"/>`, top: 24, eyePos: [36, 64, 54]
        };
      }
    },
    bird: {
      d: { base: "#9fd8a8", accent: "#fff17a", pattern: "belly", eye: "#2a1d33" },
      patterns: ["none", "belly", "spots", "mask"],
      draw(p, o, fc) {
        const c = shade(p.accent, -.1);
        return {
          back: `<g fill="${c}" stroke="${o}" stroke-width="2.3"><path d="M50 30 Q44 10 52 4 Q54 18 56 28 Z"/><path d="M46 30 Q34 14 38 8 Q44 20 52 30 Z"/></g>`,
          head: `<circle cx="50" cy="60" r="34"/>`,
          front: `<path d="M45 64 Q50 60 55 64 Q53 72 50 74 Q47 72 45 64 Z" fill="#ffb347" stroke="${INK}" stroke-width="2"/>` , top: 28, blush: "#ff9f6b"
        };
      }
    },
    snake: {
      d: { base: "#8fd694", accent: "#3f8f5a", pattern: "spots", eye: "#ffd86b" },
      patterns: ["none", "stripes", "spots", "belly"],
      draw(p, o, fc, mood) {
        const tongue = mood === "sleep" ? "" : `<path d="M50 78 v8 l-3 4 M50 86 l3 4" stroke="#ff4f6b" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
        return {
          back: `<path d="M14 92 Q14 78 50 80 Q86 78 86 92 Q50 104 14 92 Z" fill="${p.base}" stroke="${o}" stroke-width="3"/><path d="M24 90 q6 -4 12 0 M44 92 q6 -4 12 0 M64 90 q6 -4 12 0" stroke="${p.accent}" stroke-width="3" fill="none"/>`,
          head: `<ellipse cx="50" cy="56" rx="37" ry="27"/>`,
          front: `<circle cx="45" cy="68" r="1.4" fill="${INK}"/><circle cx="55" cy="68" r="1.4" fill="${INK}"/>` + smile(fc, 72, 7) + tongue, top: 31, eyePos: [34, 66, 52]
        };
      }
    },
    turtle: {
      d: { base: "#9be37a", accent: "#7a5a3a", pattern: "none", eye: "#2a1d33" },
      patterns: ["none", "spots", "belly"],
      draw(p, o, fc) {
        const sh = p.accent;
        return {
          back: "", head: `<ellipse cx="50" cy="50" rx="30" ry="27"/>`,
          front: smile(fc, 62, 6) +
            `<path d="M6 98 Q8 66 50 66 Q92 66 94 98 Z" fill="${sh}" stroke="${o}" stroke-width="3"/><g stroke="${shade(sh, -.35)}" stroke-width="2" fill="none"><path d="M38 70 L32 84 L40 97 M62 70 L68 84 L60 97 M32 84 H68 M40 97 H60"/></g><path d="M6 98 Q50 90 94 98" stroke="${o}" stroke-width="3" fill="none"/>`,
          top: 23, eyePos: [38, 62, 48], blushY: 58
        };
      }
    },
    frog: {
      d: { base: "#8fd694", accent: "#e8f7c8", pattern: "belly", eye: "#2a1d33" },
      patterns: ["none", "belly", "spots"],
      draw(p, o, fc) {
        return {
          back: `<circle cx="30" cy="38" r="15" fill="${p.base}" stroke="${o}" stroke-width="3"/><circle cx="70" cy="38" r="15" fill="${p.base}" stroke="${o}" stroke-width="3"/>`,
          head: `<ellipse cx="50" cy="64" rx="42" ry="28"/>`,
          front: `<path d="M30 70 Q50 82 70 70" stroke="${fc}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`, top: 24, eyePos: [30, 70, 38], blushY: 66, blushX: [20, 80]
        };
      }
    },
    fish: {
      d: { base: "#ffa86b", accent: "#ffffff", pattern: "stripes", eye: "#2a1d33" },
      patterns: ["none", "stripes", "spots"],
      draw(p, o, fc) {
        const fin = shade(p.base, -.12);
        return {
          back: `<path d="M50 30 Q40 12 58 10 Q60 22 62 32 Z" fill="${fin}" stroke="${o}" stroke-width="2.5"/><path d="M14 60 L2 50 L4 72 Z" fill="${fin}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/><path d="M86 60 L98 50 L96 72 Z" fill="${fin}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/>`,
          head: `<ellipse cx="50" cy="60" rx="37" ry="31"/>`,
          front: `<ellipse cx="50" cy="73" rx="4" ry="3.2" fill="#ff7a9a" stroke="${INK}" stroke-width="1.5"/><circle cx="84" cy="24" r="3" fill="none" stroke="#8fc3ff" stroke-width="1.6"/><circle cx="90" cy="14" r="2" fill="none" stroke="#8fc3ff" stroke-width="1.4"/>`, top: 30, stripesVertical: true
        };
      }
    },
    bat: {
      d: { base: "#4a3a5c", accent: "#2a1d33", pattern: "none", eye: "#ffd86b" },
      patterns: ["none", "belly", "mask"],
      draw(p, o, fc) {
        const w = shade(p.base, -.2);
        return {
          back: `<path d="M18 58 Q4 44 2 30 Q10 36 14 34 Q14 42 22 42 Z" fill="${w}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/><path d="M82 58 Q96 44 98 30 Q90 36 86 34 Q86 42 78 42 Z" fill="${w}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/><polygon points="20,44 24,6 46,32" fill="${p.base}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><polygon points="80,44 76,6 54,32" fill="${p.base}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/><polygon points="26,36 27,17 38,30" fill="#ffb8cf"/><polygon points="74,36 73,17 62,30" fill="#ffb8cf"/>`,
          head: `<ellipse cx="50" cy="60" rx="33" ry="30"/>`,
          front: `<ellipse cx="50" cy="67" rx="3.2" ry="2.4" fill="#ff9fb7"/>` + smile(fc, 72, 6) + `<path d="M45 73.5 l2 4 l2 -3.4 M51 73.6 l2 3.4 l2 -4" fill="#fff" stroke="#fff" stroke-width="1"/>`, top: 30
        };
      }
    }
  };
  G.SPECIES_ORDER = ["cat", "dog", "mouse", "hamster", "rabbit", "chicken", "duck", "bird", "snake", "turtle", "frog", "fish", "bat", "fox"];
  G.ACCESSORIES = ["none", "witch", "bow", "crown", "flower", "star", "moon"];

  /* ---------- montagem / assembly ---------- */
  G.petSVG = function (pet, size = 64, mood = "ok", forceAcc) {
    const sp = G.SPECIES[pet.species] || G.SPECIES.cat;
    const p = Object.assign({}, sp.d, pet);
    const dark = lum(p.base) < 0.33;
    const o = dark ? shade(p.base, .3) : INK;
    const fc = dark ? "#fff" : INK;
    const d = sp.draw(p, o, fc, mood);
    const id = "pc" + (++uid);
    let pat = patternSVG(p);
    if (d.stripesVertical && p.pattern === "stripes") pat = `<g stroke="${p.accent}" stroke-width="5" opacity=".8"><path d="M32 20 V100"/><path d="M68 20 V100"/></g>`;
    const acc = accessorySVG(forceAcc || p.accessory || "none", d.top || 30);
    const by = d.blushY || 69, bx = d.blushX || [25, 75];
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${(pet.name || "pet").replace(/"/g, "")}">
<defs><clipPath id="${id}">${d.head}</clipPath></defs>${d.back}
<g fill="${p.base}">${d.head}</g><g clip-path="url(#${id})">${pat}</g>
<g fill="none" stroke="${o}" stroke-width="3">${d.head}</g>
${eyesSVG(p, mood, fc, d.eyePos)}${blush(by, bx[0], bx[1], d.blush || "#ff8fb3")}${d.front}${acc}</svg>`;
  };

  G.randomPet = function (species) {
    const sp = species || G.SPECIES_ORDER[Math.floor(Math.random() * G.SPECIES_ORDER.length)];
    const S = G.SPECIES[sp];
    const pal = ["#2b2533", "#f2dfc6", "#a4896a", "#ddd6cb", "#ff9147", "#e8c49a", "#c9c3cf", "#fffaf0", "#ffe27a", "#9fd8a8", "#8fd694", "#ffa86b", "#4a3a5c", "#f4efe9", "#b98cff", "#8fc3ff"];
    const acc = ["#2b2533", "#ffffff", "#4f3f2e", "#8a5a3b", "#4a3226", "#ffd86b", "#3f8f5a"];
    const eyes = ["#5aa2ff", "#8cc265", "#e6e85a", "#6b4a2a", "#2a1d33", "#d65a7a", "#b98cff"];
    const r = a => a[Math.floor(Math.random() * a.length)];
    return { species: sp, base: r(pal), accent: r(acc), pattern: r(S.patterns), eye: r(eyes), ears: S.ears ? r(S.ears) : undefined, accessory: r(G.ACCESSORIES) };
  };
})();
