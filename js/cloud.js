/* Sincronização na nuvem com Supabase / Supabase cloud sync
 *
 * Modelo "local-first": o app funciona 100% offline; quando a pessoa entra com o e-mail,
 * o grimório inteiro (um JSON) é salvo na tabela `grimoires`, uma linha por usuária.
 * Conflitos: vence a versão mais recente (updatedAt), e a versão local é guardada num snapshot antes.
 *
 * Local-first: the app works fully offline; once signed in, the whole grimoire (one JSON document)
 * is stored in the `grimoires` table, one row per user. Newest updatedAt wins; a local snapshot is kept first. */
window.G = window.G || {};
(function () {
  const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
  const C = G.cloud = { client: null, user: null, status: "off", lastSync: 0, error: "" };
  let pushTimer = null, pushing = false, pending = false;

  C.config = () => {
    let o = {};
    try { o = JSON.parse(localStorage.getItem("grimorio.cloud") || "{}"); } catch (e) { }
    if (!C.validCustom(o.url, o.key)) o = {}; // ignora servidor personalizado inválido / ignore invalid custom server
    return { url: o.url || (G.CONFIG && G.CONFIG.supabaseUrl) || "", key: o.key || (G.CONFIG && G.CONFIG.supabaseAnonKey) || "" };
  };
  // URL do servidor: https://algo (sem caminho, tipo https://xxxx.supabase.co); chave: texto que não é link
  C.validCustom = (url, key) => !!url && !!key && /^https?:\/\/[^\/\s]+\/?$/i.test(url.trim()) && !/^https?:/i.test(key.trim()) && key.trim().length > 20;
  C.configured = () => { const c = C.config(); return !!(c.url && c.key); };
  C.setCustom = (url, key) => { try { if (C.validCustom(url, key)) localStorage.setItem("grimorio.cloud", JSON.stringify({ url: url.trim(), key: key.trim() })); else localStorage.removeItem("grimorio.cloud"); } catch (e) { } };

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = LIB; s.onload = res; s.onerror = () => rej(new Error("offline")); document.head.appendChild(s); });
  }
  const notify = () => { if (G.UI && G.UI.cloudChanged) G.UI.cloudChanged(); };

  C.init = async function () {
    if (!C.configured()) { C.status = "off"; return; }
    try {
      await loadLib();
      const c = C.config();
      C.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      const { data } = await C.client.auth.getSession();
      C.user = data && data.session ? data.session.user : null;
      C.status = C.user ? "idle" : "signedOut";
      C.client.auth.onAuthStateChange((ev, session) => {
        const was = C.user; C.user = session ? session.user : null;
        C.status = C.user ? "idle" : "signedOut";
        if (C.user && (!was || ev === "SIGNED_IN")) C.sync();
        notify();
      });
      if (C.user) await C.sync();
      addEventListener("online", () => { if (C.user) C.sync(); });
    } catch (e) { C.status = "offline"; C.error = e.message; }
    notify();
  };

  C.signIn = async function (email) {
    if (!C.client) await C.init();
    if (!C.client) throw new Error(C.error || "cloud");
    const { error } = await C.client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("#")[0] } });
    if (error) throw error;
  };
  /* entrar com o código de 6 dígitos do e-mail (funciona no app instalado do iPhone)
   * sign in with the emailed one-time code (works inside installed iOS home-screen apps) */
  C.verifyCode = async function (email, code) {
    if (!C.client) await C.init();
    const { data, error } = await C.client.auth.verifyOtp({ email, token: code.replace(/\D/g, ""), type: "email" });
    if (error) throw error;
    C.user = data.user; C.status = "idle"; notify(); await C.sync();
  };
  C.signOut = async function () { if (C.client) await C.client.auth.signOut(); C.user = null; C.status = "signedOut"; notify(); };

  /* baixa e decide quem vence / pull and resolve */
  C.sync = async function () {
    if (!C.client || !C.user) return;
    C.status = "syncing"; notify();
    try {
      const { data, error } = await C.client.from("grimoires").select("data, updated_at").eq("user_id", C.user.id).maybeSingle();
      if (error) throw error;
      const remote = data && data.data, rT = remote ? (remote.updatedAt || Date.parse(data.updated_at) || 0) : 0, lT = G.state.updatedAt || 0;
      const has = s => !!(s && ((s.subjects || []).length || (s.cards || []).length || Object.keys(s.plan || {}).length));
      const localHasData = has(G.state), remoteHasData = has(remote);
      const firstTimeHere = G.state.cloudUser !== C.user.id; // primeira sincronização deste aparelho com esta conta
      let pull = remote && rT > lT;
      if (remote && firstTimeHere) {
        // aparelho novo: nunca deixa um grimório vazio apagar o da nuvem
        // new device: never let an empty local grimoire overwrite the cloud one
        if (remoteHasData && !localHasData) pull = true;
        else if (remoteHasData && localHasData) pull = rT === lT ? false : confirm(G.t("cloudChoose"));
        else if (!remoteHasData) pull = false;
      }
      if (pull) {
        if (localHasData && G.safety) await G.safety.snapshot("before-cloud-pull");
        G.state = Object.assign(G.defaultState(), remote, { cloudUser: C.user.id }); G.lang = G.state.lang;
        G.save({ keepTime: true, noCloud: true });
        if (G.applyTheme) G.applyTheme(G.state.theme);
        if (G.tamaRender) G.tamaRender();
        if (G.UI && G.UI.refresh) G.UI.refresh();
        G.toast && G.toast(G.t("cloudPulled"));
      } else if (!remote || lT > rT || firstTimeHere) {
        G.state.cloudUser = C.user.id;
        await C.push(true);
      }
      if (G.state.cloudUser !== C.user.id) { G.state.cloudUser = C.user.id; try { localStorage.setItem(G.STORE_KEY, JSON.stringify(G.state)); } catch (e) { } }
      C.lastSync = Date.now(); C.status = "idle"; C.error = "";
    } catch (e) { C.status = navigator.onLine ? "error" : "offline"; C.error = e.message || String(e); }
    notify();
  };

  C.push = async function (force) {
    if (!C.client || !C.user) return;
    if (!force && G.state.cloudUser !== C.user.id) return C.sync(); // ainda não sincronizou neste aparelho
    if (pushing) { pending = true; return; }
    pushing = true;
    try {
      const { error } = await C.client.from("grimoires").upsert({ user_id: C.user.id, data: G.state, updated_at: new Date(G.state.updatedAt || Date.now()).toISOString() });
      if (error) throw error;
      C.lastSync = Date.now(); C.status = "idle"; C.error = "";
      G.state.lastBackupAt = Date.now(); try { localStorage.setItem(G.STORE_KEY, JSON.stringify(G.state)); } catch (e) { }
    } catch (e) { C.status = navigator.onLine ? "error" : "offline"; C.error = e.message || String(e); }
    pushing = false; notify();
    if (pending) { pending = false; C.push(); }
  };
  C.schedulePush = () => { if (!C.user) return; clearTimeout(pushTimer); pushTimer = setTimeout(C.push, 2500); };
})();
