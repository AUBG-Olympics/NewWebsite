import React, { useEffect, useState, type FormEvent } from "react";
import { API_BASE_URL } from "../util/api";
import {
  apiError,
  type Division,
  type DivisionCapacity,
} from "../types/divisions";

interface Contact {
  name: string;
  email: string;
  phone: string;
}
export interface CustomizableFormProps {
  divisions: Division[];
  eventId?: number;
  sport?: string;
  description?: string;
  capacityInfo?: { divisions?: DivisionCapacity[] };
  onSubmit?: (
    payload: Contact & {
      division_id: number;
      teammates: string[];
      team_name?: string;
    },
  ) => void;
}
const fieldStyles =
  "w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition";
const urlRegex = /(https?:\/\/[^\s]+)/g;

function renderDescriptionWithLinks(text: string): React.ReactNode {
  const value = (text || "").trim();
  if (!value) return null;

  const matches = Array.from(value.matchAll(urlRegex));
  if (matches.length === 0) return value;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const m of matches) {
    const url = m[0];
    const index = m.index ?? 0;

    if (index > lastIndex) {
      nodes.push(value.slice(lastIndex, index));
    }

    nodes.push(
      <a
        key={`${url}-${index}`}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-blue-800 underline"
      >
        RULES
      </a>,
    );

    lastIndex = index + url.length;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes;
}

