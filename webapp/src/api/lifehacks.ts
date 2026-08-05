import { supabase } from "../lib/supabase";
import type { Lifehack } from "../types/lifehack";

const MOCK_LIFEHACKS: Lifehack[] = [
  {
    id: 1,
    category: "Oshxona",
    title: "Tuxum po‘stini oson tozalash",
    content:
      "Tuxumni qaynatgandan so‘ng sovuq suvga solib, 5 daqiqa kuting. Po‘sti osonroq ko‘chadi.",
    image_url: "",
  },
  {
    id: 2,
    category: "Oshxona",
    title: "Guruchni yopishqoq qilmaslik",
    content:
      "Palov uchun guruchni oldindan 30 daqiqa ivitib, keyin suvni yaxshilab oqizing.",
    image_url: "",
  },
  {
    id: 3,
    category: "Ro'zg'or",
    title: "Idishdagi yog‘ni tez tozalash",
    content:
      "Issiq suvga ozgina soda va sirka qo‘shing. Yog‘li idishlarni 10 daqiqa iviting.",
    image_url: "",
  },
  {
    id: 4,
    category: "Tejamkorlik",
    title: "Nonni uzoq saqlash",
    content:
      "Nonni qog‘oz paketda saqlang. Polietilen paketda non tez namlanadi.",
    image_url: "",
  },
];

function normalizeRow(row: any): Lifehack {
  return {
    id: Number(row.id),
    category: row.category ?? undefined,
    title: row.title ?? "",
    content: row.content ?? "",
    image_url: row.image_url ?? undefined,
  };
}

export async function fetchLifehacks(): Promise<Lifehack[]> {
  if (!supabase) {
    return MOCK_LIFEHACKS;
  }

  const { data, error } = await supabase
    .from("lifehacks")
    .select("*")
    .eq("is_published", true)
    .order("id", { ascending: true })
    .limit(500);

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeRow);
}

export function getLifehackCategories(lifehacks: Lifehack[]): string[] {
  const set = new Set<string>();

  for (const item of lifehacks) {
    if (item.category) {
      set.add(item.category);
    }
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b, "uz"));
}
