/**
 * localStorage helpers. Storage can be unavailable (private windows, blocked site
 * data), so reads fall back to null and failed writes are ignored.
 */
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Preference is kept for this session only.
  }
}

/**
 * sessionStorage helpers, for values that must not outlive the browser tab (the sign-in
 * token). Same failure rules as the localStorage helpers above.
 */
export function readSessionStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSessionStorage(key: string, value: string | null): void {
  try {
    if (value === null) {
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    // The value is kept in memory only, so it is lost on reload.
  }
}
