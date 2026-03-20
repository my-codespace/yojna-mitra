/**
 * hooks.js
 *
 * Custom React hooks for data fetching and state management.
 * Centralises loading/error state so components stay clean.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { schemesApi, eligibilityApi } from "../api/client";

// ─── useSchemes ────────────────────────────────────────────
// Fetches a paginated list of schemes, optionally filtered by category.

export function useSchemes(category = null) {
  const [schemes, setSchemes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    schemesApi
      .list(category)
      .then((data) => { if (!cancelled) setSchemes(data.schemes || []); })
      .catch((e)   => { if (!cancelled) setError(e.message); })
      .finally(()  => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [category]);

  return { schemes, loading, error };
}

// ─── useSchemeSearch ───────────────────────────────────────
// Debounced full-text search with 350ms delay.

export function useSchemeSearch(query) {
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const timerRef                = useRef(null);

  useEffect(() => {
    if (!query?.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      let cancelled = false;

      schemesApi
        .search(query)
        .then((data) => { if (!cancelled) setResults(data.schemes || []); })
        .catch((e)   => { if (!cancelled) setError(e.message); })
        .finally(()  => { if (!cancelled) setLoading(false); });

      return () => { cancelled = true; };
    }, 350);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { results, loading, error };
}

// ─── useSchemeDetail ──────────────────────────────────────
// Fetches full scheme data by slug + optional AI simplification.

export function useSchemeDetail(slug) {
  const [scheme,    setScheme]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [simplified,     setSimplified]     = useState(null);
  const [simplifyLoading, setSimplifyLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setScheme(null);
    setSimplified(null);

    schemesApi
      .get(slug)
      .then((data) => { if (!cancelled) setScheme(data.scheme); })
      .catch((e)   => { if (!cancelled) setError(e.message); })
      .finally(()  => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug]);

  const fetchSimplified = useCallback(
    async (profile) => {
      if (!slug || !profile || simplified || simplifyLoading) return;
      setSimplifyLoading(true);
      try {
        const data = await schemesApi.simplify(slug, profile);
        setSimplified(data.simplified);
      } catch {
        setSimplified("Could not load simplified explanation. Please try again.");
      } finally {
        setSimplifyLoading(false);
      }
    },
    [slug, simplified, simplifyLoading]
  );

  return { scheme, loading, error, simplified, simplifyLoading, fetchSimplified };
}

// ─── useEligibility ───────────────────────────────────────
// Runs eligibility check and caches result for session.

export function useEligibility() {
  const [results,   setResults]   = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const checkEligibility = useCallback(async (profile) => {
    setLoading(true);
    setError(null);
    try {
      const data = await eligibilityApi.match(profile);
      setResults(data);
      return data;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { results, loading, error, checkEligibility, reset };
}

// ─── useCategories ────────────────────────────────────────
// Loads available scheme categories with counts.

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    schemesApi
      .categories()
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}

// ─── useLocalStorage ──────────────────────────────────────
// Persists state to localStorage with JSON serialization.

export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (newValue) => {
      setValue(newValue);
      try {
        window.localStorage.setItem(key, JSON.stringify(newValue));
      } catch {}
    },
    [key]
  );

  const remove = useCallback(() => {
    setValue(defaultValue);
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }, [key, defaultValue]);

  return [value, set, remove];
}

// ─── useToast ─────────────────────────────────────────────
// Lightweight toast notification state.

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ─── useDebounce ──────────────────────────────────────────

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}