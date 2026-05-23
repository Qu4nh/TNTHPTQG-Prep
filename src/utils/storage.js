/**
 * localStorage utility with JSON serialization and error handling.
 */

const STORAGE_PREFIX = 'thpt_';

/**
 * Save data to localStorage.
 */
export function saveToStorage(key, data) {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
    return true;
  } catch (error) {
    console.error(`Failed to save to localStorage: ${key}`, error);
    return false;
  }
}

/**
 * Load data from localStorage.
 */
export function loadFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Failed to load from localStorage: ${key}`, error);
    return defaultValue;
  }
}

/**
 * Remove item from localStorage.
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    return true;
  } catch (error) {
    console.error(`Failed to remove from localStorage: ${key}`, error);
    return false;
  }
}

/**
 * Clear all app data from localStorage.
 */
export function clearAllStorage() {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
    return true;
  } catch (error) {
    console.error('Failed to clear localStorage', error);
    return false;
  }
}
