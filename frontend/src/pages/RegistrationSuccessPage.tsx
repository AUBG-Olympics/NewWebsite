import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface Event {
  id: number;
  name: string;
  whatsapp_link?: string | null;
}

const RegistrationSuccessPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!eventId) {
          setError("Event ID is missing");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/events/`);
        if (!response.ok) throw new Error("Failed to fetch events");

        const events: Event[] = await response.json();
        const found = events.find((e) => e.id === parseInt(eventId, 10));
        if (!found) throw new Error("Event not found");
        setEvent(found);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    load();
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
          <p className="text-lg mb-4">{error || "Event not found"}</p>
          <button
            onClick={() => navigate("/dday")}
            className="px-6 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
          >
            Back to D-Day
          </button>
        </div>
      </section>
    );
  }

  const link = event.whatsapp_link || "";

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100">
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        <div className="max-w-3xl w-full bg-white/90 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl text-green-700 font-bold mb-6">
            Registration successful
          </h2>

          <p className="text-blue-900 text-base md:text-lg">
            Registration successful, please join the whatsapp group:{" "}
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="text-blue-800 underline break-all"
              >
                {link}
              </a>
            ) : (
              <span>(no WhatsApp link provided)</span>
            )}
          </p>

          <button
            onClick={() => navigate("/dday")}
            className="mt-8 px-6 py-3 bg-yellow-400 text-blue-900 font-bold uppercase tracking-wide rounded-xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition hover:bg-yellow-300"
          >
            sign up for another sport
          </button>
        </div>
      </div>
    </section>
  );
};

export default RegistrationSuccessPage;

