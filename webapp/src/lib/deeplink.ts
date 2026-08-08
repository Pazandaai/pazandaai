import { tg } from "./telegram";

export function getStartParam(): string | null {
  try {
    return (tg?.initDataUnsafe as any)?.start_param ?? null;
  } catch {
    return null;
  }
}
