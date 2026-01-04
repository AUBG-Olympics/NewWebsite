import React, { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type GenderMode = "both" | "single";
type GenderSelection = "female" | "male";

export interface CustomizableFormProps {
  teammates?: number;
  gender?: GenderMode;
  onSubmit?: (payload: {
    name: string;
    email: string;
    phone: string;
    genderMode: GenderMode;
    genderSelection?: GenderSelection;
    teammates?: string[];
  }) => void;
}

const fieldStyles =
  "w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition";

const CustomizableForm: React.FC<CustomizableFormProps> = ({
  teammates = 0,
  gender = "both",
  onSubmit,
}) => {
  const sanitizedTeammates = useMemo(
    () => Math.max(0, Math.floor(teammates)),
    [teammates],
  );

  const [selectedGender, setSelectedGender] = useState<GenderSelection>("female");
  const [teammateNames, setTeammateNames] = useState<string[]>(
    Array.from({ length: sanitizedTeammates }, () => ""),
  );
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    setTeammateNames((prev) => {
      if (prev.length === sanitizedTeammates) return prev;
      const updated = [...prev];
      if (sanitizedTeammates > prev.length) {
        updated.push(
          ...Array.from({ length: sanitizedTeammates - prev.length }, () => ""),
        );
      } else {
        updated.length = sanitizedTeammates;
      }
      return updated;
    });
  }, [sanitizedTeammates]);

  const handleChange = (field: "name" | "email" | "phone", value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleTeammateChange = (index: number, value: string) => {
    setTeammateNames((prev) => {
      const clone = [...prev];
      clone[index] = value;
      return clone;
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.({
      ...formValues,
      genderMode: gender,
      genderSelection: gender === "single" ? selectedGender : undefined,
      teammates: sanitizedTeammates ? teammateNames : undefined,
    });
  };

  return (
    <section className="w-full flex justify-center py-16 px-4 md:px-0 bg-gradient-to-b from-orange-100 to-orange-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl bg-white/90 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-8 md:p-12 space-y-6"
        style={{ fontFamily: "'Lato', sans-serif" }}
      >
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-700">
            Register Your Team
          </p>
          <h2
            className="text-3xl md:text-4xl text-blue-900"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            Custom Signup Form
          </h2>
          <p className="text-blue-800 text-sm md:text-base max-w-xl mx-auto">
            Fill out the quick form below to let us know who is joining. Adjust
            teammate slots and gender requirements based on your event needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="flex flex-col gap-2 text-blue-900">
            <span className="text-sm font-semibold tracking-wide uppercase">
              Name*
            </span>
            <input
              className={fieldStyles}
              type="text"
              value={formValues.name}
              onChange={(event) => handleChange("name", event.target.value)}
              placeholder="Enter your full name"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-blue-900">
            <span className="text-sm font-semibold tracking-wide uppercase">
              Email*
            </span>
            <input
              className={fieldStyles}
              type="email"
              value={formValues.email}
              onChange={(event) => handleChange("email", event.target.value)}
              placeholder="name@example.com"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-blue-900">
            <span className="text-sm font-semibold tracking-wide uppercase">
              Phone Number*
            </span>
            <input
              className={fieldStyles}
              type="tel"
              value={formValues.phone}
              onChange={(event) => handleChange("phone", event.target.value)}
              placeholder="+359 123 456 789"
              required
            />
          </label>
        </div>

        {gender === "single" && (
          <div className="flex flex-col gap-3 text-blue-900">
            <span className="text-sm font-semibold tracking-wide uppercase">
              Select Gender
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["female", "male"] as GenderSelection[]).map((option) => (
                <label
                  key={option}
                  className={`cursor-pointer rounded-xl border-2 ${
                    selectedGender === option
                      ? "border-yellow-400 bg-yellow-100"
                      : "border-blue-200 bg-white"
                  } px-4 py-3 flex items-center justify-center text-sm font-semibold uppercase tracking-wide`}
                >
                  <input
                    type="radio"
                    name="genderSelection"
                    value={option}
                    checked={selectedGender === option}
                    onChange={() => setSelectedGender(option)}
                    className="hidden"
                  />
                  <span className="text-blue-900">
                    {option === "female" ? "Female" : "Male"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {sanitizedTeammates > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-blue-900">
                Teammates ({sanitizedTeammates})
              </span>
              <span className="text-xs text-blue-500">
                Add the name for each teammate slot.
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teammateNames.map((value, index) => (
                <input
                  key={`teammate-${index}`}
                  className={fieldStyles}
                  type="text"
                  value={value}
                  onChange={(event) =>
                    handleTeammateChange(index, event.target.value)
                  }
                  placeholder={`Teammate ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full px-6 py-4 bg-yellow-400 text-blue-900 font-bold uppercase tracking-[0.2em] rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:bg-yellow-300 transition"
        >
          Submit
        </button>
      </form>
    </section>
  );
};

export default CustomizableForm;

