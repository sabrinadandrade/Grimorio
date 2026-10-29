/* Cofre: criptografia de ponta a ponta / Vault: end-to-end encryption
 *
 * Com o cofre ligado, o grimório vai para a nuvem EMBARALHADO com uma senha-mestra que só a pessoa sabe.
 * Nem o servidor (nem quem administra o Supabase) consegue ler. Se a senha for esquecida, os dados da nuvem
 * não podem ser recuperados (os do aparelho continuam lá).
 *
 * Como: senha → PBKDF2-SHA256 (600 mil rodadas, sal aleatório) → chave AES-GCM 256 (não exportável),
 * guardada só neste aparelho (IndexedDB). Fica visível para o servidor apenas: data da última alteração,
 * fuso horário e a lista de HORÁRIOS dos próximos lembretes (sem título), para os avisos com o app fechado.
 *
 * With the vault on, the grimoire is sent to the cloud encrypted with a passphrase only the user knows.
 * Passphrase → PBKDF2-SHA256 (600k) → non-extractable AES-GCM-256 key kept on this device (IndexedDB).
 * The server only sees: updatedAt, time zone and the TIMES of upcoming reminders (no titles). */
window.G = window.G || {};
(function () {
  const V = G.vault = {};
  const IT = 600000, FLAG = "grimorio.e2e";
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = u8 => btoa(String.fromCharCode(...new Uint8Array(u8)));
  const u8 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  let KEY = null;

  V.supported = () => !!(window.crypto && crypto.subtle);
  V.flag = () => { try { return JSON.parse(localStorage.getItem(FLAG) || "null"); } catch (e) { return null; } };
  V.on = () => !!V.flag();
  V.isSealed = d => !!(d && d.enc === 1 && d.ct);

  V.derive = async function (pass, salt) {
    const base = await crypto.subtle.importKey("raw", enc.encode(pass.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: IT }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  };
  V.key = async function () {
    if (KEY) return KEY;
    const f = V.flag(); if (!f) return null;
    const k = G.idbGet ? await G.idbGet("vaultKey") : null;
    if (k && k.salt === f.salt) KEY = k.key;
    return KEY;
  };
  async function remember(key, salt) {
    KEY = key;
    try { localStorage.setItem(FLAG, JSON.stringify({ salt, at: Date.now() })); } catch (e) { }
    if (G.idbSet) await G.idbSet("vaultKey", { key, salt });
  }
  V.forget = async function () { KEY = null; try { localStorage.removeItem(FLAG); } catch (e) { } if (G.idbSet) await G.idbSet("vaultKey", null); };

  /* só os horários dos próximos lembretes (14 dias), sem títulos / reminder times only */
  V.schedule = () => (G.upcomingReminders ? G.upcomingReminders(Date.now() - 5 * 60000, Date.now() + 14 * 864e5) : []).map(o => o.fire).slice(0, 300);

  async function sealWith(key, salt, obj, extra) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
    return Object.assign({ enc: 1, v: 1, kdf: "PBKDF2-SHA256", it: IT, salt, iv: b64(iv), ct: b64(ct), updatedAt: obj.updatedAt || Date.now() }, extra || {});
  }
  async function openWith(key, env) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: u8(env.iv) }, key, u8(env.ct));
    return JSON.parse(dec.decode(pt));
  }

  /* para a nuvem / for the cloud */
  V.seal = async function (state) {
    const key = await V.key(); if (!key) throw new Error("vault-locked");
    return sealWith(key, V.flag().salt, state, { tz: state.tz || "", sched: V.schedule() });
  };
  /* abre com a chave guardada; null se não der / open with stored key; null if it can't */
  V.open = async function (env) {
    const key = await V.key();
    if (!key || V.flag().salt !== env.salt) return null;
    try { return await openWith(key, env); } catch (e) { return null; }
  };
  /* destrava num aparelho novo / unlock on a new device */
  V.unlock = async function (env, pass) {
    const key = await V.derive(pass, u8(env.salt));
    let data; try { data = await openWith(key, env); } catch (e) { throw new Error(G.t("vaultWrong")); }
    await remember(key, env.salt);
    return data;
  };
  /* liga (ou troca a senha) / turn on (or change passphrase) */
  V.enable = async function (pass) {
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    await remember(await V.derive(pass, u8(salt)), salt);
  };

  /* backup em arquivo criptografado / encrypted file backup */
  V.exportFile = async function (pass) {
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const env = await sealWith(await V.derive(pass, u8(salt)), salt, G.state, { grimorio: "encrypted-backup" });
    G.download("grimorio-backup-" + G.todayIso() + ".grimorio", JSON.stringify(env), "application/json");
  };
  V.openFile = async function (env, pass) {
    try { return await openWith(await V.derive(pass, u8(env.salt)), env); } catch (e) { throw new Error(G.t("vaultWrong")); }
  };

  /* janela de senha / passphrase dialog. mode: "new" (duas vezes) ou "ask" */
  V.ask = function (mode, msg) {
    return new Promise(res => {
      const t = G.t, m = document.createElement("div"); m.className = "modal"; m.id = "vaultModal";
      m.innerHTML = `<div class="win"><div class="bar">🔐 ${t("vaultTitle")}<span class="dots"><i></i><i></i><i></i></span></div><div class="wbody">
        <p>${msg || ""}</p>
        <label class="f">${t("vaultPass")}<input type="password" id="vp1" autocomplete="${mode === "new" ? "new-password" : "current-password"}" minlength="8"></label>
        ${mode === "new" ? `<label class="f">${t("vaultPass2")}<input type="password" id="vp2" autocomplete="new-password"></label><p class="small">${t("vaultWarn")}</p>` : ""}
        <p class="small" id="vpErr" style="color:var(--danger,#e5484d)"></p>
        <div class="nav"><button class="cute big-cta" id="vpOk">${t("vaultOk")}</button><button class="cute ghost" id="vpNo">${t("cancel")}</button></div></div></div>`;
      document.body.appendChild(m);
      const p1 = m.querySelector("#vp1"), p2 = m.querySelector("#vp2"), err = m.querySelector("#vpErr");
      setTimeout(() => p1.focus(), 50);
      const done = v => { m.remove(); res(v); };
      m.querySelector("#vpNo").onclick = () => done(null);
      const ok = () => {
        if (p1.value.length < 8) { err.textContent = t("vaultShort"); return; }
        if (p2 && p1.value !== p2.value) { err.textContent = t("vaultMismatch"); return; }
        done(p1.value);
      };
      m.querySelector("#vpOk").onclick = ok;
      m.addEventListener("keydown", e => { if (e.key === "Enter") ok(); });
    });
  };
})();
