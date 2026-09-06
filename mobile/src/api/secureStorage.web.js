// Browser-preview-only fallback for expo-secure-store (no web implementation).
// Plain localStorage - fine for a demo preview, NOT the secure storage the
// native app uses; the native builds never load this file.
export async function getItemAsync(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore - e.g. localStorage disabled/full
  }
}

export async function deleteItemAsync(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
