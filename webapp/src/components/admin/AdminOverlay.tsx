import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useApp } from "../../context/AppContext";
import { useSession } from "../../hooks/useSession";
import { adminRequest } from "../../lib/api";
import ImageUploader from "./ImageUploader";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#DB2777]/40";

function AdminInner() {
  const { closeModal, format, user } = useApp();
  const { loading, isAdmin } = useSession();

  const isUserAdmin = isAdmin || user.id === 8544023815;

  const [tab, setTab] = useState<
    "stats" | "users" | "payments" | "broadcast" | "recipes" | "banner" | "lifehacks"
  >("stats");

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
          {[
            { id: "stats", label: "📊 Statistika" },
            { id: "users", label: "👥 Foydalanuvchilar" },
            { id: "payments", label: "💳 To'lovlar" },
            { id: "broadcast", label: "📣 Broadcast" },
            { id: "recipes", label: "🍳 Retseptlar" },
            { id: "lifehacks", label: "💡 Lifehacklar" },
            { id: "banner", label: "🖼 Banner" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
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
              <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
              <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
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
    adminRequest("stats")
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-3xl bg-slate-200/70" />;
  }

  if (!stats) {
    return (
      <div className="rounded-3xl bg-red-50 p-4 text-sm text-red-600">
        {format("Statistika yuklanmadi")}
      </div>
    );
  }

  const items = [
    { label: "👥 Jami foydalanuvchilar", value: stats.total_users },
    { label: "💎 Premium", value: stats.premium_users },
    { label: "⛔ Banlangan", value: stats.banned_users },
    { label: "💳 Kutilayotgan to'lovlar", value: stats.pending_payments },
    { label: "🍳 Retseptlar", value: stats.total_recipes },
    { label: "💡 Lifehacklar", value: stats.total_lifehacks },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">{item.label}</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// =====================
// USERS ADMIN
// =====================
function UsersAdmin() {
  const { format } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await adminRequest("list_users", q ? { search: q } : {});
      setUsers(res.data ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleBan = async (telegramId: number) => {
    await adminRequest("toggle_ban", { telegram_id: telegramId });
    load(search || undefined);
  };

  const grantPremium = async (telegramId: number) => {
    await adminRequest("grant_premium", { telegram_id: telegramId, days: 30 });
    load(search || undefined);
  };

  const revokePremium = async (telegramId: number) => {
    await adminRequest("revoke_premium", { telegram_id: telegramId });
    load(search || undefined);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(search || undefined); }}
          placeholder={format("ID, username yoki ism qidiring...")}
          className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
        />
        <button
          onClick={() => load(search || undefined)}
          className="h-11 rounded-2xl bg-[#DB2777] px-4 text-sm font-bold text-white"
        >
          🔎
        </button>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-3xl bg-slate-200/70" />
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
                      onClick={() => revokePremium(u.telegram_id)}
                      className="rounded-xl bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"
                    >
                      {format("Premium olish")}
                    </button>
                  ) : (
                    <button
                      onClick={() => grantPremium(u.telegram_id)}
                      className="rounded-xl bg-pink-50 px-2 py-1 text-[10px] font-bold text-pink-600"
                    >
                      {format("Premium berish")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================
// PAYMENTS ADMIN
// =====================
function PaymentsAdmin() {
  const { format } = useApp();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminRequest("list_payments", { status: "pending" });
      setPayments(res.data ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (requestId: string) => {
    await adminRequest("approve_payment", { request_id: requestId });
    load();
  };

  const reject = async (requestId: string) => {
    await adminRequest("reject_payment", { request_id: requestId });
    load();
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="h-32 animate-pulse rounded-3xl bg-slate-200/70" />
      ) : payments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {format("Kutilayotgan to'lovlar yo'q")}
        </div>
      ) : (
        payments.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-3">
              {p.screenshot_url ? (
                <img
                  src={p.screenshot_url}
                  alt="screenshot"
                  className="h-20 w-20 rounded-xl object-cover"
                />
              ) : null}

              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">
                  User ID: {p.user_telegram_id}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(p.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => approve(p.id)}
                  className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600"
                >
                  ✅
                </button>
                <button
                  onClick={() => reject(p.id)}
                  className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600"
                >
                  ❌
                </button>
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

  const send = async () => {
    if (!text.trim() || sending) return;

    if (!window.confirm(format("Barcha foydalanuvchilarga yuborilsinmi?"))) return;

    setSending(true);
    setResult(null);

    try {
      const res = await adminRequest("broadcast", { text: text.trim() });
      setResult(format(`Yuborildi: ${res.sent}, Xato: ${res.failed}`));
      setText("");
    } catch (err: any) {
      setResult(err?.message ?? format("Xatolik"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={format("Broadcast matnini yozing...")}
        rows={5}
        className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none"
      />

      {result ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">
          {result}
        </div>
      ) : null}

      <button
        onClick={send}
        disabled={!text.trim() || sending}
        className="h-12 w-full rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white disabled:opacity-40"
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
  cook_time_minutes: "",
  difficulty: "oson",
  servings: "4",
  is_published: true,
  ingredients_text: "[]",
  steps_text: "[]",
};

function RecipesAdmin() {
  const { format } = useApp();

  const [items, setItems] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "form">("list");
  const [form, setForm] = useState<RecipeFormState>(emptyRecipeForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminRequest("list_recipes");
      setItems(response.data ?? []);
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
    try {
      const response = await adminRequest("list_recipes");
      const fullItems = response.data ?? [];
      const full = fullItems.find((row: any) => row.id === item.id);

      if (!full) return;

      setForm({
        id: full.id,
        title: full.title ?? "",
        category: full.category ?? "",
        description: full.description ?? "",
        image_url: full.image_url ?? "",
        cook_time_minutes: String(full.cook_time_minutes ?? ""),
        difficulty: full.difficulty ?? "oson",
        servings: String(full.servings ?? "4"),
        is_published: Boolean(full.is_published),
        ingredients_text: JSON.stringify(full.ingredients ?? [], null, 2),
        steps_text: JSON.stringify(full.steps ?? [], null, 2),
      });

      setView("form");
    } catch (err: any) {
      setError(err?.message ?? format("Xatolik"));
    }
  };

  const save = async () => {
    setError(null);

    let ingredients: unknown[] = [];
    let steps: unknown[] = [];

    try {
      ingredients = JSON.parse(form.ingredients_text || "[]");
    } catch {
      setError(format("Masalliqlar JSON formatida emas"));
      return;
    }

    try {
      steps = JSON.parse(form.steps_text || "[]");
    } catch {
      setError(format("Bosqichlar JSON formatida emas"));
      return;
    }

    const payload: any = {
      title: form.title.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
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
          className="rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600"
        >
          {format("← Ro‘yxatga qaytish")}
        </button>

        <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <input
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder={format("Retsept nomi")}
            className={inputClass}
          />

          <input
            value={form.category}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, category: event.target.value }))
            }
            placeholder={format("Kategoriya")}
            className={inputClass}
          />

          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder={format("Qisqacha tavsif")}
            rows={3}
            className={inputClass}
          />

          <ImageUploader
            value={form.image_url}
            onChange={(url) =>
              setForm((prev) => ({ ...prev, image_url: url }))
            }
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.cook_time_minutes}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  cook_time_minutes: event.target.value,
                }))
              }
              placeholder={format("Vaqt (daqiqa)")}
              inputMode="numeric"
              className={inputClass}
            />

            <input
              value={form.servings}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, servings: event.target.value }))
              }
              placeholder={format("Porsiya")}
              inputMode="numeric"
              className={inputClass}
            />
          </div>

          <select
            value={form.difficulty}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, difficulty: event.target.value }))
            }
            className={inputClass}
          >
            <option value="oson">{format("Oson")}</option>
            <option value="o'rta">{format("O‘rta")}</option>
            <option value="qiyin">{format("Qiyin")}</option>
          </select>

          <textarea
            value={form.ingredients_text}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                ingredients_text: event.target.value,
              }))
            }
            placeholder='[{"name":"Guruch","quantity":500,"unit":"g"}]'
            rows={6}
            className={`${inputClass} font-mono text-xs`}
          />

          <textarea
            value={form.steps_text}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                steps_text: event.target.value,
              }))
            }
            placeholder='[{"text":"...","timer_seconds":600}]'
            rows={6}
            className={`${inputClass} font-mono text-xs`}
          />

          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  is_published: event.target.checked,
                }))
              }
            />

            <span className="text-sm font-semibold text-slate-700">
              {format("Nashr qilingan")}
            </span>
          </label>

          {error ? (
            <div className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
              {error}
            </div>
          ) : null}

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

      {loading ? (
        <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
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
// BANNER ADMIN
// =========================

interface BannerState {
  image_url: string;
  title: string;
  subtitle: string;
  active: boolean;
}

function BannerAdmin() {
  const { format } = useApp();

  const [banner, setBanner] = useState<BannerState>({
    image_url: "",
    title: "",
    subtitle: "",
    active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminRequest("get_banner");
        const value = response?.data?.[0]?.value ?? null;

        if (value) {
          setBanner({
            image_url: value.image_url ?? "",
            title: value.title ?? "",
            subtitle: value.subtitle ?? "",
            active: value.active ?? true,
          });
        }
      } catch (err: any) {
        setError(err?.message ?? format("Xatolik"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [format]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await adminRequest("save_banner", { value: banner });
      setMessage(format("Banner saqlandi"));
    } catch (err: any) {
      setError(err?.message ?? format("Saqlashda xatolik"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-48 animate-pulse rounded-3xl bg-slate-200/70" />;
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <ImageUploader
        value={banner.image_url}
        onChange={(url) => setBanner((prev) => ({ ...prev, image_url: url }))}
      />

      <input
        value={banner.title}
        onChange={(event) =>
          setBanner((prev) => ({ ...prev, title: event.target.value }))
        }
        placeholder={format("Banner sarlavhasi")}
        className={inputClass}
      />

      <input
        value={banner.subtitle}
        onChange={(event) =>
          setBanner((prev) => ({ ...prev, subtitle: event.target.value }))
        }
        placeholder={format("Banner matni")}
        className={inputClass}
      />

      <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
        <input
          type="checkbox"
          checked={banner.active}
          onChange={(event) =>
            setBanner((prev) => ({ ...prev, active: event.target.checked }))
          }
        />

        <span className="text-sm font-semibold text-slate-700">
          {format("Faol")}
        </span>
      </label>

      {message ? (
        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
          {error}
        </div>
      ) : null}

      <button
        onClick={save}
        disabled={saving}
        className="h-12 w-full rounded-2xl bg-[#DB2777] text-sm font-extrabold text-white disabled:opacity-40"
      >
        {saving ? format("Saqlanmoqda...") : format("Bannerni saqlash")}
      </button>
    </div>
  );
}

// =========================
// LIFEHACKS ADMIN
// =========================

interface LifehackListItem {
  id: number;
  title: string;
  category?: string;
  is_published: boolean;
}

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

  const [items, setItems] = useState<LifehackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "form">("list");
  const [form, setForm] = useState<LifehackFormState>(emptyLifehackForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminRequest("list_lifehacks");
      setItems(response.data ?? []);
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

  const openEdit = async (item: LifehackListItem) => {
    try {
      const response = await adminRequest("list_lifehacks");
      const fullItems = response.data ?? [];
      const full = fullItems.find((row: any) => row.id === item.id);

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
      content: form.content.trim(),
      image_url: form.image_url.trim() || null,
      is_published: form.is_published,
    };

    if (form.id) {
      payload.id = form.id;
    }

    try {
      await adminRequest("upsert_lifehack", payload);
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
          className="rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600"
        >
          {format("← Ro‘yxatga qaytish")}
        </button>

        <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <input
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder={format("Lifehack sarlavhasi")}
            className={inputClass}
          />

          <input
            value={form.category}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, category: event.target.value }))
            }
            placeholder={format("Kategoriya")}
            className={inputClass}
          />

          <textarea
            value={form.content}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, content: event.target.value }))
            }
            placeholder={format("Batafsil matn")}
            rows={5}
            className={inputClass}
          />

          <ImageUploader
            value={form.image_url}
            onChange={(url) =>
              setForm((prev) => ({ ...prev, image_url: url }))
            }
          />

          <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-3">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  is_published: event.target.checked,
                }))
              }
            />

            <span className="text-sm font-semibold text-slate-700">
              {format("Nashr qilingan")}
            </span>
          </label>

          {error ? (
            <div className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
              {error}
            </div>
          ) : null}

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

      {loading ? (
        <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70" />
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

export default function AdminOverlay() {
  const { activeModal } = useApp();

  if (activeModal !== "admin") return null;

  return <AdminInner />;
}
