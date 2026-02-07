import React, { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type GenderSelection = "female" | "male";

interface FormSubmissionPayload {
  event_id: number;
  sport: string;
  name: string;
  phone_number: string;
  email: string;
  teammates: string | null;
  gender?:string;
  
}

export interface CustomizableFormProps {
  teammates?: number;
  separated_genders?: boolean;
  eventId?: number;
  sport?: string;
  description?:string;
  onSubmit?: (payload: {
    name: string;
    email: string;
    phone: string;
    separated_genders?: boolean;
    genderSelection?: GenderSelection;
    teammates?: string[];
  }) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const fieldStyles =
  "w-full rounded-xl border-2 border-black px-4 py-3 bg-white text-blue-900 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition";

const CustomizableForm: React.FC<CustomizableFormProps> = ({
  teammates = 0,
  separated_genders = false,
  eventId,
  sport,
  description = "",
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

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

    // teammates: if provided, backend requires 1–50 chars total
    if (sanitizedTeammates > 0 && teammateNames.length > 0) {
      const teammatesString = teammateNames
        .filter((name) => name.trim() !== "")
        .join(", ");
      if (teammatesString) {
        if (teammatesString.length < 1 || teammatesString.length > 50) {
          errors.push("Teammates description must be between 1 and 50 characters.");
        }
      }
    }

    // gender: backend allows 1–20 chars; our options ("male"/"female") already satisfy this,
    // so no extra validation needed beyond presence when separated_genders is true.

    return errors;
  };

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
      // Map frontend data to backend schema format
      const genderValue = separated_genders ? selectedGender : null;
      const teammatesString = sanitizedTeammates > 0 && teammateNames.length > 0
        ? teammateNames.filter(name => name.trim() !== "").join(", ")
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
            const capData = await capRes.json();
            if (capData.is_full) {
              setIsSubmitting(false);
              setSubmitStatus({
                type: "error",
                message:
                  "The participant cap has been filled. Registration for this sport is no longer available.",
              });
              return;
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
          teammates: teammatesString,
        };

        // Only include gender if separated_genders is true
        if (separated_genders && genderValue) {
          payload.gender = genderValue;
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
          message: "Form submitted successfully! We'll be in touch soon.",
        });

        // Reset form after successful submission
        setFormValues({ name: "", email: "", phone: "" });
        setTeammateNames(Array.from({ length: sanitizedTeammates }, () => ""));
      }

      // Call custom onSubmit handler if provided
      if (onSubmit) {
        onSubmit({
          ...formValues,
          separated_genders: separated_genders,
          genderSelection: separated_genders ? selectedGender : undefined,
          teammates: sanitizedTeammates ? teammateNames : undefined,
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
          <h2
            className="text-3xl md:text-4xl text-orange-500 font-lilita"
          >
            {sport?.toUpperCase()}
          </h2>
          <p className="text-blue-800 text-sm md:text-base max-w-xl mx-auto">
            {description}
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

        {separated_genders === true && (
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

