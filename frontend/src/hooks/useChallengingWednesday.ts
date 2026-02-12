import { useState, useEffect } from "react";
import { API_BASE_URL } from "../util/auth";

interface Event {
  id: number;
  name: string;
  description?: string;
  date?: string;
  is_current: boolean;
}

export const useChallengingWednesday = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkEnabled = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/events/`);
        if (response.ok) {
          const events: Event[] = await response.json();
          const currentEvent = events.find((e) => e.is_current);
          setIsEnabled(currentEvent !== undefined);
        }
      } catch (error) {
        console.error("Error checking challenging wednesday status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkEnabled();
    // Poll every 30 seconds to check for updates
    const interval = setInterval(checkEnabled, 30000);
    return () => clearInterval(interval);
  }, []);

  return { isEnabled, loading };
};

