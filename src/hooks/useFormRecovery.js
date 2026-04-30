import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_PREFIX = "sable_form_recovery_";
const DEFAULT_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_DEBOUNCE_MS = 500;

/**
 * Safe JSON parse that returns null on error
 */
function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Load data from localStorage
 */
function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return safeParse(raw);
  } catch {
    return null;
  }
}

/**
 * Save data to localStorage with timestamp
 */
function saveToStorage(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        savedAt: Date.now(),
        version: 1,
      })
    );
  } catch {
    // localStorage full or disabled - ignore
  }
}

/**
 * Check if saved data is expired
 */
function isExpired(savedAt, expiryMs) {
  return Date.now() - savedAt > expiryMs;
}

/**
 * Get recovery data for a storage key (without managing state)
 * Returns the saved data if valid and not expired, otherwise null
 */
export function getRecoveryData(storageKey, expiryMs = DEFAULT_EXPIRY_MS) {
  const fullKey = STORAGE_PREFIX + storageKey;
  const saved = loadFromStorage(fullKey);
  if (saved && !isExpired(saved.savedAt, expiryMs)) {
    return saved.data;
  }
  return null;
}

/**
 * Clear recovery data for a storage key
 */
export function clearRecoveryData(storageKey) {
  const fullKey = STORAGE_PREFIX + storageKey;
  try {
    localStorage.removeItem(fullKey);
  } catch {
    // ignore
  }
}

/**
 * Lightweight hook for auto-saving form data without managing state.
 * Works with existing useState patterns - just pass the data to save.
 *
 * @param {string} storageKey - Unique identifier for this form
 * @param {any} dataToSave - Current form data to auto-save
 * @param {object} options - Configuration options
 * @param {number} options.debounceMs - Debounce delay for saves (default: 500ms)
 * @param {boolean} options.enabled - Whether auto-save is enabled (default: true)
 *
 * @returns {object} - { clearRecovery }
 */
export function useAutoSave(storageKey, dataToSave, options = {}) {
  const { debounceMs = DEFAULT_DEBOUNCE_MS, enabled = true } = options;

  const fullKey = STORAGE_PREFIX + storageKey;
  const isInitialMount = useRef(true);

  // Debounced save effect
  useEffect(() => {
    if (!enabled) return;

    // Skip saving on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveToStorage(fullKey, dataToSave);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [dataToSave, fullKey, debounceMs, enabled]);

  const clearRecovery = useCallback(() => {
    clearRecoveryData(storageKey);
  }, [storageKey]);

  return { clearRecovery };
}

/**
 * Custom hook for form recovery - auto-saves form state to localStorage
 * and restores it on page load if not expired.
 *
 * @param {string} storageKey - Unique identifier for this form
 * @param {object} initialState - Default state shape
 * @param {object} options - Configuration options
 * @param {number} options.expiryMs - Expiry time in ms (default: 5 minutes)
 * @param {number} options.debounceMs - Debounce delay for saves (default: 500ms)
 *
 * @returns {object} - { formState, updateField, updateForm, clearRecovery, hasRecoveredData }
 */
export function useFormRecovery(storageKey, initialState, options = {}) {
  const { expiryMs = DEFAULT_EXPIRY_MS, debounceMs = DEFAULT_DEBOUNCE_MS } = options;

  const fullKey = STORAGE_PREFIX + storageKey;

  // Track if we recovered data on initial load
  const [hasRecoveredData, setHasRecoveredData] = useState(() => {
    const saved = loadFromStorage(fullKey);
    return saved && !isExpired(saved.savedAt, expiryMs);
  });

  // Initialize state - check localStorage first
  const [formState, setFormState] = useState(() => {
    const saved = loadFromStorage(fullKey);
    if (saved && !isExpired(saved.savedAt, expiryMs)) {
      // Merge with initialState to handle new fields
      return { ...initialState, ...saved.data };
    }
    return initialState;
  });

  // Track if this is the initial mount (to avoid saving on first render)
  const isInitialMount = useRef(true);

  // Debounced save effect
  useEffect(() => {
    // Skip saving on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveToStorage(fullKey, formState);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [formState, fullKey, debounceMs]);

  // Update a single field
  const updateField = useCallback((field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Update multiple fields at once
  const updateForm = useCallback((updates) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Replace entire form state (useful for loading existing data)
  const setForm = useCallback((newState) => {
    setFormState(newState);
  }, []);

  // Clear saved data (call on successful submit)
  const clearRecovery = useCallback(() => {
    try {
      localStorage.removeItem(fullKey);
    } catch {
      // ignore
    }
    setHasRecoveredData(false);
  }, [fullKey]);

  // Dismiss recovery indicator without clearing data
  const dismissRecoveryNotice = useCallback(() => {
    setHasRecoveredData(false);
  }, []);

  return {
    formState,
    updateField,
    updateForm,
    setForm,
    clearRecovery,
    hasRecoveredData,
    dismissRecoveryNotice,
  };
}

/**
 * Clean up all expired form recovery entries from localStorage.
 * Can be called on app mount to prevent localStorage bloat.
 */
export function cleanupExpiredRecovery(expiryMs = DEFAULT_EXPIRY_MS) {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_PREFIX));

    keys.forEach((key) => {
      const saved = loadFromStorage(key);
      if (!saved || isExpired(saved.savedAt, expiryMs)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // ignore errors
  }
}

export default useFormRecovery;
