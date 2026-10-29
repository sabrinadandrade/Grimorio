/* Avisos com o app fechado (Web Push) / closed-app notifications (Web Push)
 * Funciona no iPhone (16.4+, app instalado na Tela de Início), Android (Chrome) e computador.
 * O aparelho se inscreve e o servidor (Supabase · send-reminders) manda o aviso na hora do lembrete. */
window.G = window.G || {};
(function () {
  const P = G.push = { status: "off" };
  const b64ToU8 = s => { const p = "=".repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
  P.isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  P.standalone = () => !!(window.navigator.standalone || matchMedia("(display-mode: standalone)").matches);
  P.supported = () => !G.isNative() && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && location.protocol.startsWith("http") && !!(G.CONFIG && G.CONFIG.vapidPublicKey);
  P.needsInstall = () => P.isIOS() && !P.standalone();
  P.refresh = async function () {
    if (P.needsInstall()) { P.status = "install"; return P.status; }
    if (!P.supported()) { P.status = P.needsInstall() ? "install" : "unsupported"; return P.status; }
    try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); P.status = sub ? "on" : "off"; } catch (e) { P.status = "off"; }
    return P.status;
  };
  P.enable = async function () {
    if (!G.cloud || !G.cloud.user) throw new Error(G.t("pushNeedCloud"));
    if ((await Notification.requestPermission()) !== "granted") throw new Error(G.t("notifDenied"));
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(G.CONFIG.vapidPublicKey) });
    const j = sub.toJSON();
    const { error } = await G.cloud.client.from("push_subscriptions").upsert({ endpoint: j.endpoint, user_id: G.cloud.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth, tz: G.state.tz || "America/Sao_Paulo" });
    if (error) throw error;
    P.status = "on"; return true;
  };
  P.disable = async function () {
    const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription();
    if (sub) { try { if (G.cloud && G.cloud.client) await G.cloud.client.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); } catch (e) { } await sub.unsubscribe(); }
    P.status = "off";
  };
})();
