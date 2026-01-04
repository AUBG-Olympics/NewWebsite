import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthHeaders, API_BASE_URL } from "../../util/auth";

interface Event {
  id: number;
  name: string;
  description?: string;
  date?: string;
  is_current: boolean;
  gender?: string;
  teammates?: number;
}

const ChallengingWednesday: React.FC = () => {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchEvent();
  }, []);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch events");
      const events: Event[] = await response.json();
      const currentEvent = events.find((e) => e.is_current);
      if (currentEvent) {
        setEvent(currentEvent);
        setEnabled(true);
      } else {
        // Initialize with default values if no current event
        setEvent({
          id: 0,
          name: "Challenging Wednesday",
          description: "",
          is_current: false,
          gender: "both",
          teammates: 0,
        });
        setEnabled(false);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      setMessage({ type: "error", text: "Failed to load event data" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (enabled) {
        // Enable - create or update event and set as current
        const eventData = {
          name: event?.name || "Challenging Wednesday",
          description: event?.description || "",
          date: event?.date || null,
          is_current: true,
          gender: event?.gender || "both",
          teammates: event?.teammates || 0,
        };

        let response;
        if (event?.id) {
          // Update existing event
          response = await fetch(`${API_BASE_URL}/api/events/${event.id}`, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(eventData),
          });
        } else {
          // Create new event
          response = await fetch(`${API_BASE_URL}/api/events/`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(eventData),
          });
        }

        if (!response.ok) throw new Error("Failed to save event");

        const savedEvent: Event = await response.json();
        // Set as current event
        await fetch(`${API_BASE_URL}/api/events/${savedEvent.id}/set-current`, {
          method: "PUT",
          headers: getAuthHeaders(),
        });

        setMessage({ type: "success", text: "Settings saved successfully!" });
        await fetchEvent();
      } else {
        // Disable - unset current event by setting another event as current or clearing
        if (event?.id) {
          // Fetch all events and set a different one as current, or just leave none
          const eventsResponse = await fetch(`${API_BASE_URL}/api/events/`, {
            headers: getAuthHeaders(),
          });
          if (eventsResponse.ok) {
            const allEvents: Event[] = await eventsResponse.json();
            const otherEvent = allEvents.find((e) => e.id !== event.id && !e.is_current);
            if (otherEvent) {
              await fetch(`${API_BASE_URL}/api/events/${otherEvent.id}/set-current`, {
                method: "PUT",
                headers: getAuthHeaders(),
              });
            }
          }
        }
        setMessage({ type: "success", text: "Challenging Wednesday disabled" });
        await fetchEvent();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-200 flex items-center justify-center">
        <p className="text-blue-900 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-200 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/admin")}
          className="mb-6 text-blue-700 hover:text-blue-900 font-semibold"
          style={{ fontFamily: "'Lato', sans-serif" }}
        >
          ← Back to Admin Panel
        </button>

        <div className="bg-white/90 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-8 md:p-12">
          <h1
            className="text-4xl md:text-5xl text-blue-900 mb-8"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            Challenging Wednesday Settings
          </h1>

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl border-2 ${
                message.type === "success"
                  ? "bg-green-100 border-green-400 text-green-800"
                  : "bg-red-100 border-red-400 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border-2 border-yellow-300">
              <div>
                <label className="text-lg font-semibold text-blue-900">
                  Enable Challenging Wednesday Button
                </label>
                <p className="text-sm text-blue-700">
                  Show or hide the "Challenging Wednesday" link in the navigation
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-400"></div>
              </label>
            </div>

            { 
              <div className="space-y-4 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
                <h2 className="text-2xl font-bold text-blue-900">Event Parameters</h2>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={event?.name || ""}
                    onChange={(e) => setEvent({ ...(event || { id: 0, name: "", is_current: false, gender: "both", teammates: 0 }), name: e.target.value })}
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    placeholder="Challenging Wednesday"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Description
                  </label>
                  <textarea
                    value={event?.description || ""}
                    onChange={(e) => setEvent({ ...(event || { id: 0, name: "", is_current: false, gender: "both", teammates: 0 }), description: e.target.value })}
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    rows={4}
                    placeholder="Event description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={event?.date ? event.date.split("T")[0] : ""}
                    onChange={(e) => setEvent({ ...(event || { id: 0, name: "", is_current: false, gender: "both", teammates: 0 }), date: e.target.value })}
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Gender Mode *
                  </label>
                  <select
                    value={event?.gender || "together"}
                    onChange={(e) => setEvent({ ...(event || { id: 0, name: "", is_current: false, gender: "both", teammates: 0 }), gender: e.target.value })}
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                  >
                    <option value="together">Together</option>
                    <option value="seperate">Seperate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Number of Teammates
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={event?.teammates || 0}
                    onChange={(e) => setEvent({ ...(event || { id: 0, name: "", is_current: false, gender: "both", teammates: 0 }), teammates: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                  />
                </div>
              </div>
            }

            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full px-6 py-4 bg-yellow-400 text-blue-900 font-bold uppercase tracking-[0.2em] rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition ${
                saving
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-yellow-300"
              }`}
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengingWednesday;

