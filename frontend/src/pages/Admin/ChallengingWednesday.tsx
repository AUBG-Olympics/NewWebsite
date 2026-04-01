import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, apiFetch } from "../../util/auth";

interface Event {
  id: number;
  name: string;
  description?: string;
  date?: string;
  is_current: boolean;
  separated_genders?: boolean;
  max_teammates?: number;
  min_teammates?: number | null;
  whatsapp_link?: string | null;
  max_participants?: number | null;
  max_participants_male?: number | null;
  max_participants_female?: number | null;
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
      const response = await apiFetch(`${API_BASE_URL}/api/events/`);
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
          separated_genders: false,
          max_teammates: 0,
          min_teammates: null,
          whatsapp_link: "",
          max_participants: null,
          max_participants_male: null,
          max_participants_female: null,
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
      const eventData = {
        name: event?.name || "Challenging Wednesday",
        description: event?.description || "",
        date: event?.date || null,
        separated_genders: event?.separated_genders || false,
        max_teammates: event?.max_teammates || 0,
        min_teammates: event?.min_teammates ?? null,
        whatsapp_link: event?.whatsapp_link || null,
        max_participants:
          event?.separated_genders
            ? null
            : event?.max_participants !== undefined && event?.max_participants !== null
              ? Math.max(0, event.max_participants)
              : null,
        max_participants_male:
          event?.separated_genders &&
          event?.max_participants_male !== undefined &&
          event?.max_participants_male !== null
            ? Math.max(0, event.max_participants_male)
            : null,
        max_participants_female:
          event?.separated_genders &&
          event?.max_participants_female !== undefined &&
          event?.max_participants_female !== null
            ? Math.max(0, event.max_participants_female)
            : null,
        // Use the toggle to control whether this event is current
        is_current: enabled,
      };

      let response;
      if (event?.id) {
        // Update existing event
        response = await apiFetch(`${API_BASE_URL}/api/events/${event.id}`, {
          method: "PUT",
          body: JSON.stringify(eventData),
        });
      } else {
        // Create new event
        response = await apiFetch(`${API_BASE_URL}/api/events/`, {
          method: "POST",
          body: JSON.stringify(eventData),
        });
      }

      if (!response.ok) throw new Error("Failed to save event");

      setMessage({ type: "success", text: "Settings saved successfully!" });
      await fetchEvent();
    } catch (e) {
      console.error("Error saving event:", e);
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
          className="mb-6 px-4 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 hover:text-blue-700 font-semibold flex items-center gap-2 transition-colors"
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
                    onChange={(e) => setEvent({ ...(event || { id: 0, name: "", is_current: false, gender: "both", max_teammates: 0 }), name: e.target.value })}
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
                    onChange={(e) => setEvent({ ...(event || { id: 0, name: "", is_current: false, gender: "both", max_teammates: 0 }), description: e.target.value })}
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
                    onChange={(e) => setEvent({ ...(event || { id: 0, name: "", is_current: false, gender: "both", max_teammates: 0 }), date: e.target.value })}
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Separate Genders *
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={event?.separated_genders || false}
                      onChange={(e) => setEvent({ ...(event || { id: 0, name: "", is_current: false, separated_genders: false, max_teammates: 0 }), separated_genders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
                    <span className="ml-4 text-sm font-semibold text-blue-900">{event?.separated_genders ? "Separated" : "Together"}</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Max Teammates
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={event?.max_teammates || 0}
                    onChange={(e) => setEvent({ ...(event || { id: 0, name: "", is_current: false, max_teammates: 0, min_teammates: null, whatsapp_link: "", max_participants: null }), max_teammates: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Min Teammates (optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={event?.min_teammates ?? ""}
                    onChange={(e) =>
                      setEvent({
                        ...(event || { id: 0, name: "", is_current: false, max_teammates: 0, min_teammates: null, whatsapp_link: "", max_participants: null }),
                        min_teammates:
                          e.target.value === ""
                            ? null
                            : Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    placeholder="e.g. 5 (leave empty for no minimum)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    WhatsApp Link (optional)
                  </label>
                  <input
                    type="text"
                    value={event?.whatsapp_link ?? ""}
                    onChange={(e) =>
                      setEvent({
                        ...(event || { id: 0, name: "", is_current: false, max_teammates: 0, min_teammates: null, whatsapp_link: "", max_participants: null }),
                        whatsapp_link: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    placeholder="https://chat.whatsapp.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Max participants (optional)
                  </label>
                  {event?.separated_genders ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="text-sm font-semibold text-blue-900">
                        Male cap
                        <input
                          type="number"
                          min={0}
                          value={event?.max_participants_male ?? ""}
                          onChange={(e) =>
                            setEvent({
                              ...(event || {
                                id: 0,
                                name: "",
                                is_current: false,
                                max_teammates: 0,
                                min_teammates: null,
                                whatsapp_link: "",
                                max_participants: null,
                                max_participants_male: null,
                                max_participants_female: null,
                              }),
                              max_participants_male:
                                e.target.value === ""
                                  ? null
                                  : Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          className="mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                          placeholder="e.g. 16"
                        />
                      </label>
                      <label className="text-sm font-semibold text-blue-900">
                        Female cap
                        <input
                          type="number"
                          min={0}
                          value={event?.max_participants_female ?? ""}
                          onChange={(e) =>
                            setEvent({
                              ...(event || {
                                id: 0,
                                name: "",
                                is_current: false,
                                max_teammates: 0,
                                min_teammates: null,
                                whatsapp_link: "",
                                max_participants: null,
                                max_participants_male: null,
                                max_participants_female: null,
                              }),
                              max_participants_female:
                                e.target.value === ""
                                  ? null
                                  : Math.max(0, parseInt(e.target.value, 10) || 0),
                            })
                          }
                          className="mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                          placeholder="e.g. 16"
                        />
                      </label>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      value={event?.max_participants ?? ""}
                      onChange={(e) =>
                        setEvent({
                          ...(event || {
                            id: 0,
                            name: "",
                            is_current: false,
                            max_teammates: 0,
                            min_teammates: null,
                            whatsapp_link: "",
                            max_participants: null,
                          }),
                          max_participants:
                            e.target.value === ""
                              ? null
                              : Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                      placeholder="e.g. 16 (leave empty for no cap)"
                    />
                  )}
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