const CustomizableForm: React.FC<CustomizableFormProps> = ({
  divisions,
  eventId,
  sport,
  description = "",
  capacityInfo,
  onSubmit,
}) => {
  const options = Array.isArray(divisions) ? divisions : [];
  const [capacity, setCapacity] = useState(capacityInfo);
  const [selectedId, setSelectedId] = useState(
    () =>
      options.find(
        (division) =>
          !capacityInfo?.divisions?.find((row) => row.id === division.id)
            ?.closed,
      )?.id ?? options[0]?.id,
  );
  const selected =
    options.find((division) => division.id === selectedId) ?? options[0];
  const maxTeammates = selected?.max_teammates ?? 0;
  const [teammates, setTeammates] = useState<string[]>(() =>
    Array.from({ length: maxTeammates }, () => ""),
  );
  const [teamName, setTeamName] = useState("");
  const [contact, setContact] = useState<Contact>({
    name: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const selectedCapacity = capacity?.divisions?.find(
    (row) => row.id === selected?.id,
  );
  useEffect(() => setCapacity(capacityInfo), [capacityInfo]);
  useEffect(
    () =>
      setTeammates((previous) =>
        Array.from(
          { length: maxTeammates },
          (_, index) => previous[index] ?? "",
        ),
      ),
    [maxTeammates],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || !selected) return;
    setStatus(null);
    const names = teammates.map((name) => name.trim()).filter(Boolean);
    const error =
      contact.name.trim().length < 2 || contact.name.trim().length > 50
        ? "Name must be between 2 and 50 characters."
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())
          ? "Please enter a valid email address."
          : !/^\d{10,15}$/.test(contact.phone.replace(/\D/g, ""))
            ? "Phone number must be 10–15 digits."
            : names.length < selected.min_teammates ||
                names.length > selected.max_teammates
              ? `This division requires ${selected.min_teammates} to ${selected.max_teammates} teammates.`
              : selected.max_teammates > 0 && !teamName.trim()
                ? "Team name is required for this division."
                : selectedCapacity?.closed
                  ? "This division is full. Please choose another division."
                  : null;
    if (error) {
      setStatus({ type: "error", message: error });
      return;
    }
    setSubmitting(true);
    try {
      if (!eventId || !sport)
        throw new Error("Event details are missing. Refresh the page.");
      const check = await fetch(
        `${API_BASE_URL}/api/forms/capacity/${eventId}`,
      );
      if (!check.ok)
        throw new Error(
          apiError(
            await check.json(),
            "Could not check division availability.",
          ),
        );
      const latest = await check.json();
      setCapacity(latest);
      const latestDivision: DivisionCapacity | undefined =
        latest.divisions?.find(
          (row: DivisionCapacity) => row.id === selected.id,
        );
      if (!latestDivision)
        throw new Error(
          "This division is no longer available. Refresh the page.",
        );
      if (latestDivision.closed)
        throw new Error(
          "This division is full. Please choose another division.",
        );
      const response = await fetch(`${API_BASE_URL}/api/forms/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          division_id: selected.id,
          sport,
          name: contact.name.trim(),
          email: contact.email.trim(),
          phone_number: contact.phone.replace(/\D/g, ""),
          teammates: names.length ? names.join(", ") : null,
          team_name: selected.max_teammates ? teamName.trim() : null,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(apiError(data, "Failed to submit registration."));
      setStatus({
        type: "success",
        message: latestDivision.waitlist
          ? "Form submitted successfully! You’ve been added to the waitlist."
          : "Form submitted successfully! We'll be in touch soon.",
      });
      onSubmit?.({
        ...contact,
        division_id: selected.id,
        teammates: names,
        team_name: selected.max_teammates ? teamName.trim() : undefined,
      });
      setContact({ name: "", email: "", phone: "" });
      setTeamName("");
      setTeammates(Array.from({ length: maxTeammates }, () => ""));
    } catch (failure) {
      setStatus({
        type: "error",
        message:
          failure instanceof Error
            ? failure.message
            : "Failed to submit registration.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!selected)
    return (
      <p role="alert" className="p-6 text-center text-red-700">
        Event divisions could not be loaded. Refresh the page or contact the
        organizers.
      </p>
    );
  return (
    <section className="w-full flex justify-center py-16 px-4 md:px-0">
      <form
        onSubmit={submit}
        className="w-full max-w-3xl bg-white/90 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-8 md:p-12 space-y-6"
        style={{ fontFamily: "'Lato', sans-serif" }}
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl md:text-4xl text-orange-500 font-lilita">
            {sport?.toUpperCase()}
          </h2>
          <p className="text-blue-800 text-sm md:text-base max-w-xl mx-auto">
            {renderDescriptionWithLinks(description)}
          </p>
        </div>
        {selectedCapacity?.waitlist && (
          <div className="px-4 py-3 rounded-xl border-2 bg-orange-100 border-orange-400 text-orange-900">
            <strong>WAITLIST</strong> — The cap is filled. Submissions are being
            added to the waitlist.
          </div>
        )}
        {selectedCapacity?.closed && (
          <p
            role="alert"
            className="px-4 py-3 rounded-xl border-2 bg-red-100 border-red-400 text-red-800"
          >
            This division is full. Please choose another division.
          </p>
        )}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold tracking-wide uppercase text-blue-900 mb-3">
            Select Division
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((division) => {
              const available = capacity?.divisions?.find(
                (row) => row.id === division.id,
              );
              return (
                <label
                  key={division.id}
                  className={`cursor-pointer break-words rounded-xl border-2 px-4 py-3 text-sm font-semibold text-blue-900 ${selected.id === division.id ? "border-yellow-400 bg-yellow-100" : "border-blue-200 bg-white"}`}
                >
                  <input
                    type="radio"
                    name="division"
                    value={division.id}
                    checked={selected.id === division.id}
                    disabled={submitting}
                    onChange={() => {
                      setSelectedId(division.id);
                      setTeamName("");
                      setTeammates(
                        Array.from(
                          { length: division.max_teammates },
                          () => "",
                        ),
                      );
                      setStatus(null);
                    }}
                    className="mr-2 accent-orange-500"
                  />
                  {division.name}
                  {available?.waitlist
                    ? " (Waitlist)"
                    : available?.closed
                      ? " — FULL"
                      : ""}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(
            [
              ["name", "Name*", "text", "Enter your full name"],
              ["email", "Email*", "email", "name@example.com"],
              ["phone", "Phone Number*", "tel", "+359 123 456 789"],
            ] as const
          ).map(([key, label, type, placeholder]) => (
            <label key={key} className="flex flex-col gap-2 text-blue-900">
              <span className="text-sm font-semibold tracking-wide uppercase">
                {label}
              </span>
              <input
                required
                type={type}
                value={contact[key]}
                onChange={(change) =>
                  setContact({ ...contact, [key]: change.target.value })
                }
                placeholder={placeholder}
                className={fieldStyles}
              />
            </label>
          ))}
        </div>
        {maxTeammates > 0 && (
          <div className="space-y-3">
            <label className="flex flex-col gap-2 text-blue-900">
              <span className="text-sm font-semibold tracking-wide uppercase">
                Team Name*
              </span>
              <input
                required
                value={teamName}
                onChange={(change) => setTeamName(change.target.value)}
                placeholder="Enter your team name"
                className={fieldStyles}
              />
            </label>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-blue-900">
                Teammates ({maxTeammates})
              </span>
              <span className="text-sm text-red-600">
                Min {selected.min_teammates} teammates required
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teammates.map((name, index) => (
                <input
                  key={index}
                  value={name}
                  onChange={(change) =>
                    setTeammates(
                      teammates.map((value, current) =>
                        current === index ? change.target.value : value,
                      ),
                    )
                  }
                  placeholder={`Teammate ${index + 1}`}
                  required={index < selected.min_teammates}
                  className={fieldStyles}
                />
              ))}
            </div>
          </div>
        )}
        {status && (
          <p
            role="status"
            className={`px-4 py-3 rounded-xl border-2 ${status.type === "success" ? "bg-green-100 border-green-400 text-green-800" : "bg-red-100 border-red-400 text-red-800"}`}
          >
            {status.message}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || selectedCapacity?.closed}
          className="w-full px-6 py-4 bg-yellow-400 text-blue-900 font-bold uppercase tracking-[0.2em] rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </section>
  );
};
export default CustomizableForm;
