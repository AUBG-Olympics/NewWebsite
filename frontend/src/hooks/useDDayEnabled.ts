import { useEffect, useState } from "react";
import { API_BASE_URL } from "../util/auth";

export const useDDayEnabled = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings/public`);
        if (!res.ok) return;
        const data = await res.json();
        setIsEnabled(Boolean(data.dday_enabled));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return { isEnabled, loading };
};

