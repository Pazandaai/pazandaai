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
  return tg?.initDataUnsafe?.user;
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
