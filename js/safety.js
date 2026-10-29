/* Proteção de dados / data safety
 * 1) Espelho em IndexedDB (sobrevive se o localStorage for limpo) + pedido de armazenamento persistente
 * 2) Backup automático num arquivo do computador (File System Access API — Chrome/Edge)
 * 3) Snapshots antes de operações perigosas (importar backup, baixar da nuvem)
 * 1) IndexedDB mirror + persistent storage request  2) auto-backup to a local file  3) safety snapshots */
window.G = window.G || {};
(function () {
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!("indexedDB" in window)) return rej(new Error("no idb"));
      const r = indexedDB.open("grimorio", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  G.idbGet = k => db().then(d => new Promise((res, rej) => { const q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); })).catch(() => undefined);
  G.idbSet = (k, v) => db().then(d => new Promise((res, rej) => { const tx = d.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); })).catch(() => false);

  G.safety = { persisted: false, fileHandle: null, fileStatus: "off", lastFileWrite: 0 };

  /* armazenamento persistente / persistent storage */
  G.safety.requestPersist = async function () {
    try { if (navigator.storage && navigator.storage.persist) G.safety.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist()); } catch (e) { }
    return G.safety.persisted;
  };

  /* recuperação: usa a cópia mais nova entre localStorage e IndexedDB / recover newest copy */
  G.safety.recover = async function () {
    const copy = await G.idbGet("state");
    if (copy && (copy.updatedAt || 0) > (G.state.updatedAt || 0)) {
      G.state = Object.assign(G.defaultState(), copy); G.lang = G.state.lang;
      try { localStorage.setItem(G.STORE_KEY, JSON.stringify(G.state)); } catch (e) { }
      return true;
    }
    return false;
  };
  G.safety.mirror = () => G.idbSet("state", JSON.parse(JSON.stringify(G.state)));
  G.safety.snapshot = async function (reason) {
    const list = (await G.idbGet("snapshots")) || [];
    list.unshift({ at: Date.now(), reason, state: JSON.parse(JSON.stringify(G.state)) });
    await G.idbSet("snapshots", list.slice(0, 5));
  };
  G.safety.snapshots = async () => (await G.idbGet("snapshots")) || [];

  /* backup automático em arquivo / auto file backup */
  G.safety.fileSupported = () => "showSaveFilePicker" in window;
  G.safety.initFile = async function () {
    if (!G.safety.fileSupported()) { G.safety.fileStatus = "unsupported"; return; }
    const h = await G.idbGet("fileHandle");
    if (!h) { G.safety.fileStatus = "off"; return; }
    G.safety.fileHandle = h;
    try { G.safety.fileStatus = (await h.queryPermission({ mode: "readwrite" })) === "granted" ? "on" : "paused"; } catch (e) { G.safety.fileStatus = "paused"; }
  };
  G.safety.enableFile = async function () {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: "grimorio-backup-automatico.json", types: [{ description: "Grimório backup", accept: { "application/json": [".json"] } }] });
      G.safety.fileHandle = h; await G.idbSet("fileHandle", h); G.safety.fileStatus = "on"; await G.safety.writeFile(); return true;
    } catch (e) { return false; }
  };
  G.safety.resumeFile = async function () {
    const h = G.safety.fileHandle; if (!h) return G.safety.enableFile();
    try { if ((await h.requestPermission({ mode: "readwrite" })) === "granted") { G.safety.fileStatus = "on"; await G.safety.writeFile(); return true; } } catch (e) { }
    return false;
  };
  G.safety.disableFile = async function () { G.safety.fileHandle = null; G.safety.fileStatus = "off"; await G.idbSet("fileHandle", null); };
  G.safety.writeFile = async function () {
    if (G.safety.fileStatus !== "on" || !G.safety.fileHandle) return false;
    try {
      const w = await G.safety.fileHandle.createWritable();
      await w.write(JSON.stringify(G.state, null, 2)); await w.close();
      G.safety.lastFileWrite = Date.now(); G.state.lastBackupAt = Date.now();
      try { localStorage.setItem(G.STORE_KEY, JSON.stringify(G.state)); } catch (e) { }
      return true;
    } catch (e) { G.safety.fileStatus = "paused"; return false; }
  };
  let ft = null;
  G.safety.scheduleFile = () => { if (G.safety.fileStatus !== "on") return; clearTimeout(ft); ft = setTimeout(G.safety.writeFile, 4000); };

  /* precisa lembrar de fazer backup? / backup reminder needed? */
  G.safety.needsReminder = () => {
    if (!G.state.subjects.length) return false;
    if (G.safety.fileStatus === "on") return false;
    if (G.cloud && G.cloud.user) return false;
    return Date.now() - (G.state.lastBackupAt || G.state.createdAt || Date.now()) > 7 * 864e5;
  };
})();
