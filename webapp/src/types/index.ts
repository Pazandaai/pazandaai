export type Script = "latn" | "kyr";

export type TabId = "home" | "recipes" | "lifehacks" | "ai" | "profile";

export type DifficultyKey = "easy" | "medium" | "hard";

export interface AppUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium?: boolean;
}

export type ModalId = "bozorlik" | "timer" | "premium" | "admin" | null;

export interface RecipeIngredient {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  optional?: boolean;
}

export interface RecipeStep {
  text: string;
  timer_seconds?: number | null;
}

export interface Recipe {
  id: number;
  slug?: string;
  category?: string;
  title: string;
  description?: string;
  image_url?: string;
  emoji?: string | null;
  cook_time_minutes?: number | null;
  difficulty?: string | null;
  servings?: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  is_premium_only?: boolean;
  locked?: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  checked: boolean;
  addedAt: number;
}

export type NewShoppingItem = Pick<ShoppingItem, "name" | "quantity" | "unit">;

export type TimerStatus = "running" | "paused" | "finished";

export interface TimerState {
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
}
