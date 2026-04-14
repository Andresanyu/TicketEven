import { useState, useEffect, useCallback, useRef } from "react";

export default function useApi(apiCall, options = {}) {
  const {
    initialData = null,
    immediate = true,
    deps = [],
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(Boolean(immediate));
  const [error, setError] = useState(null);

  const apiCallRef = useRef(apiCall);

  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCallRef.current();
      setData(result);
      return result;
    } catch (err) {
      const message = err?.data?.error || err?.message || "Error al cargar datos";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!immediate) return;
    void refresh();
  }, [immediate, refresh, ...deps]);

  return { data, loading, error, refresh };
}
