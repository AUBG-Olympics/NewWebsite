import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, apiFetch } from "../../util/auth";
import DivisionEditor from "../../components/DivisionEditor";
import { apiError, eventDivisionDrafts, type Division, type DivisionDraft } from "../../types/divisions";

interface EventData {
  id: number; name: string; description?: string; date?: string | null;
  whatsapp_link?: string | null; is_current: boolean; divisions: Division[];
}
const fieldClass = "mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900";

const DDay: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventData[]>([]);
  const [editing, setEditing] = useState<EventData | null>(null);
  const [divisions, setDivisions] = useState<DivisionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchEvents = async () => {
    const response = await apiFetch(`${API_BASE_URL}/api/events/`);
    if (!response.ok) throw new Error("Failed to load events");
    setEvents(await response.json());
  };
  useEffect(() => {
    const load = async () => {
      try {
        await fetchEvents();
        const response = await apiFetch(`${API_BASE_URL}/api/settings/dday-enabled`);
        if (!response.ok) throw new Error("Failed to load D-Day setting");
        setEnabled(Boolean((await response.json()).dday_enabled));
      } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to load settings"); }
      finally { setLoading(false); }
    };
    load();
  }, []);
  const changeEnabled = async (value: boolean) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/settings/dday-enabled?enabled=${value}`, { method: "PUT" });
      if (!response.ok) throw new Error("Failed to save D-Day setting");
      setEnabled(value);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to save settings"); }
  };
  const edit = (event: EventData) => {
    try { setDivisions(eventDivisionDrafts(event)); setEditing(event); setMessage(null); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not load divisions"); }
  };
  const remove = async (event: EventData) => {
    if (!confirm("Are you sure you want to delete this challenge?")) return;
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/events/${event.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(apiError(await response.json(), "Failed to delete event"));
      await fetchEvents();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to delete event"); }
  };
  const save = async (submit: React.FormEvent) => {
    submit.preventDefault();
    if (!editing || saving) return;
    setSaving(true); setMessage(null);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/events/${editing.id || ""}`, {
        method: editing.id ? "PUT" : "POST",
        body: JSON.stringify({ name: editing.name, description: editing.description || "", date: editing.date || null,
          is_current: editing.is_current, whatsapp_link: editing.whatsapp_link || null,
          divisions: divisions.map((division) => ({ id: division.id, name: division.name.trim(),
            min_teammates: division.min_teammates, max_teammates: division.max_teammates,
            max_participants: division.max_participants, waitlist_max_participants: division.waitlist_max_participants })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Failed to save event"));
      eventDivisionDrafts(data);
      await fetchEvents(); setEditing(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed to save event"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-200 flex items-center justify-center"><p className="text-blue-900 text-lg">Loading...</p></div>;
  return <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-200 py-16 px-4"><div className="max-w-5xl mx-auto">
    <button onClick={() => navigate("/admin")} className="mb-6 px-4 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 font-semibold">← Back to Admin Panel</button>
    <div className="bg-white/90 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-8 md:p-12 space-y-6">
      <h1 className="text-4xl md:text-5xl text-blue-900" style={{ fontFamily: "'Permanent Marker', cursive" }}>D-Day Settings</h1>
      {message && <p role="alert" className="p-4 border-2 border-red-400 bg-red-100 text-red-800 rounded-xl">{message}</p>}
      <label className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border-2 border-yellow-300 text-blue-900 font-semibold">Enable D-Day Button
        <input type="checkbox" checked={enabled} onChange={(change) => changeEnabled(change.target.checked)} className="w-6 h-6 accent-orange-500" />
      </label>
      <button onClick={() => edit({ id: 0, name: "", is_current: false, divisions: [] })} className="px-5 py-3 bg-yellow-400 text-blue-900 font-bold border-2 border-black rounded-xl hover:bg-yellow-300">+ Add Challenge</button>
      {editing && <form onSubmit={save} className="p-6 bg-blue-50 rounded-xl border-2 border-blue-200 space-y-4">
        <h2 className="text-2xl font-bold text-blue-900">{editing.id ? "Edit Challenge" : "Create Challenge"}</h2>
        <label className="block text-sm font-semibold text-blue-900">Event Name<input required minLength={2} maxLength={100} value={editing.name} onChange={(change) => setEditing({ ...editing, name: change.target.value })} className={fieldClass} /></label>
        <label className="block text-sm font-semibold text-blue-900">Description<textarea maxLength={500} rows={3} value={editing.description || ""} onChange={(change) => setEditing({ ...editing, description: change.target.value })} className={fieldClass} /></label>
        <label className="block text-sm font-semibold text-blue-900">Date<input type="date" value={editing.date?.split("T")[0] || ""} onChange={(change) => setEditing({ ...editing, date: change.target.value || null })} className={fieldClass} /></label>
        <label className="block text-sm font-semibold text-blue-900">WhatsApp Link (optional)<input value={editing.whatsapp_link || ""} onChange={(change) => setEditing({ ...editing, whatsapp_link: change.target.value })} className={fieldClass} /></label>
        <DivisionEditor divisions={divisions} onChange={setDivisions} />
        <div className="flex gap-4"><button type="submit" disabled={saving} className="flex-1 px-6 py-3 bg-yellow-400 text-blue-900 font-bold border-2 border-black rounded-xl disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
          <button type="button" onClick={() => setEditing(null)} className="flex-1 px-6 py-3 bg-gray-200 text-blue-900 font-bold border-2 border-black rounded-xl">Cancel</button></div>
      </form>}
      <div className="space-y-4">{!events.length ? <p className="text-center text-blue-700 py-8">No challenges yet. Create one to get started!</p> : events.map((event) =>
        <div key={event.id} className="p-5 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] flex flex-col md:flex-row justify-between gap-4">
          <div><h3 className="text-2xl font-bold text-blue-900">{event.name}</h3><p className="text-sm text-blue-700 mt-2">Divisions: {event.divisions.map((division) => division.name).join(", ")}</p></div>
          <div className="flex gap-2 items-start"><button onClick={() => edit(event)} className="px-4 py-2 bg-blue-400 text-white font-semibold rounded-lg border-2 border-black hover:bg-blue-500">Edit</button>
            <button onClick={() => remove(event)} className="px-4 py-2 bg-red-400 text-white font-semibold rounded-lg border-2 border-black hover:bg-red-500">Delete</button></div>
        </div>)}</div>
    </div>
  </div></div>;
};
export default DDay;
