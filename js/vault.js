/* Cofre: backup em arquivo criptografado / Vault: encrypted file backups
 *
 * O Grimório guarda tudo só no aparelho da pessoa. Para levar os dados para outro aparelho (ou guardar uma
 * cópia), o backup pode ser exportado como arquivo .grimorio trancado com senha.
 * Senha → PBKDF2-SHA256 (600 mil rodadas, sal aleatório) → AES-GCM 256. A senha nunca é guardada.
 *
 * The Grimoire keeps everything on the person's device only. To move data to another device (or keep a copy),
 * the backup can be exported as a passphrase-locked .grimorio file. The passphrase is never stored. */
window.G = window.G || {};
(function () {
  const V = G.vault = {};
  const IT = 600000;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = u8 => btoa(String.fromCharCode(...new Uint8Array(u8)));
  const u8 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  V.supported = () => !!(window.crypto && crypto.subtle);
  V.isSealed = d => !!(d && d.enc === 1 && d.ct);
  V.derive = async function (pass, salt) {
    const base = await crypto.subtle.importKey("raw", enc.encode(pass.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: IT }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  };
  async function sealWith(key, salt, obj, extra) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)));
    return Object.assign({ enc: 1, v: 1, kdf: "PBKDF2-SHA256", it: IT, salt, iv: b64(iv), ct: b64(ct) }, extra || {});
  }
  async function openWith(key, env) {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: u8(env.iv) }, key, u8(env.ct));
    return JSON.parse(dec.decode(pt));
  }

  /* backup em arquivo criptografado / encrypted file backup */
  V.exportFile = async function (pass) {
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const env = await sealWith(await V.derive(pass, u8(salt)), salt, G.state, { grimorio: "encrypted-backup" });
    V.lastEnv = env;
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
