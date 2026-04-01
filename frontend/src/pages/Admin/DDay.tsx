import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, apiFetch } from "../../util/auth";

interface Challenge {
  id?: number;
  event_id: number;
  sport: string;
  gender: "together" | "seperate";
  max_teammates?: number;
  min_teammates?: number | null;
  whatsapp_link?: string | null;
  name?: string;
  description?: string;
  max_participants?: number | null;
  max_participants_male?: number | null;
  max_participants_female?: number | null;
  waitlist_max_participants?: number | null;
}

const DDay: React.FC = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [ddayEnabled, setDdayEnabled] = useState(false);
  const [ddayEnabledLoading, setDdayEnabledLoading] = useState(true);

  useEffect(() => {
    fetchChallenges();
    fetchDdayEnabled();
  }, []);

  const fetchDdayEnabled = async () => {
    try {
      setDdayEnabledLoading(true);
      const res = await apiFetch(`${API_BASE_URL}/api/settings/dday-enabled`);
      if (!res.ok) throw new Error("Failed to load D-Day setting");
      const data = await res.json();
      setDdayEnabled(Boolean(data.dday_enabled));
    } catch (e) {
      console.error("Failed to load dday enabled setting", e);
    } finally {
      setDdayEnabledLoading(false);
    }
  };

  const saveDdayEnabled = async (enabled: boolean) => {
    try {
      setDdayEnabled(enabled);
      const res = await apiFetch(
        `${API_BASE_URL}/api/settings/dday-enabled?enabled=${enabled ? "true" : "false"}`,
        {
          method: "PUT",
        },
      );
      if (!res.ok) throw new Error("Failed to save D-Day setting");
    } catch (e) {
      console.error("Failed to save dday enabled setting", e);
      alert("Failed to save D-Day navbar setting");
      await fetchDdayEnabled();
    }
  };

  const fetchChallenges = async () => {
    try {
      // Fetch events (challenges) from backend
      const response = await apiFetch(`${API_BASE_URL}/api/events/`);
      if (!response.ok) throw new Error("Failed to fetch challenges");
      const events = await response.json();
      // Convert events to challenges format
      const challengesData: Challenge[] = events.map((event: any) => ({
        id: event.id,
        event_id: event.id,
        sport: event.name || "General",
        gender: event.separated_genders ? "seperate" : "together",
        max_teammates: event.max_teammates || 0,
        min_teammates: event.min_teammates ?? null,
        whatsapp_link: event.whatsapp_link ?? null,
        name: event.name,
        description: event.description,
        max_participants: event.max_participants ?? null,
        max_participants_male: event.max_participants_male ?? null,
        max_participants_female: event.max_participants_female ?? null,
        waitlist_max_participants: event.waitlist_max_participants ?? null,
      }));
      setChallenges(challengesData);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingChallenge({
      event_id: 0,
      sport: "",
      gender: "together",
      max_teammates: 0,
      min_teammates: null,
      whatsapp_link: "",
      max_participants: null,
      max_participants_male: null,
      max_participants_female: null,
      waitlist_max_participants: null,
    });
    setShowForm(true);
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge({ ...challenge });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this challenge?")) return;

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/events/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete challenge");
      await fetchChallenges();
    } catch (error) {
      console.error("Error deleting challenge:", error);
      alert("Failed to delete challenge");
    }
  };

  const handleSave = async () => {
    if (!editingChallenge) return;

    try {
      const eventData = {
        name: editingChallenge.sport || "Challenge",
        description: editingChallenge.description || "",
        date: null,
        is_current: false,
        separated_genders: editingChallenge.gender === "seperate",
        max_teammates: editingChallenge.max_teammates || 0,
        min_teammates: editingChallenge.min_teammates ?? null,
        whatsapp_link: editingChallenge.whatsapp_link || null,
        max_participants:
          editingChallenge.gender === "seperate"
            ? null
            : editingChallenge.max_participants !== undefined &&
                editingChallenge.max_participants !== null &&
                !Number.isNaN(Number(editingChallenge.max_participants))
              ? Math.max(0, Number(editingChallenge.max_participants))
              : null,
        max_participants_male:
          editingChallenge.gender === "seperate" &&
          editingChallenge.max_participants_male !== undefined &&
          editingChallenge.max_participants_male !== null &&
          !Number.isNaN(Number(editingChallenge.max_participants_male))
            ? Math.max(0, Number(editingChallenge.max_participants_male))
            : null,
        max_participants_female:
          editingChallenge.gender === "seperate" &&
          editingChallenge.max_participants_female !== undefined &&
          editingChallenge.max_participants_female !== null &&
          !Number.isNaN(Number(editingChallenge.max_participants_female))
            ? Math.max(0, Number(editingChallenge.max_participants_female))
            : null,
        waitlist_max_participants:
          editingChallenge.waitlist_max_participants !== undefined &&
          editingChallenge.waitlist_max_participants !== null &&
          !Number.isNaN(Number(editingChallenge.waitlist_max_participants))
            ? Math.max(0, Number(editingChallenge.waitlist_max_participants))
            : null,
      };

      let response;
      if (editingChallenge.id) {
        // Update existing
        response = await apiFetch(`${API_BASE_URL}/api/events/${editingChallenge.id}`, {
          method: "PUT",
          body: JSON.stringify(eventData),
        });
      } else {
        // Create new
        response = await apiFetch(`${API_BASE_URL}/api/events/`, {
          method: "POST",
          body: JSON.stringify(eventData),
        });
      }

      if (!response.ok) throw new Error("Failed to save challenge");
      await fetchChallenges();
      setShowForm(false);
      setEditingChallenge(null);
    } catch (error) {
      console.error("Error saving challenge:", error);
      alert("Failed to save challenge");
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
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/admin")}
          className="mb-6 px-4 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 hover:text-blue-700 font-semibold flex items-center gap-2 transition-colors"
          style={{ fontFamily: "'Lato', sans-serif" }}
        >
          ← Back to Admin Panel
        </button>

        <div className="bg-white/90 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-6 md:p-12">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-8">
            <h1
              className="text-4xl md:text-5xl text-blue-900"
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              D-Day Challenges
            </h1>
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-yellow-400 text-blue-900 font-bold uppercase tracking-wide rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:bg-yellow-300 transition"
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              + Create Challenge
            </button>
          </div>

          <div className="mb-8 flex items-center justify-between p-4 bg-yellow-50 rounded-xl border-2 border-yellow-300">
            <div>
              <label className="text-lg font-semibold text-blue-900">
                Enable D-Day Button
              </label>
              <p className="text-sm text-blue-700">
                Show or hide the “D-Day” link in the navigation bar
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ddayEnabled}
                disabled={ddayEnabledLoading}
                onChange={(e) => saveDdayEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-400"></div>
            </label>
          </div>

          {showForm && editingChallenge && (
            <div className="mb-8 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
              <h2 className="text-2xl font-bold text-blue-900 mb-4">
                {editingChallenge.id ? "Edit Challenge" : "Create Challenge"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Sport Name *
                  </label>
                  <input
                    type="text"
                    value={editingChallenge.sport}
                    onChange={(e) =>
                      setEditingChallenge({ ...editingChallenge, sport: e.target.value })
                    }
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    placeholder="e.g., Basketball, Volleyball"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Gender Mode *
                  </label>
                  <select
                    value={editingChallenge.gender}
                    onChange={(e) =>
                      setEditingChallenge({
                        ...editingChallenge,
                        gender: e.target.value as "together" | "seperate",
                      })
                    }
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                  >
                    <option value="together">Together</option>
                    <option value="seperate">Seperate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Max Teammates
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingChallenge.max_teammates || 0}
                    onChange={(e) =>
                      setEditingChallenge({
                        ...editingChallenge,
                        max_teammates: parseInt(e.target.value) || 0,
                      })
                    }
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
                    value={editingChallenge.min_teammates ?? ""}
                    onChange={(e) =>
                      setEditingChallenge({
                        ...editingChallenge,
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
                    value={editingChallenge.whatsapp_link ?? ""}
                    onChange={(e) =>
                      setEditingChallenge({
                        ...editingChallenge,
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
                  {editingChallenge.gender === "seperate" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="text-sm font-semibold text-blue-900">
                        Male cap
                        <input
                          type="number"
                          min={0}
                          value={editingChallenge.max_participants_male ?? ""}
                          onChange={(e) =>
                            setEditingChallenge({
                              ...editingChallenge,
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
                          value={editingChallenge.max_participants_female ?? ""}
                          onChange={(e) =>
                            setEditingChallenge({
                              ...editingChallenge,
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
                      value={editingChallenge.max_participants ?? ""}
                      onChange={(e) =>
                        setEditingChallenge({
                          ...editingChallenge,
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
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Waitlist amount (optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingChallenge.waitlist_max_participants ?? ""}
                    onChange={(e) =>
                      setEditingChallenge({
                        ...editingChallenge,
                        waitlist_max_participants:
                          e.target.value === ""
                            ? null
                            : Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    placeholder="e.g. 16 (leave empty for no cap)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingChallenge.description || ""}
                    onChange={(e) =>
                      setEditingChallenge({ ...editingChallenge, description: e.target.value })
                    }
                    className="w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900"
                    rows={3}
                    placeholder="Challenge description..."
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-6 py-3 bg-yellow-400 text-blue-900 font-bold uppercase tracking-wide rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:bg-yellow-300 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingChallenge(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-blue-900 font-bold uppercase tracking-wide rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {challenges.length === 0 ? (
              <p className="text-center text-blue-700 py-8">No challenges yet. Create one to get started!</p>
            ) : (
              challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="p-5 md:p-6 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-blue-900 mb-2">
                        {challenge.sport || challenge.name || "Unnamed Challenge"}
                      </h3>
                      <div className="flex gap-4 text-sm text-blue-700">
                        <span>
                          <strong>Gender:</strong> {challenge.gender}
                        </span>
                        {challenge.max_teammates !== undefined && (
                          <span>
                            <strong>Max Teammates:</strong> {challenge.max_teammates}
                          </span>
                        )}
                        {challenge.min_teammates !== null &&
                          challenge.min_teammates !== undefined && (
                            <span>
                              <strong>Min Teammates:</strong>{" "}
                              {challenge.min_teammates}
                            </span>
                          )}
                        {challenge.max_participants != null && (
                          <span>
                            <strong>Max participants:</strong> {challenge.max_participants}
                          </span>
                        )}
                        {challenge.gender === "seperate" &&
                          (challenge.max_participants_male != null ||
                            challenge.max_participants_female != null) && (
                            <>
                              {challenge.max_participants_male != null ? (
                                <span>
                                  <strong>Male cap:</strong>{" "}
                                  {challenge.max_participants_male}
                                </span>
                              ) : null}
                              {challenge.max_participants_female != null ? (
                                <span>
                                  <strong>Female cap:</strong>{" "}
                                  {challenge.max_participants_female}
                                </span>
                              ) : null}
                            </>
                          )}
                        {challenge.waitlist_max_participants != null && (
                          <span>
                            <strong>Waitlist amount:</strong>{" "}
                            {challenge.waitlist_max_participants}
                          </span>
                        )}
                      </div>
                      {/* Description intentionally hidden on the grid card */}
                    </div>
                    <div className="flex gap-2 md:flex-col md:items-end">
                      <button
                        onClick={() => handleEdit(challenge)}
                        className="px-4 py-2 bg-blue-400 text-white font-semibold rounded-lg border-2 border-black hover:bg-blue-500 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => challenge.id && handleDelete(challenge.id)}
                        className="px-4 py-2 bg-red-400 text-white font-semibold rounded-lg border-2 border-black hover:bg-red-500 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DDay;

