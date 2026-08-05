import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { translate, type I18nKey } from "../lib/i18n";
import { normalizeIngredient } from "../lib/recipe-utils";
import { hapticNotification } from "../lib/telegram";
import { convertByScript } from "../lib/translit";
import { getTelegramUser } from "../lib/telegram";
import { makeId } from "../lib/utils";
import type {
  AppUser,
  ModalId,
  NewShoppingItem,
  Script,
  ShoppingItem,
  TabId,
  TimerState,
} from "../types";

const SCRIPT_STORAGE_KEY = "pazanda_ai_script";
const FAVORITES_STORAGE_KEY = "pazanda_ai_favorites";
const SHOPPING_STORAGE_KEY = "pazanda_ai_shopping";

interface AppContextValue {
  user: AppUser;
  script: Script;
  activeTab: TabId;
  isReady: boolean;

  favorites: number[];
  shoppingList: ShoppingItem[];
  shoppingCount: number;
  timer: TimerState | null;
  activeModal: ModalId;

  recipesSearchQuery: string;
  setRecipesSearchQuery: (value: string) => void;

  setScript: (script: Script) => void;
  toggleScript: () => void;
  setActiveTab: (tab: TabId) => void;

  openModal: (modal: ModalId) => void;
  closeModal: () => void;

  toggleFavorite: (recipeId: number) => void;

  addToShoppingList: (items: NewShoppingItem[]) => void;
  toggleShoppingItem: (id: string) => void;
  removeShoppingItem: (id: string) => void;
  clearShoppingList: () => void;

