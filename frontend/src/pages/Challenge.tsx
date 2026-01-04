import React, { useEffect, useState } from "react";
import CustomizableForm from "../components/CustomizableForm";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface Event {
  id: number;
  name: string;
  description?: string;
  date?: string;
  is_current: boolean;
  gender?: string;
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

  // Map event gender to form gender mode
  // "together" -> "both", "seperate" -> "single"
  const getGenderMode = (eventGender?: string): "both" | "single" => {
    if (eventGender === "seperate") {
      return "single";
    }
    return "both"; // Default to "both" for "together" or undefined
  };

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
      {/* <div className="max-w-4xl mx-auto px-4 pt-24 pb-12 text-center text-blue-900">
      <p className="text-sm uppercase tracking-[0.4em] text-blue-700 mb-2">
        Challenging Wednesday
      </p>
      <h1
        className="text-4xl md:text-5xl mb-4"
        style={{ fontFamily: "'Permanent Marker', cursive" }}
      >
        Ready for the Challenge?
      </h1>
      <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ fontFamily: "'Lato', sans-serif" }}>
        Sign up below to confirm your participation. Customize the teammate slots and
        gender requirements to match your competition group, then hit submit to send us
        your info.
      </p>
    </div> */}
      <CustomizableForm
        teammates={event.teammates || 0}
        gender={getGenderMode(event.gender)}
        eventId={event.id}
        sport={event.name}
      />
    </section>
  );
};

export default ChallengePage;

