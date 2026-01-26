import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

const DDayPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/events/`);
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const eventsData: Event[] = await response.json();
        setEvents(eventsData);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleEventClick = (eventId: number) => {
    navigate(`/dday/signup/${eventId}`);
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100 flex items-center justify-center">
        <p className="text-blue-900 text-lg">Loading events...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100 flex items-center justify-center">
        <div className="text-center text-blue-900">
          <p className="text-lg mb-2">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1
            className="text-5xl md:text-6xl text-blue-900 mb-4"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            D-DAY Events
          </h1>
          <p className="text-blue-700 text-lg" style={{ fontFamily: "'Lato', sans-serif" }}>
            Choose an event to register
          </p>
        </div>

        {events.length === 0 ? (
          <div className="text-center text-blue-900 py-12">
            <p className="text-lg">No events available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event.id)}
                className="group relative bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 p-6 text-left border-4 border-blue-500 hover:border-orange-500"
              >
                <div className="flex flex-col h-full">
                  <h3
                    className="text-2xl font-bold text-blue-900 mb-3 group-hover:text-orange-600 transition-colors"
                    style={{ fontFamily: "'Permanent Marker', cursive" }}
                  >
                    {event.name}
                  </h3>
                  {event.description && (
                    <p className="text-blue-700 text-sm mb-4 flex-grow" style={{ fontFamily: "'Lato', sans-serif" }}>
                      {event.description}
                    </p>
                  )}
                  {event.date && (
                    <p className="text-blue-600 text-xs mb-2" style={{ fontFamily: "'Lato', sans-serif" }}>
                      📅 {new Date(event.date).toLocaleDateString()}
                    </p>
                  )}
                  <div className="mt-auto pt-4 border-t border-gray-200">
                    <span className="text-orange-600 font-semibold text-sm group-hover:text-orange-700 transition-colors">
                      Click to Register →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default DDayPage;
