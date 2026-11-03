/**
 * Safe localStorage wrapper. Storage can be unavailable (private mode, blocked
 * site data), so every access is guarded and failures fall back silently.
 * Use only for small per-browser conveniences — never location history.
 */
export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore — storage is a convenience only.
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  },
};
