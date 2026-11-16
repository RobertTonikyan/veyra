// Veyra · push: sends Web Push notifications to subscribed browsers.
//   { type: 'welcome', endpoint }   from the app (user JWT): confirms this browser works
//   { type: 'activity', id }        from the database trigger (x-push-secret)
//   { type: 'tick' }                from pg_cron every 15 minutes (x-push-secret): due reminders
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// public key: safe to keep in code (the app ships the same one)
const VAPID_PUBLIC = (Deno.env.get("VAPID_PUBLIC_KEY") || "BNPhG7Ff33fDICydS3jK2bMhNcLvgpIqNSOJJrNZktuy2wNeg6VVJQPfEDfxLjPcyVI0gFSut3QaIfxmad9Q6m4").trim();
const VAPID_PRIVATE = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim();
let vapidReady = false;
let vapidError = "";
const secretsSeen = { public: !!Deno.env.get("VAPID_PUBLIC_KEY"), private: !!Deno.env.get("VAPID_PRIVATE_KEY") };
try {
  webpush.setVapidDetails("mailto:veyrarobert@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE);
  vapidReady = true;
} catch (e) {
  vapidError = (e as Error).message; // describes the problem, never the key
  console.error("VAPID keys missing or invalid", vapidError);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ---------------- texts (he / en / ru) ----------------
type Lang = "he" | "en" | "ru";
const lang = (l?: string | null): Lang => (l === "he" || l === "ru" ? l : "en");
const T = {
  welcome: { he: ["Veyra 👋", "ההתראות פועלות במכשיר הזה."], en: ["Veyra 👋", "Notifications work on this device."], ru: ["Veyra 👋", "Уведомления на этом устройстве работают."] },
  shopping: { he: "{n} הוסיף/ה לרשימה", en: "{n} added to the list", ru: "{n} добавил(а) в список" },
  chore: { he: "{n} סיימ/ה מטלה", en: "{n} finished a chore", ru: "{n} выполнил(а) дело" },
  rescue: { he: " · חילוץ!", en: " · rescue!", ru: " · спасение!" },
  expense: { he: "{n} הוסיף/ה הוצאה", en: "{n} added an expense", ru: "{n} добавил(а) расход" },
  settled: { he: "{n} העביר/ה לך {a}", en: "{n} paid you {a}", ru: "{n} перевёл(а) вам {a}" },
  joined: { he: "{n} הצטרף/ה לבית 🎉", en: "{n} joined the home 🎉", ru: "{n} присоединился(ась) к дому 🎉" },
  kudos: { he: "{n} אמר/ה לך תודה 🙏", en: "{n} said thanks 🙏", ru: "{n} говорит спасибо 🙏" },
  morning: { he: "בוקר טוב ☀️", en: "Good morning ☀️", ru: "Доброе утро ☀️" },
  choresToday: { he: "מטלות להיום: {x}", en: "Chores today: {x}", ru: "Дела на сегодня: {x}" },
  eventsToday: { he: "ביומן: {x}", en: "On the calendar: {x}", ru: "В календаре: {x}" },
  evening: { he: "עוד לא סומן ✓", en: "Not ticked yet ✓", ru: "Ещё не отмечено ✓" },
  eveningBody: { he: "{x} עדיין מחכה להיום", en: "{x} is still waiting for today", ru: "{x} всё ещё ждёт" },
  bday: { he: "היום יום ההולדת של {n} 🎂", en: "It's {n}'s birthday today 🎂", ru: "Сегодня день рождения у {n} 🎂" },
  bdayBody: { he: "זה הזמן לברכה.", en: "Time for a wish.", ru: "Самое время поздравить." },
  myBday: { he: "יום הולדת שמח! 🎉", en: "Happy birthday! 🎉", ru: "С днём рождения! 🎉" },
  myBdayBody: { he: "כל הבית חוגג איתך היום.", en: "The whole home is celebrating with you.", ru: "Весь дом празднует с тобой." },
  headsUp: { he: "עוד 3 ימים: יום ההולדת של {n}", en: "3 days to {n}'s birthday", ru: "Через 3 дня день рождения у {n}" },
  headsUpBody: { he: "יש עוד זמן לסדר מתנה 🎁", en: "Still time to sort out a gift 🎁", ru: "Ещё есть время найти подарок 🎁" },
  eventBody: { he: "מתחיל ב־{t}", en: "Starts at {t}", ru: "Начало в {t}" },
};
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const money = (agorot: number) => `₪${(agorot / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

// ---------------- sending ----------------
type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
type Msg = { title: string; body: string; url: string; tag?: string };

async function send(sub: Sub, msg: Msg) {
  if (!vapidReady) return false;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(msg),
      { TTL: 6 * 3600, urgency: "normal" },
    );
    await db.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("id", sub.id);
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", sub.id); // browser unsubscribed
    else console.error("push failed", code, (e as Error).message);
    return false;
  }
}

/** Send once per (user, key): the log row is written first, so retries never double-send. */
async function sendOnce(userId: string, key: string, subs: Sub[], msg: Msg) {
  const { error } = await db.from("push_log").insert({ user_id: userId, key });
  if (error) return; // already sent (primary key)
  await Promise.all(subs.map((s) => send(s, msg)));
}

// ---------------- activity ----------------
async function onActivity(id: number) {
  const { data: a } = await db.from("activity").select("id, household_id, actor, kind, ref_id, payload, created_at").eq("id", id).single();
  if (!a) return;
  const { data: actor } = await db.from("profiles").select("display_name").eq("id", a.actor).maybeSingle();
  const name = actor?.display_name || "?";
  const p = (a.payload ?? {}) as Record<string, unknown>;

  // who gets it: others in the house (or just the one person it is about)
  const { data: members } = await db.from("household_members").select("user_id").eq("household_id", a.household_id);
  let targets = (members ?? []).map((m) => m.user_id).filter((u) => u && u !== a.actor);
  if (a.kind === "settled" || a.kind === "kudos") targets = targets.filter((u) => u === p.to);
  if (!targets.length) return;

  const { data: subs } = await db.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", targets).eq("activity", true);
  if (!subs?.length) return;
  const { data: profs } = await db.from("profiles").select("id, language, status").in("id", targets);
  const langOf = new Map((profs ?? []).filter((x) => x.status === "active").map((x) => [x.id, lang(x.language)]));

  // shopping: one notification per person, updated as items keep coming (same tag)
  let shopNames: string[] = [];
  if (a.kind === "shopping_added") {
    const since = new Date(new Date(a.created_at).getTime() - 10 * 60_000).toISOString();
    const { data: recent } = await db.from("activity").select("payload").eq("household_id", a.household_id)
      .eq("actor", a.actor).eq("kind", "shopping_added").gte("created_at", since).lte("id", a.id).order("id", { ascending: false }).limit(12);
    shopNames = (recent ?? []).map((r) => String((r.payload as { name?: string })?.name ?? "")).filter(Boolean).reverse();
  }

  await Promise.all(subs.map((s) => {
    const L = langOf.get(s.user_id);
    if (!L) return null;
    let msg: Msg | null = null;
    switch (a.kind) {
      case "shopping_added":
        msg = { title: fill(T.shopping[L], { n: name }), body: shopNames.slice(-6).join(", ") + (shopNames.length > 6 ? "…" : ""), url: "/shopping", tag: `shop-${a.household_id}-${a.actor}` };
        break;
      case "chore_done":
        msg = { title: fill(T.chore[L], { n: name }), body: `${p.title ?? ""} · +${p.points ?? 0}${p.rescue ? T.rescue[L] : ""}`, url: "/chores" };
        break;
      case "expense_added":
        msg = { title: fill(T.expense[L], { n: name }), body: `${p.title ?? ""} · ${money(Number(p.amount_agorot ?? 0))}`, url: "/money" };
        break;
      case "settled":
        msg = { title: fill(T.settled[L], { n: name, a: money(Number(p.amount_agorot ?? 0)) }), body: "", url: "/money" };
        break;
      case "member_joined":
        msg = { title: fill(T.joined[L], { n: name }), body: "", url: "/" };
        break;
      case "kudos":
        msg = { title: fill(T.kudos[L], { n: name }), body: "", url: "/" };
        break;
    }
    return msg ? send(s, msg) : null;
  }));
}

// ---------------- scheduled reminders ----------------
function localParts(tz: string, d = new Date()) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const o = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${o.year}-${o.month}-${o.day}`, minutes: Number(o.hour) * 60 + Number(o.minute), month: Number(o.month), day: Number(o.day) };
}
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
function bdayIs(m: number | null, d: number | null, date: string) {
  if (!m || !d) return false;
  const [y, mm, dd] = date.split("-").map(Number);
  return m === mm && (d === dd || (m === 2 && d === 29 && !isLeap(y) && dd === 28));
}
function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
/** "due" = the moment passed within the last 20 minutes (ticks run every 15). */
const dueAt = (targetMin: number, nowMin: number) => nowMin >= targetMin && nowMin - targetMin < 20;

