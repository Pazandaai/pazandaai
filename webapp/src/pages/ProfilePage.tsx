import { Crown, Heart, Info, Settings, ShoppingBag, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { useSession } from "../hooks/useSession";
import { hapticNotification } from "../lib/telegram";

export default function ProfilePage() {
  const { favorites, format, openModal, script, setScript, shoppingCount, t, user } = useApp();
  const { session, isAdmin, isPremium } = useSession();

  const currentUser = useMemo(() => {
    if (session?.user && session.user.id !== 0) {
      return {
        id: session.user.id,
        firstName: session.user.first_name || user.firstName,
        lastName: session.user.last_name || user.lastName,
        username: session.user.username || user.username,
        photoUrl: user.photoUrl,
        isPremium: Boolean(session.user.is_premium),
      };
    }
    return user;
  }, [session?.user, user]);

  const showAdminButton = isAdmin || currentUser.id === 8544023815;

  const premiumUntil = session?.user?.premium_until ? new Date(session.user.premium_until) : null;
  const daysLeft = premiumUntil ? Math.max(0, Math.ceil((premiumUntil.getTime() - Date.now()) / 86400000)) : 0;

  const clearCache = () => {
    try {
      sessionStorage.clear();
    } catch {}
    hapticNotification("success");
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Profil kartasi */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {currentUser.photoUrl ? (
            <img src={currentUser.photoUrl} alt={currentUser.firstName} className="h-16 w-16 rounded-full object-cover ring-2 ring-[#DB2777]/20" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 font-display text-2xl font-extrabold text-white">
              {currentUser.firstName?.[0] ?? "?"}
            </div>
          )}
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">{currentUser.firstName} {currentUser.lastName ?? ""}</h2>
            {currentUser.username ? <p className="text-xs font-semibold text-slate-400">@{currentUser.username}</p> : null}
            <div className="mt-1 flex items-center gap-2">
              {isPremium || showAdminButton ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#DB2777]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#DB2777]">
                  <Crown size={12} /> {t("premiumBadge")}
                </span>
              ) : (
                <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">Free</span>
              )}
              {showAdminButton ? (
                <span className="inline-block rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold text-white">Admin</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Premium holati */}
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-[#DB2777]">
          <Crown size={18} />
          <h3 className="text-xs font-bold">{format("Premium obuna")}</h3>
        </div>
        {isPremium && (premiumUntil || isAdmin) ? (
          <div className="mt-3 rounded-2xl bg-emerald-50 p-3">
            <p className="text-sm font-extrabold text-emerald-700">✅ {format("Faol")}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-600">
              {premiumUntil
                ? `${format("Tugash sanasi")}: ${premiumUntil.toLocaleDateString()} • ${daysLeft} ${format("kun qoldi")}`
                : format("Admin — muddatsiz faol")}
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500">{format("Oddiy rejim. Premium obuna bilan barcha funksiyalardan cheksiz foydalaning.")}</p>
            <button onClick={() => openModal("premium")} className="h-11 w-full rounded-2xl bg-[#DB2777] text-xs font-extrabold text-white shadow-md">
              {format("💎 Premiumga o'tish (25 000 so'm)")}
            </button>
          </div>
        )}
      </div>

      {/* Statistika va tugmalar */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-[#DB2777]">
            <Heart size={20} />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-400">{format("Saqlanganlar")}</p>
            <p className="font-display text-lg font-extrabold text-slate-900">{favorites.length}</p>
          </div>
        </div>
        <button onClick={() => openModal("bozorlik")} className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <ShoppingBag size={20} />
          </span>
          <div>
            <p className="text-xs font-bold text-slate-400">{format("Bozorlik ro'yxati")}</p>
            <p className="font-display text-lg font-extrabold text-slate-900">{shoppingCount}</p>
          </div>
        </button>
      </div>

      {/* Sozlamalar & Alifbo */}
      <div className="space-y-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-slate-800">
          <Settings size={18} />
          <h3 className="text-xs font-bold">{format("Sozlamalar")}</h3>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-600">{format("Yozuv alifbosi")}</span>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            <button onClick={() => setScript("latn")} className={`rounded-xl px-3 py-1 text-xs font-bold ${script === "latn" ? "bg-white text-[#DB2777] shadow-sm" : "text-slate-500"}`}>
              Lotin
            </button>
            <button onClick={() => setScript("kyr")} className={`rounded-xl px-3 py-1 text-xs font-bold ${script === "kyr" ? "bg-white text-[#DB2777] shadow-sm" : "text-slate-500"}`}>
              Кирилл
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-600">{format("Keshni tozalash")}</span>
          <button onClick={clearCache} className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            <Trash2 size={13} /> {format("Tozalash")}
          </button>
        </div>
      </div>

      {/* Admin tugmasi */}
      {showAdminButton ? (
        <button onClick={() => openModal("admin")} className="h-12 w-full rounded-2xl bg-slate-900 text-xs font-extrabold text-white shadow-md">
          🛠 {format("Admin panelni ochish")}
        </button>
      ) : null}

      <div className="flex items-center justify-center gap-1 text-center text-xs font-semibold text-slate-400">
        <Info size={13} /> Pazanda AI v2.2 • Bot API 10.2 ready
      </div>
    </div>
  );
}
