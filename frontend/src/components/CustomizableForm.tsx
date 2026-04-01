import React, { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type GenderSelection = "female" | "male";

interface FormSubmissionPayload {
  event_id: number;
  sport: string;
  name: string;
  team_name?: string;
  phone_number: string;
  email: string;
  teammates: string | null;
  gender?: GenderSelection | null;
}

export interface CustomizableFormProps {
  maxTeammates?: number;
  minTeammates?: number | null;
  separated_genders?: boolean;
  eventId?: number;
  sport?: string;
  description?: string;
  waitlistEnabled?: boolean;
  capacityIsFull?: boolean;
  capacityInfo?: any;
  onSubmit?: (payload: {
    name: string;
    email: string;
    phone: string;
    separated_genders?: boolean;
    genderSelection?: GenderSelection;
    teammates?: string[];
    team_name?: string;
  }) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

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
  maxTeammates = 0,
  minTeammates = null,
  separated_genders = false,
  eventId,
  sport,
  description = "",
  waitlistEnabled = false,
  capacityIsFull = false,
  capacityInfo,
  onSubmit,
}) => {
  const sanitizedMaxTeammates = useMemo(
    () => Math.max(0, Math.floor(maxTeammates)),
    [maxTeammates],
  );

  const [selectedGender, setSelectedGender] = useState<GenderSelection>("female");
  const [hasUserSelectedGender, setHasUserSelectedGender] = useState(false);
  const [teammateNames, setTeammateNames] = useState<string[]>(
    Array.from({ length: sanitizedMaxTeammates }, () => ""),
  );
  const [teamName, setTeamName] = useState("");
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isWaitlistMode, setIsWaitlistMode] = useState(false);

  const isSelectedGenderWaitlist =
    separated_genders === true
      ? selectedGender === "male"
        ? Boolean(capacityInfo?.male_waitlist)
        : Boolean(capacityInfo?.female_waitlist)
      : Boolean(capacityInfo?.waitlist);

  const isSelectedGenderFull =
    separated_genders === true
      ? selectedGender === "male"
        ? Boolean(capacityInfo?.male_is_full) && !isSelectedGenderWaitlist
        : Boolean(capacityInfo?.female_is_full) && !isSelectedGenderWaitlist
      : Boolean(capacityInfo?.full) && !isSelectedGenderWaitlist;

  const maleClosed = Boolean(
    separated_genders &&
      capacityInfo?.male_is_full &&
      !capacityInfo?.male_waitlist,
  );
  const femaleClosed = Boolean(
    separated_genders &&
      capacityInfo?.female_is_full &&
      !capacityInfo?.female_waitlist,
  );
  const availableGenderOptions = (["female", "male"] as GenderSelection[]).filter(
    (g) => (g === "male" ? !maleClosed : !femaleClosed),
  );

  // Keep waitlist banner in sync with currently selected gender.
  useEffect(() => {
    if (!capacityInfo) {
      setIsWaitlistMode(Boolean(waitlistEnabled && capacityIsFull));
      return;
    }
    setIsWaitlistMode(isSelectedGenderWaitlist);
  }, [
    capacityInfo,
    isSelectedGenderWaitlist,
    waitlistEnabled,
    capacityIsFull,
    selectedGender,
  ]);

  const validateForm = (): string[] => {
    const errors: string[] = [];

    const trimmedName = formValues.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      errors.push("Name must be between 2 and 50 characters.");
    }

    const trimmedEmail = formValues.email.trim();
    // Basic email validation to roughly match Pydantic's EmailStr
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      errors.push("Please enter a valid email address.");
    }

    // Match backend phone_number validator: 10–15 digits, ignoring other characters
    const phoneDigits = formValues.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      errors.push("Phone number must be 10–15 digits (numbers only).");
    }

    // sport backend constraint: 2–50 chars
    if (sport) {
      const trimmedSport = sport.trim();
      if (trimmedSport.length < 2 || trimmedSport.length > 50) {
        errors.push("Sport name must be between 2 and 50 characters.");
      }
    }

    if (sanitizedMaxTeammates > 0) {
      const trimmedTeamName = teamName.trim();
      if (trimmedTeamName.length === 0) {
        errors.push("Team name is required for this sport.");
      }

      const filledCount = teammateNames.filter(
        (name) => name.trim().length > 0,
      ).length;

      if (minTeammates !== null && minTeammates !== undefined) {
        if (filledCount < minTeammates) {
          errors.push(`Please enter at least ${minTeammates} teammate names.`);
        }
      }
    }
    return errors;
  };

  useEffect(() => {
    setTeammateNames((prev) => {
      if (prev.length === sanitizedMaxTeammates) return prev;
      const updated = [...prev];
      if (sanitizedMaxTeammates > prev.length) {
        updated.push(
          ...Array.from(
            { length: sanitizedMaxTeammates - prev.length },
            () => "",
          ),
        );
      } else {
        updated.length = sanitizedMaxTeammates;
      }
      return updated;
    });
  }, [sanitizedMaxTeammates]);

  // Choose a sensible default gender when only one cap still has room.
  // Do this only before the user manually changes the selection.
  useEffect(() => {
    if (!separated_genders || hasUserSelectedGender || !capacityInfo) return;

    const maleFull = Boolean(capacityInfo.male_is_full);
    const femaleFull = Boolean(capacityInfo.female_is_full);

    if (maleFull && !femaleFull) {
      setSelectedGender("female");
    } else if (femaleFull && !maleFull) {
      setSelectedGender("male");
    }
  }, [separated_genders, hasUserSelectedGender, capacityInfo]);

  // If current selected gender becomes unavailable, switch to the remaining available option.
  useEffect(() => {
    if (!separated_genders) return;
    if (availableGenderOptions.length === 0) return;
    if (!availableGenderOptions.includes(selectedGender)) {
      setSelectedGender(availableGenderOptions[0]);
    }
  }, [separated_genders, availableGenderOptions, selectedGender]);

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setIsSubmitting(false);
      setSubmitStatus({
        type: "error",
        message: validationErrors.join(" | "),
      });
      return;
    }

    try {
      let submitAsWaitlist = isSelectedGenderWaitlist;

      // Map frontend data to backend schema format
      const filledTeammates = teammateNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0);
      const teammatesString =
        sanitizedMaxTeammates > 0
          ? filledTeammates.length > 0
            ? filledTeammates.join(", ")
            : null
          : null;

      // Only submit to API if eventId and sport are provided
      if (eventId && sport) {
        // Re-check capacity before submit (cap may have filled while user was filling the form)
        try {
          const sportParam = encodeURIComponent(sport);
          const capRes = await fetch(
            `${API_BASE_URL}/api/forms/capacity/${eventId}?sport=${sportParam}`,
          );
          if (capRes.ok) {
            const capData: any = await capRes.json();
            const selectedGenderFullFromCap =
              separated_genders === true
                ? selectedGender === "male"
                  ? Boolean(capData.male_is_full)
                  : Boolean(capData.female_is_full)
                : Boolean(capData.full);
            const selectedGenderWaitlistFromCap =
              separated_genders === true
                ? selectedGender === "male"
                  ? Boolean(capData.male_waitlist)
                  : Boolean(capData.female_waitlist)
                : Boolean(capData.waitlist);

            submitAsWaitlist = selectedGenderWaitlistFromCap;

            if (selectedGenderFullFromCap && !selectedGenderWaitlistFromCap) {
              setIsSubmitting(false);
              setSubmitStatus({
                type: "error",
                message:
                  "The participant cap has been filled for your selected gender. Registration is no longer available.",
              });
              return;
            }

            if (selectedGenderWaitlistFromCap) {
              setIsWaitlistMode(true);
            }
          }
        } catch (_e) {
          // Proceed with submit; backend will enforce cap
        }

        const payload: FormSubmissionPayload = {
          event_id: eventId,
          sport: sport,
          name: formValues.name,
          phone_number: formValues.phone,
          email: formValues.email,
          team_name: sanitizedMaxTeammates > 0 ? teamName.trim() : undefined,
          teammates: teammatesString,
        };

        // Only include gender if separated_genders is true
        if (separated_genders) {
          payload.gender = selectedGender;
        }

        // Submit to backend API
        const response = await fetch(`${API_BASE_URL}/api/forms/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: "Failed to submit form" }));
          throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        await response.json();
        setSubmitStatus({
          type: "success",
          message: submitAsWaitlist
            ? "Form submitted successfully! You’ve been added to the waitlist."
            : "Form submitted successfully! We'll be in touch soon.",
        });

        // Reset form after successful submission
        setFormValues({ name: "", email: "", phone: "" });
        setTeamName("");
        setTeammateNames(Array.from({ length: sanitizedMaxTeammates }, () => ""));
      }

      // Call custom onSubmit handler if provided
      if (onSubmit) {
        onSubmit({
          ...formValues,
          separated_genders: separated_genders,
          genderSelection: separated_genders ? selectedGender : undefined,
          teammates: sanitizedMaxTeammates ? teammateNames : undefined,
          team_name: sanitizedMaxTeammates > 0 ? teamName : undefined,
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to submit form. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full flex justify-center py-16 px-4 md:px-0">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl bg-white/90 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-8 md:p-12 space-y-6"
        style={{ fontFamily: "'Lato', sans-serif" }}
      >
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <h2
              className="text-3xl md:text-4xl text-orange-500 font-lilita"
            >
              {sport?.toUpperCase()}
            </h2>
            {isSelectedGenderWaitlist && (
              <span className="inline-flex items-center rounded-full bg-orange-500 text-white text-xs font-bold px-3 py-1 border-2 border-black">
                WAITLIST
              </span>
            )}
            {isSelectedGenderFull && !isSelectedGenderWaitlist && (
              <span className="inline-flex items-center rounded-full bg-red-600 text-white text-xs font-bold px-3 py-1 border-2 border-black">
                FULL
              </span>
            )}
          </div>
          <p className="text-blue-800 text-sm md:text-base max-w-xl mx-auto">
            {renderDescriptionWithLinks(description)}
          </p>
        </div>

        {isWaitlistMode ? (
          <div className="w-full px-4 py-3 rounded-xl border-2 bg-orange-100 border-orange-400 text-orange-900">
            <p className="text-sm font-semibold">
              The cap is filled. Submissions are being added to the waitlist.
            </p>
          </div>
        ) : null}

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

        {separated_genders === true && (
          <div className="flex flex-col gap-3 text-blue-900">
            <span className="text-sm font-semibold tracking-wide uppercase">
              Select Gender
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {availableGenderOptions.map((option) => (
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
                    onChange={() => {
                      setHasUserSelectedGender(true);
                      setSelectedGender(option);
                    }}
                    className="hidden"
                  />
                  <span className="text-blue-900">
                    {option === "female"
                      ? capacityInfo?.female_waitlist
                        ? "Female (Waitlist)"
                        : "Female"
                      : capacityInfo?.male_waitlist
                        ? "Male (Waitlist)"
                        : "Male"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {sanitizedMaxTeammates > 0 && (
          <div className="space-y-3">
            <label className="flex flex-col gap-2 text-blue-900">
              <span className="text-sm font-semibold tracking-wide uppercase">
                Team Name*
              </span>
              <input
                className={fieldStyles}
                type="text"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Enter your team name"
              />
            </label>

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-blue-900">
                Teammates ({sanitizedMaxTeammates})
              </span>
              <span className="text-sm text-red-600">
                {minTeammates !== null && minTeammates !== undefined
                  ? `Min ${minTeammates} teammates required`
                  : `Add up to ${sanitizedMaxTeammates} teammates`}
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
                  aria-required={false}
                />
              ))}
            </div>
          </div>
        )}

        {submitStatus.type && (
          <div
            className={`w-full px-4 py-3 rounded-xl border-2 ${
              submitStatus.type === "success"
                ? "bg-green-100 border-green-400 text-green-800"
                : "bg-red-100 border-red-400 text-red-800"
            }`}
          >
            <p className="text-sm font-semibold">{submitStatus.message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-6 py-4 bg-yellow-400 text-blue-900 font-bold uppercase tracking-[0.2em] rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition ${
            isSubmitting
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-yellow-300"
          }`}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </section>
  );
};

export default CustomizableForm;

