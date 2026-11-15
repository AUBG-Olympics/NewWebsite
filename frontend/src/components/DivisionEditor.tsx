import React from "react";
import { newDivision, type DivisionDraft } from "../types/divisions";

const inputClass = "mt-2 w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900";

const DivisionEditor: React.FC<{
  divisions: DivisionDraft[];
  onChange: (divisions: DivisionDraft[]) => void;
}> = ({ divisions, onChange }) => {
  const update = (index: number, patch: Partial<DivisionDraft>) =>
    onChange(divisions.map((division, current) => current === index ? { ...division, ...patch } : division));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold text-blue-900">Divisions ({divisions.length})</h3>
        <button type="button" onClick={() => onChange([...divisions, newDivision()])}
          className="px-4 py-2 bg-yellow-400 text-blue-900 font-bold rounded-xl border-2 border-black hover:bg-yellow-300">
          + Add Division
        </button>
      </div>
      <p className="text-sm text-blue-700">
        Name each division and set its team size. Teammates exclude the person registering:
        singles use 0; doubles use a minimum and maximum of 1. Limits count registrations (players or teams).
      </p>
      {divisions.map((division, index) => (
        <fieldset key={division.clientKey} className="min-w-0 p-4 bg-white rounded-xl border-2 border-blue-300 space-y-4">
          <legend className="px-2 text-blue-900 font-bold">Division {index + 1}</legend>
          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1 text-sm font-semibold text-blue-900">
              Division Name
              <input required maxLength={100} value={division.name} placeholder="e.g. Men's singles, Women's singles, Doubles"
                onChange={(event) => update(index, { name: event.target.value })} className={inputClass} />
            </label>
            <button type="button" disabled={divisions.length === 1}
              onClick={() => onChange(divisions.filter((_, current) => current !== index))}
              className="px-3 py-3 text-red-700 border-2 border-red-300 rounded-xl hover:bg-red-50 disabled:opacity-40">
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm font-semibold text-blue-900">Minimum Teammates
              <input type="number" required min={0} step={1} value={division.min_teammates}
                onChange={(event) => update(index, { min_teammates: Number(event.target.value) })} className={inputClass} />
            </label>
            <label className="text-sm font-semibold text-blue-900">Maximum Teammates
              <input type="number" required min={division.min_teammates} step={1} value={division.max_teammates}
                onChange={(event) => update(index, { max_teammates: Number(event.target.value) })} className={inputClass} />
            </label>
            <label className="text-sm font-semibold text-blue-900">Registration Limit (optional)
              <input type="number" min={0} step={1} value={division.max_participants ?? ""} placeholder="No limit"
                onChange={(event) => update(index, { max_participants: event.target.value === "" ? null : Number(event.target.value) })}
                className={inputClass} />
            </label>
            <label className="text-sm font-semibold text-blue-900">Waitlist Entries
              <input type="number" required min={0} step={1} value={division.waitlist_max_participants}
                onChange={(event) => update(index, { waitlist_max_participants: Number(event.target.value) })} className={inputClass} />
              <span className="block mt-1 text-xs font-normal">0 disables the waitlist for this division.</span>
            </label>
          </div>
        </fieldset>
      ))}
      <p className="text-sm text-blue-700">Removing a division closes registration for it. Existing registrations are kept.</p>
    </div>
  );
};

export default DivisionEditor;
