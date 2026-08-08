import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useApp } from "../../context/AppContext";
import { useSession } from "../../hooks/useSession";
import { adminRequest } from "../../lib/api";
import { registerBack } from "../../lib/back";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS } from "../../lib/products";
import { parseSingleIngredient, mergeBrokenEntries } from "../../lib/recipe-utils";
import { hapticNotification, hapticSelection } from "../../lib/telegram";
import ImageUploader from "./ImageUploader";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#DB2777]/40";

// ✅ 60s kesh — tab almashtirganda QOTMAYDI
const adminCache = new Map<string, { ts: number; data: any }>();
function cached<T = any>(key: string): T | null {
  const e = adminCache.get(key);
  return e && Date.now() - e.ts < 60_000 ? (e.data as T) : null;
}
function remember(key: string, data: any) { adminCache.set(key, { ts: Date.now(), data }); }
function forget(key: string) { adminCache.delete(key); }

function AdminSkeleton({ h = "h-24" }: { h?: string }) {
  return (
    <div
      className={`${h} animate-pulse rounded-3xl bg-slate-200/70`}
    />
  );
}

function parseMaybeJson(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

function ingredientsToLines(list: any[]): string {
  const merged = mergeBrokenEntries(list);
  const out: string[] = [];
  for (const raw of merged) {
    const name = String(raw?.name ?? "");
    const parts = name.split(/\\n|\n/).map((s: string) => s.trim()).filter(Boolean);
    const pieces = parts.length ? parts : [name.trim()];
    for (const line of pieces) {
      if (/:\s*$/.test(line)) { out.push(line); continue; }
      const p = parseSingleIngredient(line);
      if (!p.name) continue;
      const q = pieces.length === 1 && typeof raw?.quantity === "number" ? raw.quantity : p.quantity;
      const u = pieces.length === 1 && raw?.unit ? raw.unit : p.unit;
      const seg = [p.name];
      if (q != null) seg.push(String(q));
      if (u) seg.push(u);
      out.push(seg.join(" | "));
    }
  }
  return out.join("\n");
}

function linesToIngredients(text: string): any[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try { const arr = JSON.parse(trimmed); if (Array.isArray(arr)) return arr; } catch {}
  }
  return trimmed.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split("|").map((s) => s.trim());
    const [name, qty, unit] = parts;
    const item: any = { name: name || line };
    if (qty) {
      const num = Number(qty.replace(",", "."));
      if (!Number.isNaN(num)) item.quantity = num;
      else item.name = `${name} (${qty})`;
    }
    if (unit) item.unit = unit;
    return item;
  });
}

function stepsToLines(list: any[]): string {
  return list
    .map((s) => {
      const text = String(s?.text ?? "").replace(/\\n|\n/g, " ").trim();
      const timer = typeof s?.timer_seconds === "number" && s.timer_seconds ? ` | ${s.timer_seconds}` : "";
      return text ? text + timer : "";
    })
    .filter(Boolean)
    .join("\n");
}

function linesToSteps(text: string): any[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try { const arr = JSON.parse(trimmed); if (Array.isArray(arr)) return arr; } catch {}
  }
  return trimmed.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const m = line.match(/^(.*?)\s*\|\s*(\d+)\s*$/);
    if (m) return { text: m[1], timer_seconds: Number(m[2]) };
    return { text: line };
  });
}

const TABS = [
  { id: "stats", label: "📊 Statistika" },
  { id: "users", label: "👥 Foydalanuvchilar" },
  { id: "payments", label: "💳 To'lovlar" },
  { id: "broadcast", label: "📣 Broadcast" },
  { id: "recipes", label: "🍳 Retseptlar" },
  { id: "lifehacks", label: "💡 Lifehacklar" },
  { id: "cats", label: "📁 Kategoriyalar" },
  { id: "products", label: "🧺 Mahsulotlar" },
  { id: "banner", label: "🖼 Banner" },
];

