/* Temas de cores / color themes
 * Para criar um tema novo, adicione uma entrada em G.THEMES (e o nome em i18n.js > presetNames). */
window.G = window.G || {};
G.THEME_KEYS = ["bg", "dot", "card", "cardAlt", "primary", "primary2", "accent", "accent2", "ink", "inkSoft", "onBg", "screen"];
G.THEMES = {
  halloween:  { bg:"#3a1d5c", dot:"#5b2d8a", card:"#ffffff", cardAlt:"#fff4e6", primary:"#ff8c2b", primary2:"#ff7a1a", accent:"#9be37a", accent2:"#b98cff", ink:"#1a1020", inkSoft:"#4a3560", onBg:"#f3e6ff", screen:"#c8f0a0" },
  kawaii:     { bg:"#fff3b0", dot:"#ffffff", card:"#ffffff", cardAlt:"#fffbea", primary:"#ffe36e", primary2:"#ffd84a", accent:"#ffb8d1", accent2:"#cdb8ff", ink:"#2a1d33", inkSoft:"#5b4a66", onBg:"#2a1d33", screen:"#e9f3d6" },
  pastelgoth: { bg:"#1d1a24", dot:"#2e2838", card:"#fdf7ff", cardAlt:"#f4ecff", primary:"#f7a8d8", primary2:"#e98cc7", accent:"#a8e6ff", accent2:"#c9b6ff", ink:"#16121c", inkSoft:"#4b3f5c", onBg:"#f4ecff", screen:"#e1d7ff" },
  forest:     { bg:"#1f3b2c", dot:"#2b5240", card:"#fffdf5", cardAlt:"#f1f7ea", primary:"#9bd770", primary2:"#7fc055", accent:"#ffcf6b", accent2:"#e8a0bf", ink:"#14241b", inkSoft:"#3f5a48", onBg:"#eaf6e2", screen:"#dff3c8" },
  ocean:      { bg:"#0f3557", dot:"#174a75", card:"#ffffff", cardAlt:"#eef8ff", primary:"#5ec8f2", primary2:"#3fb4e6", accent:"#ffd36b", accent2:"#ff9db4", ink:"#0a1d2e", inkSoft:"#34536b", onBg:"#e3f4ff", screen:"#d4f1ff" },
  strawberry: { bg:"#ffd6e0", dot:"#ffffff", card:"#ffffff", cardAlt:"#fff4f6", primary:"#ff6f91", primary2:"#ff5a80", accent:"#8fd694", accent2:"#ffd36b", ink:"#3a1c26", inkSoft:"#6b4652", onBg:"#3a1c26", screen:"#ffe8ee" },
  night:      { bg:"#0e1030", dot:"#1d2160", card:"#fbfaff", cardAlt:"#eef0ff", primary:"#ffd86b", primary2:"#f6c94a", accent:"#8fa8ff", accent2:"#c49bff", ink:"#0b0c22", inkSoft:"#3d4170", onBg:"#e8eaff", screen:"#e5e8ff" }
};
G.SUBJECT_COLORS = ["#ff9a4d", "#c49bff", "#9be37a", "#ffc46b", "#7fe0b8", "#ff8fb3", "#8fc3ff", "#f6e27a", "#d9a6ff", "#a3e4ff"];

G.applyTheme = function (theme) {
  const base = G.THEMES[theme.preset] || G.THEMES.halloween;
  const t = Object.assign({}, base, theme.custom || {});
  const r = document.documentElement.style;
  G.THEME_KEYS.forEach(k => r.setProperty("--" + k, t[k]));
  G.currentTheme = t;
};