async function onTick() {
  const { data: subs } = await db.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").eq("reminders", true);
  if (!subs?.length) return { users: 0 };
  const byUser = new Map<string, Sub[]>();
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  const userIds = [...byUser.keys()];

  const { data: profs } = await db.from("profiles").select("id, display_name, language, reminder_time, reminders_on, status, birth_month, birth_day").in("id", userIds);
  const { data: mems } = await db.from("household_members").select("user_id, household_id, households ( id, timezone, type, birthday_heads_up )").in("user_id", userIds);

  const now = new Date();
  for (const prof of profs ?? []) {
    if (prof.status !== "active") continue;
    const mem = (mems ?? []).find((m) => m.user_id === prof.id);
    const house = mem?.households as unknown as { id: string; timezone: string; type: string; birthday_heads_up: boolean | null } | null;
    if (!house) continue;
    const L = lang(prof.language);
    const tz = house.timezone || "Asia/Jerusalem";
    const { date, minutes } = localParts(tz, now);
    const mySubs = byUser.get(prof.id)!;

    // chores due today or earlier, mine or anyone's
    const { data: chores } = await db.from("chores").select("title, due_date, assignee").eq("household_id", house.id)
      .is("archived_at", null).lte("due_date", date).or(`assignee.is.null,assignee.eq.${prof.id}`).order("due_date");
    const choreTitles = (chores ?? []).map((c) => c.title);

    // events: today's (for the morning) and soon-starting (for the reminder)
    const dayStart = new Date(now.getTime() - 26 * 3600_000).toISOString();
    const dayEnd = new Date(now.getTime() + 26 * 3600_000).toISOString();
    const { data: events } = await db.from("events").select("id, title, starts_at, all_day, reminder_minutes").eq("household_id", house.id)
      .gte("starts_at", dayStart).lt("starts_at", dayEnd).order("starts_at");
    const todays = (events ?? []).filter((e) => localParts(tz, new Date(e.starts_at)).date === date);

    // morning summary
    if (prof.reminders_on !== false) {
      const [hh, mm] = String(prof.reminder_time ?? "08:30").split(":").map(Number);
      if (dueAt(hh * 60 + mm, minutes) && (choreTitles.length || todays.length)) {
        const lines: string[] = [];
        if (choreTitles.length) lines.push(fill(T.choresToday[L], { x: choreTitles.slice(0, 3).join(", ") + (choreTitles.length > 3 ? "…" : "") }));
        if (todays.length) lines.push(fill(T.eventsToday[L], { x: todays.slice(0, 3).map((e) => e.title).join(", ") }));
        await sendOnce(prof.id, `morning:${date}`, mySubs, { title: T.morning[L], body: lines.join("\n"), url: "/" });
      }
    }
    // evening nudge
    if (dueAt(19 * 60, minutes) && choreTitles.length) {
      await sendOnce(prof.id, `evening:${date}`, mySubs, { title: T.evening[L], body: fill(T.eveningBody[L], { x: choreTitles[0] }), url: "/chores" });
    }
    // birthdays (09:00)
    if (dueAt(9 * 60, minutes)) {
      const { data: hm } = await db.from("household_members").select("user_id, profiles ( display_name, birth_month, birth_day )").eq("household_id", house.id);
      const headsUp = house.birthday_heads_up ?? house.type === "couple";
      for (const m of hm ?? []) {
        const pr = m.profiles as unknown as { display_name: string; birth_month: number | null; birth_day: number | null } | null;
        if (!pr) continue;
        if (bdayIs(pr.birth_month, pr.birth_day, date)) {
          const mine = m.user_id === prof.id;
          await sendOnce(prof.id, `bday:${m.user_id}:${date}`, mySubs, mine
            ? { title: T.myBday[L], body: T.myBdayBody[L], url: "/" }
            : { title: fill(T.bday[L], { n: pr.display_name }), body: T.bdayBody[L], url: "/" });
        } else if (headsUp && m.user_id !== prof.id && bdayIs(pr.birth_month, pr.birth_day, addDays(date, 3))) {
          await sendOnce(prof.id, `headsup:${m.user_id}:${date}`, mySubs, { title: fill(T.headsUp[L], { n: pr.display_name }), body: T.headsUpBody[L], url: "/" });
        }
      }
    }
    // events: a while before they start
    for (const e of events ?? []) {
      if (e.all_day) continue;
      const start = new Date(e.starts_at).getTime();
      const fireAt = start - (e.reminder_minutes ?? 30) * 60_000;
      if (now.getTime() >= fireAt && now.getTime() - fireAt < 20 * 60_000 && now.getTime() < start) {
        const t = new Intl.DateTimeFormat(L, { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(start));
        await sendOnce(prof.id, `event:${e.id}:${e.starts_at}`, mySubs, { title: e.title, body: fill(T.eventBody[L], { t }), url: "/calendar" });
      }
    }
  }
  return { users: userIds.length };
}

// ---------------- entry ----------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { type?: string; id?: number; endpoint?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  if (body.type === "welcome") {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const { data: u } = await db.auth.getUser(token);
    if (!u?.user || !body.endpoint) return json({ error: "unauthorized" }, 401);
    const { data: sub } = await db.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth, profiles ( language )")
      .eq("endpoint", body.endpoint).eq("user_id", u.user.id).maybeSingle();
    if (!sub) return json({ error: "not_found" }, 404);
    const L = lang((sub.profiles as unknown as { language?: string } | null)?.language);
    const ok = await send(sub as Sub, { title: T.welcome[L][0], body: T.welcome[L][1], url: "/" });
    return json({ ok, vapid: vapidReady, vapidError, secretsSeen });
  }

  // database calls: must carry the shared secret
  const secret = req.headers.get("x-push-secret") ?? "";
  const { data: okSecret } = await db.rpc("push_secret_ok", { p_secret: secret });
  if (!okSecret) return json({ error: "forbidden" }, 403);

  if (body.type === "activity" && typeof body.id === "number") { await onActivity(body.id); return json({ ok: true }); }
  if (body.type === "tick") return json({ ...(await onTick()), vapid: vapidReady, vapidError, secretsSeen });
  return json({ error: "unknown_type" }, 400);
});
