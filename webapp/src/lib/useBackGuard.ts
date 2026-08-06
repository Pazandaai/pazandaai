import { useEffect } from "react";
import { runBack } from "./back";

export function useBackGuard() {
  useEffect(() => {
    const push = () => {
      try {
        window.history.pushState({ pazanda: true }, "");
      } catch {
        // ignore
      }
    };
    // Himoya holatini qo'shamiz — "nazad" WebView'ni yopmasin
    push();

    const onPop = () => {
      const handled = runBack();
      if (handled) {
        // Qadam bajarildi — himoyani qayta o'rnatamiz
        setTimeout(push, 0);
      }
      // handled=false bo'lsa → tarix orqaga ketadi → miniapp yopiladi (root'da)
    };

    window.addEventListener("popstate", onPop);

    // Telegram sarlavhasidagi ← tugmasi ham shu tizimdan foydalanadi
    const tg = window.Telegram?.WebApp;
    const onTgBack = () => {
      if (!runBack()) {
        try {
          tg?.close?.();
        } catch {
          // ignore
        }
      }
    };
    try {
      tg?.BackButton?.onClick(onTgBack);
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("popstate", onPop);
      try {
        tg?.BackButton?.offClick(onTgBack);
      } catch {
        // ignore
      }
    };
  }, []);
}