  startTimer: (label: string, seconds: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  closeTimer: () => void;

  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
  format: (text: string) => string;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function getInitialUser(): AppUser {
  const tgUser = getTelegramUser();

  console.log("[AppContext] Telegram user:", tgUser);
  console.log("[AppContext] window.Telegram:", window.Telegram);
  console.log("[AppContext] WebApp:", window.Telegram?.WebApp);

  if (tgUser) {
    console.log("[AppContext] Using Telegram user:", tgUser);
    return {
      id: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
      photoUrl: tgUser.photo_url,
      languageCode: tgUser.language_code,
      isPremium: false,
    };
  }

  console.warn("[AppContext] Telegram user yo'q, fallback ishlatilmoqda");

  return {
    id: 0,
    firstName: "Mehmon",
    username: "guest",
    languageCode: "uz",
    isPremium: false,
  };
}

function getInitialScript(): Script {
  try {
    const saved = localStorage.getItem(SCRIPT_STORAGE_KEY);

    if (saved === "latn" || saved === "kyr") {
      return saved;
    }
  } catch {
    // ignore
  }

  return "latn";
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return fallback;

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(getInitialUser);
  const [script, setScriptState] = useState<Script>(getInitialScript);
  const [activeTab, setActiveTabState] = useState<TabId>("home");
  const [isReady, setIsReady] = useState(false);

  const [favorites, setFavorites] = useState<number[]>(() =>
    loadJSON<number[]>(FAVORITES_STORAGE_KEY, []),
  );

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(() =>
    loadJSON<ShoppingItem[]>(SHOPPING_STORAGE_KEY, []),
  );

  const [timer, setTimer] = useState<TimerState | null>(null);
  const [activeModal, setActiveModal] = useState<ModalId>(null);

  const [recipesSearchQuery, setRecipesSearchQueryState] = useState("");

  const setRecipesSearchQuery = useCallback((value: string) => {
    setRecipesSearchQueryState(value);
  }, []);

  useEffect(() => {
    setIsReady(true);
    const tgUser = getTelegramUser();
    if (tgUser) {
      setUser({
        id: tgUser.id,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
        photoUrl: (tgUser as any).photo_url,
        languageCode: tgUser.language_code,
        isPremium: false,
      });
    }
  }, []);

  useEffect(() => {
    saveJSON(SCRIPT_STORAGE_KEY, script);
  }, [script]);

  useEffect(() => {
    saveJSON(FAVORITES_STORAGE_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    saveJSON(SHOPPING_STORAGE_KEY, shoppingList);
  }, [shoppingList]);

  useEffect(() => {
    document.title = translate(script, "appName");
  }, [script]);

  useEffect(() => {
    if (timer?.status !== "running") return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (!prev || prev.status !== "running") return prev;

        const nextRemaining = prev.remainingSeconds - 1;

        if (nextRemaining <= 0) {
          return {
            ...prev,
            remainingSeconds: 0,
            status: "finished",
          };
        }

        return {
          ...prev,
          remainingSeconds: nextRemaining,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer?.status]);

  useEffect(() => {
    if (timer?.status === "finished") {
      hapticNotification("success");
    }
  }, [timer?.status]);

  const setScript = useCallback((nextScript: Script) => {
    setScriptState(nextScript);
  }, []);

  const toggleScript = useCallback(() => {
    setScriptState((prev) => (prev === "latn" ? "kyr" : "latn"));
  }, []);

  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  const openModal = useCallback((modal: ModalId) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const toggleFavorite = useCallback((recipeId: number) => {
    setFavorites((prev) => {
      if (prev.includes(recipeId)) {
        return prev.filter((id) => id !== recipeId);
      }

      return [...prev, recipeId];
    });
  }, []);

  const addToShoppingList = useCallback((items: NewShoppingItem[]) => {
    setShoppingList((prev) => {
      const next = [...prev];

      for (const item of items) {
        const normalized = normalizeIngredient(item.name);

        if (!normalized) continue;

        const exists = next.find(
          (existing) => normalizeIngredient(existing.name) === normalized,
        );

        if (!exists) {
          next.push({
            id: makeId(),
            name: item.name,
            quantity: item.quantity ?? null,
            unit: item.unit ?? null,
            checked: false,
            addedAt: Date.now(),
          });
        }
      }

      return next;
    });
  }, []);

  const toggleShoppingItem = useCallback((id: string) => {
    setShoppingList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  }, []);

  const removeShoppingItem = useCallback((id: string) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearShoppingList = useCallback(() => {
    setShoppingList([]);
  }, []);

  const startTimer = useCallback((label: string, seconds: number) => {
    setTimer({
      label,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      status: "running",
    });

    setActiveModal("timer");
  }, []);

  const pauseTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev || prev.status !== "running") return prev;

      return {
        ...prev,
        status: "paused",
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev || prev.status !== "paused") return prev;

      return {
        ...prev,
        status: "running",
      };
    });
  }, []);

  const resetTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        remainingSeconds: prev.totalSeconds,
        status: "running",
      };
    });
  }, []);

  const closeTimer = useCallback(() => {
    setTimer(null);
    setActiveModal(null);
  }, []);

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => {
      return translate(script, key, vars);
    },
    [script],
  );

  const format = useCallback(
    (text: string) => {
      return convertByScript(text, script);
    },
    [script],
  );

  const shoppingCount = shoppingList.length;

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      script,
      activeTab,
      isReady,
      favorites,
      shoppingList,
      shoppingCount,
      timer,
      activeModal,
      recipesSearchQuery,
      setRecipesSearchQuery,
      setScript,
      toggleScript,
      setActiveTab,
      openModal,
      closeModal,
      toggleFavorite,
      addToShoppingList,
      toggleShoppingItem,
      removeShoppingItem,
      clearShoppingList,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      closeTimer,
      t,
      format,
    }),
    [
      user,
      script,
      activeTab,
      isReady,
      favorites,
      shoppingList,
      shoppingCount,
      timer,
      activeModal,
      recipesSearchQuery,
      setRecipesSearchQuery,
      setScript,
      toggleScript,
      setActiveTab,
      openModal,
      closeModal,
      toggleFavorite,
      addToShoppingList,
      toggleShoppingItem,
      removeShoppingItem,
      clearShoppingList,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      closeTimer,
      t,
      format,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error("useApp AppProvider ichida ishlatilishi kerak.");
  }

  return ctx;
}