function AdminInner() {
  const { closeModal, format, user } = useApp();
  const { loading, isAdmin } = useSession();

  const isUserAdmin = isAdmin || user.id === 8544023815;

  useEffect(() => {
    return registerBack(() => {
      closeModal();
      return true;
    }, 100);
  }, [closeModal]);

  const [tab, setTab] = useState<
    "stats" | "users" | "payments" | "broadcast" | "recipes" | "banner" | "lifehacks" | "cats" | "products"
  >("stats");

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    tabRefs.current[tab]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [tab]);

  return (
    <div className="fixed inset-0 z-[90] bg-slate-50">
      <div className="safe-top mx-auto flex h-full w-full max-w-md flex-col">
        <header className="glass border-b border-slate-100/80">
          <div className="flex h-14 items-center justify-between px-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              {format("🛠 Admin panel")}
            </h2>

            <button
              onClick={() => closeModal()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pt-3 pb-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              ref={(el) => { tabRefs.current[item.id] = el; }}
              onClick={() => { hapticSelection(); setTab(item.id as any); }}
              className={
                tab === item.id
                  ? "shrink-0 rounded-2xl bg-[#DB2777] px-3 py-2 text-xs font-extrabold text-white shadow"
                  : "shrink-0 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm"
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto px-4 pb-10 pt-4">
          {loading ? (
            <div className="space-y-3">
              <AdminSkeleton h="h-24" />
              <AdminSkeleton h="h-24" />
            </div>
          ) : !isUserAdmin ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
              {format("Bu bo'lim faqat admin uchun.")}
            </div>
          ) : (
            <>
              {tab === "stats" ? <StatsAdmin /> : null}
              {tab === "users" ? <UsersAdmin /> : null}
              {tab === "payments" ? <PaymentsAdmin /> : null}
              {tab === "broadcast" ? <BroadcastAdmin /> : null}
              {tab === "recipes" ? <RecipesAdmin /> : null}
              {tab === "lifehacks" ? <LifehacksAdmin /> : null}
              {tab === "cats" ? <CategoriesAdmin /> : null}
              {tab === "products" ? <ProductCatalogAdmin /> : null}
              {tab === "banner" ? <BannerAdmin /> : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// =====================
// STATS ADMIN
// =====================
function StatsAdmin() {
  const { format } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const c = cached<any>("stats");
    if (c) { setStats(c); setLoading(false); }
    adminRequest("stats")
      .then((r) => { setStats(r.data); remember("stats", r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading && !stats) return <AdminSkeleton h="h-40" />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400">{format("Foydalanuvchilar")}</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900">{stats?.total_users ?? 0}</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400">{format("Premium a'zolar")}</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-pink-600">{stats?.premium_users ?? 0}</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400">{format("Retseptlar")}</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900">{stats?.total_recipes ?? 0}</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400">{format("Lifehacklar")}</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900">{stats?.total_lifehacks ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

// =====================
// USERS ADMIN
// =====================
function UsersAdmin() {
  const { format } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q?: string) => {
    const key = `users:${q ?? "all"}`;
    const c = cached<any[]>(key);
    if (c) { setUsers(c); setLoading(false); }
    try {
      const res = await adminRequest("list_users", q ? { search: q } : {});
      setUsers(res.data ?? []);
      remember(key, res.data ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleBan = async (telegramId: number) => {
    await adminRequest("toggle_ban", { telegram_id: telegramId });
    forget("users:all");
    load(search || undefined);
  };

  const grantPremium = async (telegramId: number) => {
    await adminRequest("grant_premium", { telegram_id: telegramId, days: 30 });
    forget("users:all");
    load(search || undefined);
  };

  const revokePremium = async (telegramId: number) => {
    await adminRequest("revoke_premium", { telegram_id: telegramId });
    forget("users:all");
    load(search || undefined);
  };

  const extendPremium = async (telegramId: number) => {
    await adminRequest("extend_premium", { telegram_id: telegramId, days: 30 });
    forget("users:all");
    load(search || undefined);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(search || undefined); }}
          placeholder={format("Search ID / @username / ism...")}
          className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
        />
        <button
          onClick={() => load(search || undefined)}
          className="h-11 rounded-2xl bg-slate-900 px-4 text-sm font-extrabold text-white"
        >
          🔎
        </button>
      </div>

      {loading && users.length === 0 ? (
        <AdminSkeleton h="h-32" />
      ) : users.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {format("Foydalanuvchilar topilmadi")}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.telegram_id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {u.first_name} {u.last_name ?? ""}
                  </p>
                  <p className="text-xs text-slate-400">
                    {u.username ? `@${u.username}` : "-"} • ID: {u.telegram_id}
                  </p>
                  <div className="mt-1 flex gap-1">
                    {u.is_premium ? (
                      <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[9px] font-bold text-pink-600">Premium</span>
                    ) : null}
                    {u.is_banned ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-600">Banned</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => toggleBan(u.telegram_id)}
                    className={
                      u.is_banned
                        ? "rounded-xl bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600"
                        : "rounded-xl bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600"
                    }
                  >
                    {u.is_banned ? format("Unban") : format("Ban")}
                  </button>

                  {u.is_premium ? (
                    <button
                      onClick={() => extendPremium(u.telegram_id)}
                      className="rounded-xl bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-600"
                    >
                      {format("+30 kun uzaytirish")}
                    </button>
                  ) : (
                    <button
                      onClick={() => grantPremium(u.telegram_id)}
                      className="rounded-xl bg-pink-50 px-2 py-1 text-[10px] font-bold text-pink-600"
                    >
                      {format("Premium berish")}
                    </button>
                  )}
                  {u.is_premium ? (
                    <button
                      onClick={() => revokePremium(u.telegram_id)}
                      className="rounded-xl bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"
                    >
                      {format("Premium olish")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CardSettings() {
  const { format } = useApp();
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminRequest("get_payment_card")
      .then((res) => {
        const v = res.data?.value;
        if (v) {
          setCardNumber(v.card_number ?? "");
          setCardHolder(v.card_holder ?? "");
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    await adminRequest("save_payment_card", { card_number: cardNumber, card_holder: cardHolder });
    hapticNotification("success");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-2 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-extrabold text-slate-700">{format("💳 To'lov kartasi (bot va ilovada ko'rinadi)")}</p>
      <input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="8600 0000 0000 0000" className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none" />
      <input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder="Karta egasi ismi" className="h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm outline-none" />
      <button onClick={save} className="h-10 w-full rounded-2xl bg-[#DB2777] text-xs font-extrabold text-white">
        {saved ? format("✅ Saqlandi") : format("Saqlash")}
      </button>
    </div>
  );
}

// =====================
// PAYMENTS ADMIN
// =====================
function PaymentsAdmin() {
  const { format } = useApp();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (st: string) => {
    const key = `pay:${st}`;
    const c = cached<any[]>(key);
    if (c) { setPayments(c); setLoading(false); }
    try {
      const res = await adminRequest("list_payments", { status: st });
      setPayments(res.data ?? []);
      remember(key, res.data ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(status); }, [status, load]);

  const approve = async (requestId: string) => {
    await adminRequest("approve_payment", { request_id: requestId });
    forget(`pay:${status}`);
    load(status);
  };

  const reject = async (requestId: string) => {
    await adminRequest("reject_payment", { request_id: requestId });
    forget(`pay:${status}`);
    load(status);
  };

  return (
    <div className="space-y-3">
      <CardSettings />
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((st) => (
          <button key={st} onClick={() => { hapticSelection(); setStatus(st); }}
            className={`flex-1 rounded-2xl px-2 py-2 text-[11px] font-extrabold ${status === st ? "bg-[#DB2777] text-white" : "bg-white text-slate-500 shadow-sm"}`}>
            {st === "pending" ? format("⏳ Kutilmoqda") : st === "approved" ? format("✅ Tasdiqlangan") : format("❌ Rad etilgan")}
          </button>
        ))}
      </div>
      {loading && payments.length === 0 ? (
        <AdminSkeleton h="h-32" />
      ) : payments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {format("So'rovlar yo'q")}
        </div>
      ) : (
        payments.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-3">
              {p.screenshot_url ? (
                <img src={p.screenshot_url} alt="check" className="h-20 w-20 rounded-xl object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-2xl">🧾</div>
              )}
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">ID: {p.user_telegram_id}</p>
                <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleString()}</p>
                {status === "pending" ? (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => approve(p.id)} className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">✅</button>
                    <button onClick={() => reject(p.id)} className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">❌</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// =====================
// BROADCAST ADMIN
// =====================
function BroadcastAdmin() {
  const { format } = useApp();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ sent: number; failed: number } | null>(null);

  const send = async () => {
    if (!text.trim() || sending) return;

    if (!window.confirm(format("Barcha foydalanuvchilarga xabar yuborilsinmi?"))) return;

    setSending(true);
    setResult(null);
    setProgress(null);

    try {
      let r = await adminRequest("broadcast", { text: text.trim() });
      while (r && r.status === "running") {
        setProgress({ sent: r.sent ?? 0, failed: r.failed ?? 0 });
        await new Promise((s) => setTimeout(s, 2500));
        r = await adminRequest("broadcast", { continue: true });
      }
      setResult(format(`Yuborildi: ${r?.sent ?? 0}, Xato: ${r?.failed ?? 0}`));
      hapticNotification("success");
      setText("");
    } catch (err: any) {
      setResult(err?.message ?? format("Xatolik"));
    } finally {
      setSending(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">
        {format("Barcha foydalanuvchilarga xabar yuborish")}
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={format("Xabar matni...")}
        className="h-32 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#DB2777]/40"
      />

      {progress ? (
        <div className="rounded-2xl bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700">
          ⏳ {progress.sent} ta yuborildi...
        </div>
      ) : null}

      {result ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
          {result}
        </div>
      ) : null}

      <button
        onClick={send}
        disabled={sending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white disabled:opacity-50"
      >
        {sending ? format("Yuborilmoqda...") : format("📣 Yuborish")}
      </button>
    </div>
  );
}

// =========================
// RECIPES ADMIN
// =========================

interface RecipeListItem {
  id: number;
  title: string;
  category?: string;
  is_published: boolean;
}

interface RecipeFormState {
  id?: number;
  title: string;
  category: string;
  description: string;
  image_url: string;
  emoji: string;
  cook_time_minutes: string;
  difficulty: string;
  servings: string;
  is_published: boolean;
  ingredients_text: string;
  steps_text: string;
}

const emptyRecipeForm: RecipeFormState = {
  title: "",
  category: "",
  description: "",
  image_url: "",
  emoji: "",
  cook_time_minutes: "",
  difficulty: "oson",
  servings: "4",
  is_published: true,
  ingredients_text: "",
  steps_text: "",
};

function RecipesAdmin() {
  const { format } = useApp();

  const [items, setItems] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "form">("list");
  const [form, setForm] = useState<RecipeFormState>(emptyRecipeForm);

  const load = useCallback(async () => {
    const key = "recipes:list";
    const c = cached<any[]>(key);
    if (c) { setItems(c); setLoading(false); }

    try {
      const response = await adminRequest("list_recipes");
      setItems(response.data ?? []);
      remember(key, response.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik"));
    } finally {
      setLoading(false);
    }
  }, [format]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyRecipeForm);
    setView("form");
  };

  const openEdit = async (item: RecipeListItem) => {
    setError(null);
    try {
      const response = await adminRequest("get_recipe", { id: item.id });
      const full = response.data;
      if (!full) return;

      setForm({
        id: full.id,
        title: full.title ?? "",
        category: full.category ?? "",
        description: full.description ?? "",
        image_url: full.image_url ?? "",
        emoji: full.emoji ?? "",
        cook_time_minutes: String(full.cook_time_minutes ?? ""),
        difficulty: full.difficulty ?? "oson",
        servings: String(full.servings ?? "4"),
        is_published: Boolean(full.is_published),
        ingredients_text: ingredientsToLines(parseMaybeJson(full.ingredients)),
        steps_text: stepsToLines(parseMaybeJson(full.steps)),
      });

      setView("form");
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik"));
    }
  };

  const save = async () => {
    setError(null);

    const ingredients = linesToIngredients(form.ingredients_text);
    const steps = linesToSteps(form.steps_text);

    const payload: any = {
      title: form.title.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      emoji: form.emoji.trim() || null,
      cook_time_minutes: form.cook_time_minutes
        ? Number(form.cook_time_minutes)
        : null,
      difficulty: form.difficulty || null,
      servings: form.servings ? Number(form.servings) : 4,
      is_published: form.is_published,
      ingredients,
      steps,
    };

    if (form.id) {
      payload.id = form.id;
    }

    try {
      await adminRequest("upsert_recipe", payload);
      forget("recipes:list");
      hapticNotification("success");
      await load();
      setView("list");
    } catch (err: any) {
      setError(err?.message ?? format("Saqlashda xatolik"));
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(format("Retsept o‘chirilsinmi?"))) return;

    try {
      await adminRequest("delete_recipe", { id });
      forget("recipes:list");
      hapticNotification("success");
      await load();
    } catch (err: any) {
      setError(err?.message ?? format("O‘chirishda xatolik"));
    }
  };

  if (view === "form") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setView("list")}
          className="h-10 rounded-2xl bg-slate-100 px-4 text-xs font-bold text-slate-700"
        >
          ← {format("Orqaga ro'yxatga")}
        </button>

        {error ? (
          <div className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        ) : null}

        <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <label className="text-xs font-bold text-slate-500">{format("Sarlavha")}</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder={format("Retsept nomi")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">{format("Kategoriya")}</label>
            <input
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder={format("Masalan: Asosiy taom")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">{format("Emoji (rasm bo'lmaganda ko'rinadi)")}</label>
            <input
              value={form.emoji}
              onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
              placeholder="🍲"
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">{format("Tavsif")}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder={format("Qisqacha tavsif")}
              className="h-20 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">{format("Rasm URL")}</label>
            <ImageUploader
              value={form.image_url}
              onChange={(url) => setForm((p) => ({ ...p, image_url: url }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-500">{format("Vaqt (daq)")}</label>
              <input
                type="number"
                value={form.cook_time_minutes}
                onChange={(e) => setForm((p) => ({ ...p, cook_time_minutes: e.target.value }))}
                placeholder="30"
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500">{format("Murakkablik")}</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                className={inputClass}
              >
                <option value="oson">{format("Oson")}</option>
                <option value="o'rta">{format("O'rta")}</option>
                <option value="qiyin">{format("Qiyin")}</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500">{format("Porsiya")}</label>
              <input
                type="number"
                value={form.servings}
                onChange={(e) => setForm((p) => ({ ...p, servings: e.target.value }))}
                placeholder="4"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">
              {format("Masalliqlar (Har bir qatorda: Nomi | Miqdori | Birligi)")}
            </label>
            <textarea
              value={form.ingredients_text}
              onChange={(e) => setForm((p) => ({ ...p, ingredients_text: e.target.value }))}
              placeholder={"Guruch | 1 | kg\nSabzi | 800 | g\nTuxum | 2 | dona"}
              className="h-32 w-full rounded-2xl border border-slate-200 bg-white p-3 font-mono text-xs outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">
              {format("Bosqichlar (Har bir qatorda: Matn | Taymer soniyasi)")}
            </label>
            <textarea
              value={form.steps_text}
              onChange={(e) => setForm((p) => ({ ...p, steps_text: e.target.value }))}
              placeholder={"Guruchni ivitib qo'ying | 1800\nYog'ni qizdirib unni qovuring"}
              className="h-32 w-full rounded-2xl border border-slate-200 bg-white p-3 font-mono text-xs outline-none"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-[#DB2777]"
            />
            <span className="text-xs font-bold text-slate-700">{format("Chop etilgan (foydalanuvchilarga ko'rinadi)")}</span>
          </label>

          <button
            onClick={save}
            className="h-12 w-full rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white"
          >
            {format("Saqlash")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={openCreate}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white"
      >
        <Plus size={16} />
        {format("Yangi retsept")}
      </button>

      {loading && items.length === 0 ? (
        <AdminSkeleton h="h-24" />
      ) : error ? (
        <div className="rounded-3xl bg-red-50 p-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {format("Retseptlar yo‘q")}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm"
            >
              <button onClick={() => openEdit(item)} className="flex-1 text-left">
                <p className="line-clamp-1 text-sm font-bold text-slate-900">
                  {item.title}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {item.category || format("Kategoriya yo‘q")} •{" "}
                  {item.is_published
                    ? format("Nashrda")
                    : format("Yashirin")}
                </p>
              </button>

              <button
                onClick={() => remove(item.id)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================
// LIFEHACKS ADMIN
// =========================

interface LifehackFormState {
  id?: number;
  title: string;
  category: string;
  content: string;
  image_url: string;
  is_published: boolean;
}

const emptyLifehackForm: LifehackFormState = {
  title: "",
  category: "",
  content: "",
  image_url: "",
  is_published: true,
};

function LifehacksAdmin() {
  const { format } = useApp();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "form">("list");
  const [form, setForm] = useState<LifehackFormState>(emptyLifehackForm);

  const load = useCallback(async () => {
    const key = "lifehacks:list";
    const c = cached<any[]>(key);
    if (c) { setItems(c); setLoading(false); }

    try {
      const response = await adminRequest("list_lifehacks");
      setItems(response.data ?? []);
      remember(key, response.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik"));
    } finally {
      setLoading(false);
    }
  }, [format]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyLifehackForm);
    setView("form");
  };

  const openEdit = async (item: any) => {
    setError(null);
    try {
      const response = await adminRequest("get_lifehack", { id: item.id });
      const full = response.data;
      if (!full) return;

      setForm({
        id: full.id,
        title: full.title ?? "",
        category: full.category ?? "",
        content: full.content ?? "",
        image_url: full.image_url ?? "",
        is_published: Boolean(full.is_published),
      });

      setView("form");
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik"));
    }
  };

  const save = async () => {
    setError(null);

    const payload: any = {
      title: form.title.trim(),
      category: form.category.trim() || null,
      content: form.content.trim() || null,
      image_url: form.image_url.trim() || null,
      is_published: form.is_published,
    };

    if (form.id) {
      payload.id = form.id;
    }

    try {
      await adminRequest("upsert_lifehack", payload);
      forget("lifehacks:list");
      hapticNotification("success");
      await load();
      setView("list");
    } catch (err: any) {
      setError(err?.message ?? format("Saqlashda xatolik"));
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(format("Lifehack o‘chirilsinmi?"))) return;

    try {
      await adminRequest("delete_lifehack", { id });
      forget("lifehacks:list");
      hapticNotification("success");
      await load();
    } catch (err: any) {
      setError(err?.message ?? format("O‘chirishda xatolik"));
    }
  };

  if (view === "form") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setView("list")}
          className="h-10 rounded-2xl bg-slate-100 px-4 text-xs font-bold text-slate-700"
        >
          ← {format("Orqaga ro'yxatga")}
        </button>

        {error ? (
          <div className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-600">
            {error}
          </div>
        ) : null}

        <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <label className="text-xs font-bold text-slate-500">{format("Sarlavha")}</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder={format("Lifehack nomi")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">{format("Kategoriya")}</label>
            <input
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder={format("Masalan: Oshxona")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">{format("Matn / Maslahat")}</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder={format("Foydali maslahat matni")}
              className="h-32 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500">{format("Rasm URL")}</label>
            <ImageUploader
              value={form.image_url}
              onChange={(url) => setForm((p) => ({ ...p, image_url: url }))}
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-[#DB2777]"
            />
            <span className="text-xs font-bold text-slate-700">{format("Chop etilgan")}</span>
          </label>

          <button
            onClick={save}
            className="h-12 w-full rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white"
          >
            {format("Saqlash")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={openCreate}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white"
      >
        <Plus size={16} />
        {format("Yangi lifehack")}
      </button>

      {loading && items.length === 0 ? (
        <AdminSkeleton h="h-24" />
      ) : error ? (
        <div className="rounded-3xl bg-red-50 p-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {format("Lifehacklar yo‘q")}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm"
            >
              <button onClick={() => openEdit(item)} className="flex-1 text-left">
                <p className="line-clamp-1 text-sm font-bold text-slate-900">
                  {item.title}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {item.category || format("Kategoriya yo‘q")} •{" "}
                  {item.is_published
                    ? format("Nashrda")
                    : format("Yashirin")}
                </p>
              </button>

              <button
                onClick={() => remove(item.id)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriesAdmin() {
  const { format } = useApp();
  const [categories, setCategories] = useState<string[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  const load = async () => {
    const r = await adminRequest("list_recipes");
    const cats = Array.from(new Set((r.data ?? []).map((x: any) => x.category).filter(Boolean))) as string[];
    setCategories(cats);
    const img = await adminRequest("get_category_images").catch(() => null);
    setImages(img?.data?.value ?? {});
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const saveImages = async () => {
    await adminRequest("save_category_images", { value: images });
    hapticNotification("success");
  };
  const rename = async (oldName: string) => {
    const newName = (names[oldName] ?? "").trim();
    if (!newName || newName === oldName) return;
    await adminRequest("rename_category", { old_name: oldName, new_name: newName });
    hapticNotification("success");
    await load();
  };

  return (
    <div className="space-y-3">
      {categories.map((cat) => (
        <div key={cat} className="space-y-2 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
          <p className="text-sm font-bold text-slate-900">{format(cat)}</p>
          <ImageUploader value={images[cat] ?? ""} onChange={(url) => setImages((p) => ({ ...p, [cat]: url }))} />
          <div className="flex gap-2">
            <input
              value={names[cat] ?? ""}
              onChange={(e) => setNames((p) => ({ ...p, [cat]: e.target.value }))}
              placeholder={format("Yangi nom...")}
              className={inputClass}
            />
            <button onClick={() => rename(cat)} className="shrink-0 rounded-2xl bg-slate-900 px-3 text-xs font-bold text-white">
              ✏️
            </button>
          </div>
        </div>
      ))}
      <button onClick={saveImages} className="h-12 w-full rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white">
        {format("Rasmlarni saqlash")}
      </button>
    </div>
  );
}

// =========================
// PRODUCT CATALOG ADMIN
// =========================
function ProductCatalogAdmin() {
  const { format } = useApp();
  const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES as any);
  const [products, setProducts] = useState<any[]>(DEFAULT_PRODUCTS as any);
  const [activeCat, setActiveCat] = useState("all");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = cached<any>("catalog");
    if (c) { setCategories(c.categories); setProducts(c.products); }
    adminRequest("get_product_catalog")
      .then((r) => {
        const v = r.data?.value;
        if (v?.categories?.length) setCategories(v.categories);
        if (v?.products?.length) setProducts(v.products);
        remember("catalog", {
          categories: v?.categories?.length ? v.categories : DEFAULT_CATEGORIES,
          products: v?.products?.length ? v.products : DEFAULT_PRODUCTS,
        });
      })
      .catch(() => {});
  }, []);

  const patchProduct = (key: string, patch: any) =>
    setProducts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const removeProduct = (key: string) => setProducts((prev) => prev.filter((p) => p.key !== key));
  const addProduct = () => {
    hapticSelection();
    setProducts((prev) => [
      ...prev,
      { key: `p${Date.now()}`, label: "Yangi mahsulot", emoji: "🆕", category: activeCat === "all" ? "pantry" : activeCat },
    ]);
  };
  const patchCategory = (id: string, patch: any) =>
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const addCategory = () => setCategories((prev) => [...prev, { id: `c${Date.now()}`, label: "Yangi kategoriya", emoji: "🧺" }]);

  const save = async () => {
    await adminRequest("save_product_catalog", { value: { categories, products } });
    remember("catalog", { categories, products });
    hapticNotification("success");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const resetDefaults = async () => {
    if (!window.confirm(format("Standart katalogga qaytilsinmi?"))) return;
    setCategories(DEFAULT_CATEGORIES as any);
    setProducts(DEFAULT_PRODUCTS as any);
    await adminRequest("save_product_catalog", { value: { categories: DEFAULT_CATEGORIES, products: DEFAULT_PRODUCTS } });
    remember("catalog", { categories: DEFAULT_CATEGORIES, products: DEFAULT_PRODUCTS });
    hapticNotification("success");
  };

  const visible = activeCat === "all" ? products : products.filter((p) => p.category === activeCat);

  return (
    <div className="space-y-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <button onClick={() => { hapticSelection(); setActiveCat("all"); }} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${activeCat === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-500 shadow-sm"}`}>
          {format("Barchasi")}
        </button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => { hapticSelection(); setActiveCat(c.id); }} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${activeCat === c.id ? "bg-slate-900 text-white" : "bg-white text-slate-500 shadow-sm"}`}>
            {c.emoji} {format(c.label)}
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
        <p className="text-xs font-extrabold text-slate-500">{format("Kategoriyalar (nom/emoji)")}</p>
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <input value={c.emoji} onChange={(e) => patchCategory(c.id, { emoji: e.target.value })} className="h-10 w-14 shrink-0 rounded-xl border border-slate-200 text-center text-base outline-none" />
            <input value={c.label} onChange={(e) => patchCategory(c.id, { label: e.target.value })} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none" />
          </div>
        ))}
        <button onClick={addCategory} className="h-10 w-full rounded-2xl bg-slate-100 text-xs font-bold text-slate-600">
          + {format("Kategoriya")}
        </button>
      </div>

      {/* ✅ 2 qatorli qator — toshish yo'q, o'chirish ko'rinadi */}
      <div className="space-y-2">
        {visible.map((p) => (
          <div key={p.key} className="space-y-2 rounded-3xl border border-slate-100 bg-white p-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <input value={p.emoji ?? ""} onChange={(e) => patchProduct(p.key, { emoji: e.target.value })} placeholder="🥕" className="h-10 w-12 shrink-0 rounded-xl border border-slate-200 text-center text-base outline-none" />
              <input value={p.label ?? ""} onChange={(e) => patchProduct(p.key, { label: e.target.value })} placeholder={format("Mahsulot nomi")} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none" />
              <button onClick={() => removeProduct(p.key)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
            <select value={p.category} onChange={(e) => patchProduct(p.key, { category: e.target.value })} className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs outline-none">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button onClick={addProduct} className="h-11 w-full rounded-2xl bg-slate-900 text-sm font-bold text-white">
        + {format("Mahsulot qo'shish")}
      </button>
      <button onClick={resetDefaults} className="h-10 w-full rounded-2xl bg-slate-100 text-xs font-bold text-slate-600">
        🔄 {format("Standart katalogga qaytish")}
      </button>
      <button onClick={save} className="h-12 w-full rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white">
        {saved ? format("✅ Saqlandi") : format("Saqlash")}
      </button>
    </div>
  );
}

// =========================
// BANNER ADMIN
// =========================
function BannerAdmin() {
  const { format } = useApp();

  const [title, setTitle] = useState("");
  const [badge, setBadge] = useState("");
  const [image, setImage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminRequest("get_banner")
      .then((res) => {
        const b = res.data?.value;
        if (b) {
          setTitle(b.title ?? "");
          setBadge(b.badge ?? b.subtitle ?? "");
          setImage(b.image_url ?? b.image ?? "");
          setLinkUrl(b.link_url ?? b.target_url ?? b.button_url ?? b.linkUrl ?? "");
          setLinkText(b.link_text ?? b.button_text ?? b.linkText ?? "");
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    await adminRequest("save_banner", {
      value: {
        title,
        badge,
        image,
        linkUrl,
        linkText,
        subtitle: badge,
        image_url: image,
        link_url: linkUrl,
        target_url: linkUrl,
        button_url: linkUrl,
        link_text: linkText,
        button_text: linkText,
        active: true,
      },
    });

    hapticNotification("success");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">{format("Bosh sahifa banneri")}</p>

      <div>
        <label className="text-xs font-bold text-slate-500">{format("Badge (masalan: TOP RETSEPT)")}</label>
        <input value={badge} onChange={(e) => setBadge(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500">{format("Sarlavha")}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500">{format("Rasm URL")}</label>
        <ImageUploader value={image} onChange={setImage} />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500">{format("Havola URL (Link: https://... yoki /recipes)")}</label>
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://t.me/... yoki /recipes"
          className={inputClass}
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500">{format("Tugma matni (masalan: Batafsil)")}</label>
        <input value={linkText} onChange={(e) => setLinkText(e.target.value)} className={inputClass} />
      </div>

      <button onClick={save} className="h-12 w-full rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white">
        {saved ? format("✅ Saqlandi") : format("Saqlash")}
      </button>
    </div>
  );
}

export default function AdminOverlay() {
  const { activeModal } = useApp();

  if (activeModal !== "admin") return null;

  return <AdminInner />;
}
