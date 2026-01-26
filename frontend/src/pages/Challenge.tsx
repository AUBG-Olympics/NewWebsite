import React, { useEffect, useState } from "react";
import CustomizableForm from "../components/CustomizableForm";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface Event {
  id: number;
  name: string;
  description?: string;
  date?: string;
  is_current: boolean;
  separated_genders?: boolean;
  teammates?: number;
}

const ChallengePage: React.FC = () => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentEvent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/events/`);
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const events: Event[] = await response.json();
        const currentEvent = events.find((e) => e.is_current);
        
        if (!currentEvent) {
          setError("No active event found. Please check back later.");
          return;
        }
        
        setEvent(currentEvent);
      } catch (err) {
        console.error("Error fetching current event:", err);
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEvent();
  }, []);


  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100 flex items-center justify-center">
        <p className="text-blue-900 text-lg">Loading...</p>
      </section>
    );
  }

  if (error || !event) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100 flex items-center justify-center">
        <div className="text-center text-blue-900">
          <p className="text-lg mb-2">
            {error || "No event found. Please contact an administrator."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100">
      <CustomizableForm
        teammates={event.teammates || 0}
        separated_genders={event.separated_genders}
        eventId={event.id}
        sport={event.name}
        description={event.description || ""}
      />
    </section>
  );
};

export default ChallengePage;

