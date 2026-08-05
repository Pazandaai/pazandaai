export const tg =
  typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

export const isTelegram = Boolean(tg);

export function initTelegram(): void {
  try {
    tg?.ready?.();
    tg?.expand?.();
    tg?.setHeaderColor?.("#ffffff");
    tg?.setBackgroundColor?.("#f8fafc");
  } catch {
    // Telegram tashqarisida dev rejimda xato bo'lmasligi uchun
  }
}

export function getInitData(): string {
  return tg?.initData ?? "";
}

export function getTelegramUser() {
  const unsafeUser = tg?.initDataUnsafe?.user;

  if (unsafeUser) {
    return unsafeUser;
  }

  const initData = tg?.initData;

  if (!initData) {
    console.warn("[Telegram] initData mavjud emas");
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const userString = params.get("user");

    if (!userString) {
      console.warn("[Telegram] user parametri initData ichida yo'q");
      return null;
    }

    const user = JSON.parse(userString);
    console.log("[Telegram] User parsed from initData:", user);
    return user;
  } catch (error) {
    console.error("[Telegram] initData parse xatosi:", error);
    return null;
  }
}

export function hapticImpact(style: "light" | "medium" | "heavy" = "light") {
  try {
    tg?.HapticFeedback?.impactOccurred(style);
  } catch {
    // ignore
  }
}

export function hapticNotification(type: "success" | "warning" | "error") {
  try {
    tg?.HapticFeedback?.notificationOccurred(type);
  } catch {
    // ignore
  }
}

export function hapticSelection() {
  try {
    tg?.HapticFeedback?.selectionChanged();
  } catch {
    // ignore
  }
}

export function showBackButton() {
  try {
    if (tg?.BackButton && tg.BackButton.isVisible !== true) {
      tg.BackButton.show();
    }
  } catch {
    // ignore
  }
}

export function hideBackButton() {
  try {
    if (tg?.BackButton && tg.BackButton.isVisible !== false) {
      tg.BackButton.hide();
    }
  } catch {
    // ignore
  }
}

export function onBackButton(callback: () => void): () => void {
  try {
    tg?.BackButton?.onClick(callback);

    return () => {
      tg?.BackButton?.offClick(callback);
    };
  } catch {
    return () => {};
  }
}
