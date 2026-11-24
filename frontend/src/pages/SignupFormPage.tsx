import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomizableForm from "../components/CustomizableForm";
import SponsorCarousel from "../components/SponsorCarousel";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface Event {
  id: number;
  name: string;
  description?: string;
  date?: string;
  separated_genders?: boolean;
  max_teammates?: number;
  min_teammates?: number | null;
  whatsapp_link?: string | null;
  max_participants?: number | null;
  enable_waitlist?: boolean;
  waitlist?: boolean;
  waitlist_max_participants?: number | null;
  is_current: boolean;
}

const SignupFormPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFull, setIsFull] = useState(false);
  const [capacityInfo, setCapacityInfo] = useState<any | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) {
        setError("Event ID is missing");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/events/`);
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const events: Event[] = await response.json();
        const foundEvent = events.find((e) => e.id === parseInt(eventId, 10));

        if (!foundEvent) {
          setError("Event not found");
          return;
        }

        // Only allow signup when the event is marked as current
        // if (!foundEvent.is_current) {
        //   setError("Registrations for this event are not open.");
        //   return;
        // }

        setEvent(foundEvent);

        // Always check capacity when page is opened (before showing form)
        try {
          const sportParam = encodeURIComponent(foundEvent.name);
          const capRes = await fetch(
            `${API_BASE_URL}/api/forms/capacity/${foundEvent.id}?sport=${sportParam}`,
          );
          if (capRes.ok) {
            const data = await capRes.json();
            setIsFull(Boolean(data.full));
            setCapacityInfo(data);
          }
        } catch (e) {
          console.error("Failed to fetch capacity status", e);
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100 flex items-center justify-center">
        <p className="text-blue-900 text-lg">Loading...</p>
      </section>
    );
  }

  if (error || !event) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100 flex items-center justify-center">
        <div className="text-center text-blue-900 bg-white p-6 rounded-lg shadow-md">
          <p className="text-lg mb-4">
            {error || "Event not found. Please contact an administrator."}
          </p>
          <button
            onClick={() => navigate("/dday")}
            className="mt-4 px-6 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
          >
            Back to Events
          </button>
        </div>
      </section>
    );
  }

  const isWaitlist = Boolean(capacityInfo?.waitlist);
  const waitlistEnabled = Boolean(
    capacityInfo?.waitlist ||
      capacityInfo?.male_waitlist ||
      capacityInfo?.female_waitlist,
  );

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto mb-6">
          <SponsorCarousel />
        </div>
        <button
          onClick={() => navigate("/dday")}
          className="mb-6 px-4 py-2 bg-white text-blue-900 rounded-lg hover:bg-blue-50 hover:text-blue-700 font-semibold flex items-center gap-2 transition-colors"
        >
          ← Back to Events
        </button>
        {isFull && !isWaitlist ? (
          <div className="max-w-3xl mx-auto bg-white/90 border-4 border-red-500 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-red-600 mb-4">
              The cap has already been filled
            </h2>
            <p className="text-blue-900">
              Registration for this event is no longer available.
            </p>
          </div>
        ) : (
          <>

            <CustomizableForm
              maxTeammates={event.max_teammates || 0}
              minTeammates={event.min_teammates ?? null}
              separated_genders={event.separated_genders}
              eventId={event.id}
              sport={event.name}
              description={event.description || ""}
              waitlistEnabled={waitlistEnabled}
              capacityIsFull={isFull}
              capacityInfo={capacityInfo}
              onSubmit={() => navigate(`/dday/signup/success/${event.id}`)}
            />
          </>
        )}
      </div>
    </section>
  );
};

export default SignupFormPage;
