import { convertByScript } from "./translit";
import type { Script } from "../types";

const STRINGS = {
  appName: "Pazanda AI",
  headerHelper: "Oilaviy oshxona yordamchisi",

  tabHome: "Bosh sahifa",
  tabRecipes: "Retseptlar",
  tabLifehacks: "Lifehacklar",
  tabProfile: "Profil",

  scriptToggle: "Tilni almashtirish",
  premiumBadge: "Premium",

  placeholderHomeTitle: "Bosh sahifa",
  placeholderHomeText:
    "Banner, qidiruv va kunlik tavsiyalar keyingi bosqichda qo‘shiladi.",

  placeholderLifehacksTitle: "Lifehacklar",
  placeholderLifehacksText:
    "Maslahat papkalari va kartalar keyingi bosqichda qo‘shiladi.",

  placeholderProfileTitle: "Profil",
  placeholderProfileText:
    "Profil, saqlangan retseptlar va Premium keyingi bosqichda qo‘shiladi.",

  searchRecipes: "Retsept qidirish...",
  all: "Barchasi",
  catalog: "Katalog",
  aiMatch: "Aqlli Pazanda AI",

  time: "Vaqt",
  difficulty: "Qiyinlik",
  easy: "Oson",
  medium: "O‘rta",
  hard: "Qiyin",
  minutes: "daqiqa",
  servings: "porsiya",

  ingredients: "Masalliqlar",
  steps: "Bosqichlar",
  optional: "ixtiyoriy",

  addToShopping: "Bozorlikka saqlash",
  addedToShopping: "Bozorlikka qo‘shildi",
  favorite: "Sevimli",
  share: "Ulashish",
  copy: "Nusxalash",
  copied: "Nusxalandi",
  close: "Yopish",

  noRecipes: "Retseptlar topilmadi",
  loading: "Yuklanmoqda...",
  errorLoad: "Yuklashda xatolik yuz berdi",

  matchSelectIngredients:
    "Masalliqlarni tanlang. Retseptlar mosligi avtomatik hisoblanadi.",
  matchExact: "100% mos",
  matchAlmost: "1 ta yetmaydi",
  matchPartial: "Qisman mos",
  matchMissing: "yetmaydi",
  matchSelected: "tanlangan",
  matchClear: "Tozalash",
  matchSearchIngredient: "Masalliq qidirish...",
  matchNoResults: "Tanlangan masalliqlar bo‘yicha retsept topilmadi.",

  bozorlik: "Bozorlik ro‘yxati",
  bozorlikEmpty: "Ro‘yxat hali bo‘sh",
  bozorlikAdd: "Qo‘shish",
  bozorlikClear: "Tozalash",
  bozorlikPlaceholder: "Masalliq nomini yozing...",

  timer: "Taymer",
  timerDone: "Taymer tugadi",
  pause: "Pauza",
  resume: "Davom etish",
  reset: "Qayta",
  stepTimer: "Bosqich taymeri",

  back: "Orqaga",
  folders: "Papkalar",
  lifehacksSearch: "Maslahat qidirish...",
  noLifehacks: "Maslahatlar topilmadi",
  lifehackEmptyFolder: "Bu papkada maslahatlar yo‘q",
  countSuffix: "ta",
} as const;

export type I18nKey = keyof typeof STRINGS;

export function translate(
  script: Script,
  key: I18nKey,
  vars?: Record<string, string | number>,
): string {
  let text: string = STRINGS[key];

  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }

  return convertByScript(text, script);
}
