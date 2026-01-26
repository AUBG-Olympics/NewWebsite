import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomizableForm from "../components/CustomizableForm";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface Event {
  id: number;
  name: string;
  description?: string;
  date?: string;
  separated_genders?: boolean;
  teammates?: number;
  is_current: boolean;
}

const SignupFormPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        setError("Event ID is missing");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/events/`);
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const events: Event[] = await response.json();
        const foundEvent = events.find((e) => e.id === parseInt(eventId, 10));

        if (!foundEvent) {
          setError("Event not found");
          return;
        }

        setEvent(foundEvent);
      } catch (err) {
        console.error("Error fetching event:", err);
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

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
        <div className="text-center text-blue-900 bg-white p-6 rounded-lg shadow-md">
          <p className="text-lg mb-4">
            {error || "Event not found. Please contact an administrator."}
          </p>
          <button
            onClick={() => navigate("/dday")}
            className="mt-4 px-6 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
          >
            Back to Events
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/dday")}
          className="mb-6 px-4 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 hover:text-blue-700 font-semibold flex items-center gap-2 transition-colors"
        >
          ← Back to Events
        </button>
        <CustomizableForm
          teammates={event.teammates || 0}
          separated_genders={event.separated_genders}
          eventId={event.id}
          sport={event.name}
          description={event.description || ""}
        />
      </div>
    </section>
  );
};

export default SignupFormPage;
