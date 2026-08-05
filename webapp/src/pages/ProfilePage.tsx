import { useMemo } from "react";
import { Crown, Heart, Settings, ShoppingBag } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useSession } from "../hooks/useSession";

export default function ProfilePage() {
  const {
    favorites,
    format,
    openModal,
    shoppingCount,
    t,
    user,
  } = useApp();

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

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          {currentUser.photoUrl ? (
            <img
              src={currentUser.photoUrl}
              alt={currentUser.firstName}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-[#DB2777]/20"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 font-display text-2xl font-extrabold text-white">
              {currentUser.firstName?.[0] ?? "?"}
            </div>
          )}

          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {currentUser.firstName} {currentUser.lastName ?? ""}
            </h2>

            {currentUser.username ? (
              <p className="text-xs font-semibold text-slate-400">
                @{currentUser.username}
              </p>
            ) : null}

            <div className="mt-1 flex items-center gap-2">
              {isPremium || isAdmin || currentUser.id === 8544023815 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#DB2777]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#DB2777]">
                  <Crown size={12} />
                  {t("premiumBadge")}
                </span>
              ) : (
                <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                  Free
                </span>
              )}

              {showAdminButton ? (
                <span className="inline-block rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Admin
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-500">
            <Heart size={18} />
            <h3 className="text-xs font-bold">{t("favorite")}</h3>
          </div>
          <p className="mt-3 font-display text-2xl font-extrabold text-slate-900">
            {favorites.length}
          </p>
        </div>

        <button
          onClick={() => openModal("bozorlik")}
          className="rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm"
        >
          <div className="flex items-center gap-2 text-emerald-600">
            <ShoppingBag size={18} />
            <h3 className="text-xs font-bold">{t("bozorlik")}</h3>
          </div>
          <p className="mt-3 font-display text-2xl font-extrabold text-slate-900">
            {shoppingCount}
          </p>
        </button>
      </div>

      <div className="space-y-2 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
        {!isPremium && !showAdminButton ? (
          <button
            onClick={() => openModal("premium")}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 p-3.5 text-white"
          >
            <div className="flex items-center gap-3">
              <Crown size={20} />
              <span className="text-sm font-extrabold">
                {format("Premium olish")}
              </span>
            </div>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
              25 000 so'm
            </span>
          </button>
        ) : null}

        {showAdminButton ? (
          <button
            onClick={() => openModal("admin")}
            className="flex w-full items-center gap-3 rounded-2xl bg-slate-900 p-3.5 text-white"
          >
            <Settings size={20} />
            <span className="text-sm font-extrabold">
              {format("Admin panel")}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
