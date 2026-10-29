// Grimório · send-reminders (Supabase Edge Function)
// Roda a cada minuto (pg_cron). Lê os grimórios com aparelhos inscritos, acha os lembretes que
// venceram no último minuto (no fuso de cada pessoa) e envia Web Push. Chamar várias vezes é seguro:
// cada lembrete é enviado uma única vez (tabela push_sent).
// Secret necessário: VAPID_PRIVATE_KEY. (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem.)
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = "BCOCBuHyt0Kpy3IPggAHgJd8jDnoJdpy7HGsmjOk6MaItPmFDCzrFjgAcTLltQyAobdLP6wTs05fyqIqZ4rRCgE";
const VAPID_SUBJECT = "https://sabrinadandrade.github.io/Grimorio/";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
function localNow(tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: (+p.hour) * 60 + (+p.minute) };
}
function addDays(d: string, n: number) { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
const dow = (d: string) => new Date(d + "T12:00:00Z").getUTCDay();
// deno-lint-ignore no-explicit-any
function occursOn(a: any, d: string) {
  const start = a.date || d;
  if (a.repeat === "daily") return d >= start;
  if (a.repeat === "weekly") return d >= start && (a.days || []).includes(dow(d));
  return a.date === d;
}
const AREA: Record<string, string> = { study: "📚", daily: "☀️", home: "🏠", pets: "🐾", kids: "🍼", work: "💼", personal: "📅", health: "💚" };

Deno.serve(async () => {
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!priv) return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY não configurada" }), { status: 500 });
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, priv);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: subs, error } = await db.from("push_subscriptions").select("*");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const users = [...new Set((subs || []).map((s) => s.user_id))];
  if (!users.length) return new Response(JSON.stringify({ users: 0, sent: 0 }));
  const { data: gs } = await db.from("grimoires").select("user_id, data").in("user_id", users);

  let sent = 0;
  for (const g of gs || []) {
    const mySubs = (subs || []).filter((s) => s.user_id === g.user_id);
    const tz = (g.data && g.data.tz) || mySubs[0]?.tz || "America/Sao_Paulo";
    const now = localNow(tz);
    const name = ((g.data && g.data.owner && g.data.owner.name) || "").trim();
    const done = (g.data && g.data.actDone) || {};
    // Cofre ligado: o servidor não lê nada; só tem os HORÁRIOS (ms) dos próximos lembretes.
    // Vault on: the server can't read anything, it only has upcoming reminder TIMES (ms).
    if (g.data && g.data.enc === 1) {
      const nowMs = Date.now();
      for (const fire of (Array.isArray(g.data.sched) ? g.data.sched : [])) {
        if (typeof fire !== "number" || fire > nowMs || fire < nowMs - 3 * 60000) continue;
        const key = `${g.user_id}|enc|${fire}`;
        const { error: dup } = await db.from("push_sent").insert({ key });
        if (dup) continue;
        const payload = JSON.stringify({ title: "🔔 Grimório", body: "Você tem um lembrete! Abra o app para ver 💜", tag: key });
        for (const s of mySubs) {
          try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "high" }); sent++; }
          catch (e) {
            // deno-lint-ignore no-explicit-any
            const code = (e as any)?.statusCode;
            if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
        }
      }
      continue;
    }
    for (const a of (g.data && g.data.activities) || []) {
      if (a.remind == null || a.remind < 0 || !a.time) continue;
      const [hh, mm] = String(a.time).split(":").map(Number);
      for (const off of [0, 1, 2]) { // hoje, amanhã e depois (lembretes de 1 dia antes)
        const d = addDays(now.date, off);
        if (!occursOn(a, d) || done[a.id + "|" + d]) continue;
        const fireMin = off * 1440 + hh * 60 + mm - a.remind; // minutos a partir de hoje 00:00
        if (fireMin > now.minutes || fireMin < now.minutes - 3) continue; // venceu nos últimos 3 min
        const key = `${g.user_id}|${a.id}|${d}|${a.time}`;
        const { error: dup } = await db.from("push_sent").insert({ key });
        if (dup) continue; // já enviado
        const mins = off * 1440 + hh * 60 + mm - now.minutes;
        const when = mins <= 0 ? "É agora!" : mins < 90 ? `Daqui a ${mins} min!` : mins < 1440 ? `Hoje às ${a.time}.` : `Amanhã às ${a.time}.`;
        const payload = JSON.stringify({ title: `${AREA[a.area] || "✨"} ${a.title}`, body: (name ? `Ei, ${name}! ` : "") + when, tag: key });
        for (const s of mySubs) {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "high" });
            sent++;
          } catch (e) {
            // deno-lint-ignore no-explicit-any
            const code = (e as any)?.statusCode;
            if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
        }
      }
    }
  }
  return new Response(JSON.stringify({ users: users.length, sent }), { headers: { "Content-Type": "application/json" } });
});
