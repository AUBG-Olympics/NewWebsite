import React, { useEffect, useState } from "react";
import CustomizableForm from "../components/CustomizableForm";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface Event {
  id: number;
  name: string;
  description?: string;
  date?: string;
  is_current: boolean;
  separated_genders?: boolean;
  max_teammates?: number;
  min_teammates?: number | null;
  max_participants?: number | null;
  enable_waitlist?: boolean;
  waitlist?: boolean;
  waitlist_max_participants?: number | null;
}

const ChallengePage: React.FC = () => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFull, setIsFull] = useState(false);
  const [capacityInfo, setCapacityInfo] = useState<any | null>(null);

  useEffect(() => {
    const fetchCurrentEvent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/events/`);
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const events: Event[] = await response.json();
        const currentEvent = events.find((e) => e.is_current);

        if (!currentEvent) {
          setError("No active event found. Please check back later.");
          return;
        }

        setEvent(currentEvent);

        // Always check capacity when page is opened (before showing form)
        try {
          const sportParam = encodeURIComponent(currentEvent.name);
          const capRes = await fetch(
            `${API_BASE_URL}/api/forms/capacity/${currentEvent.id}?sport=${sportParam}`,
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
        console.error("Error fetching current event:", err);
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentEvent();
  }, []);


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
        <div className="text-center text-blue-900">
          <p className="text-lg mb-2">
            {error || "No event found. Please contact an administrator."}
          </p>
        </div>
      </section>
    );
  }

  const isWaitlist = Boolean(capacityInfo?.waitlist);
  const waitlistEnabled = Boolean(
    (capacityInfo?.waitlist_max_participants ?? 0) > 0,
  );

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100">
      {isFull && !isWaitlist ? (
        <div className="w-full flex justify-center py-16 px-4">
          <div className="max-w-3xl w-full bg-white/90 border-4 border-red-500 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-red-600 mb-4">
              The cap has already been filled
            </h2>
            <p className="text-blue-900">
              Registration for this event is no longer available.
            </p>
          </div>
        </div>
      ) : (
        <>
          {isWaitlist ? (
            <div className="w-full flex justify-center pt-10 px-4">
              <div className="max-w-3xl w-full bg-white/90 border-4 border-orange-500 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-6 md:p-8 text-center">
                <h2 className="text-xl md:text-2xl font-bold text-orange-700 mb-2">
                  Cap filled — you are signing up for the waitlist
                </h2>
                <p className="text-blue-900">
                  Please submit the form below to join the waitlist.
                </p>
              </div>
            </div>
          ) : null}
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
          />
        </>
      )}
    </section>
  );
};

export default ChallengePage;

