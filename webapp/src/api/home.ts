import { supabase } from "../lib/supabase";

export interface HomeBanner {
  image_url?: string;
  title?: string;
  subtitle?: string;
  active?: boolean;
}

export async function fetchHomeBanner(): Promise<HomeBanner | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "home_banner")
      .maybeSingle();

    if (error) {
      return null;
    }

    return (data?.value as HomeBanner) ?? null;
  } catch {
    return null;
  }
}
