import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, apiFetch } from "../../util/auth";
import DivisionEditor from "../../components/DivisionEditor";
import { apiError, eventDivisionDrafts, type Division, type DivisionDraft } from "../../types/divisions";

interface EventData {
  id: number;
  name: string;
  description?: string;
  date?: string | null;
  is_current: boolean;
  whatsapp_link?: string | null;
  divisions?: Division[];
}

const inputClass = "w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900";

const ChallengingWednesday: React.FC = () => {
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [divisions, setDivisions] = useState<DivisionDraft[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiCompatible, setApiCompatible] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadEvent = (data: EventData) => {
    // Validate the response before mutating any form state. Older APIs ignore
    // division settings, so do not invent defaults or report a successful save.
    let nextDivisions: DivisionDraft[];
    try {
      nextDivisions = eventDivisionDrafts(data);
    } catch (error) {
      setApiCompatible(false);
      throw error;
    }
    setApiCompatible(true);
    setEvent(data);
    setEnabled(data.is_current);
    setDivisions(nextDivisions);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiFetch(`${API_BASE_URL}/api/events/`);
        if (!response.ok) throw new Error("Failed to load event data");
        const events: EventData[] = await response.json();
        loadEvent(events.find((item) => item.is_current) ?? {
          id: 0, name: "Challenging Wednesday", description: "", date: null,
          is_current: false, whatsapp_link: "", divisions: [],
        });
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load event data" });
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const save = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (!event || !apiCompatible) return;
    const names = divisions.map((division) => division.name.trim().toLocaleLowerCase());
    if (!names.length || names.some((name) => !name) || new Set(names).size !== names.length) {
      setMessage({ type: "error", text: "Give every division a unique name." });
      return;
    }
    if (divisions.some((division) => division.min_teammates > division.max_teammates)) {
      setMessage({ type: "error", text: "Minimum teammates cannot exceed maximum teammates." });
      return;
    }
    setSaving(true); setMessage(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/events/${event.id || ""}`, {
        method: event.id ? "PUT" : "POST",
        body: JSON.stringify({
          name: event.name, description: event.description || "", date: event.date || null,
          is_current: enabled, whatsapp_link: event.whatsapp_link || null,
          divisions: divisions.map((division) => ({
            id: division.id, name: division.name.trim(), min_teammates: division.min_teammates,
            max_teammates: division.max_teammates, max_participants: division.max_participants,
            waitlist_max_participants: division.waitlist_max_participants,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Failed to save settings"));
      loadEvent(data);
      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save settings" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-200 flex items-center justify-center"><p className="text-blue-900 text-lg">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-200 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate("/admin")} className="mb-6 px-4 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 font-semibold">← Back to Admin Panel</button>
        <form onSubmit={save} className="bg-white/90 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-8 md:p-12 space-y-6">
          <h1 className="text-4xl md:text-5xl text-blue-900 mb-8" style={{ fontFamily: "'Permanent Marker', cursive" }}>Challenging Wednesday Settings</h1>
          {message && <div role="status" className={`p-4 rounded-xl border-2 ${message.type === "success" ? "bg-green-100 border-green-400 text-green-800" : "bg-red-100 border-red-400 text-red-800"}`}>{message.text}</div>}
          {!event ? <p className="text-red-700">Event settings could not be loaded. Refresh to try again.</p> : <>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border-2 border-yellow-300">
              <div><label htmlFor="challenge-enabled" className="text-lg font-semibold text-blue-900">Enable Challenging Wednesday Button</label><p className="text-sm text-blue-700">Show or hide the Challenging Wednesday link in the navigation</p></div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input id="challenge-enabled" type="checkbox" checked={enabled} onChange={(change) => setEnabled(change.target.checked)} className="sr-only peer" />
                <div className="w-14 h-7 bg-gray-200 peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-yellow-400" />
              </label>
            </div>
            <div className="space-y-4 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
              <h2 className="text-2xl font-bold text-blue-900">Event Parameters</h2>
              <label className="block text-sm font-semibold text-blue-900">Event Name
                <input required minLength={2} maxLength={100} value={event.name} onChange={(change) => setEvent({ ...event, name: change.target.value })} className={`mt-2 ${inputClass}`} />
              </label>
              <label className="block text-sm font-semibold text-blue-900">Description
                <textarea rows={4} maxLength={500} value={event.description || ""} onChange={(change) => setEvent({ ...event, description: change.target.value })} className={`mt-2 ${inputClass}`} />
              </label>
              <label className="block text-sm font-semibold text-blue-900">Date
                <input type="date" value={event.date?.split("T")[0] || ""} onChange={(change) => setEvent({ ...event, date: change.target.value || null })} className={`mt-2 ${inputClass}`} />
              </label>
              <label className="block text-sm font-semibold text-blue-900">WhatsApp Link (optional)
                <input value={event.whatsapp_link || ""} onChange={(change) => setEvent({ ...event, whatsapp_link: change.target.value })} className={`mt-2 ${inputClass}`} />
              </label>
              <DivisionEditor divisions={divisions} onChange={setDivisions} />
            </div>
            <button type="submit" disabled={saving || !apiCompatible} className="w-full px-6 py-4 bg-yellow-400 text-blue-900 font-bold uppercase tracking-[0.2em] rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed">{saving ? "Saving..." : "Save Settings"}</button>
          </>}
        </form>
      </div>
    </div>
  );
};

export default ChallengingWednesday;
