import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";

const events = [
  { title: "Dodgeball Tournament", img: "https://res.cloudinary.com/dq9gemegi/image/upload/v1743406551/Posters/CW_Poster_Sponsors_-_9_yrvp46.png", description: "Join our annual basketball tournament and compete for the gold!" },
  { title: "Basketball Tournament", img: "https://res.cloudinary.com/dq9gemegi/image/upload/v1743406525/Posters/CW_Poster_Sponsors_-_7_hy0qpc.png", description: "Show your skills in our exciting football cup." },
  { title: "D-DAY 25", img: "https://res.cloudinary.com/dq9gemegi/image/upload/v1743406686/Posters/DDAY_th6pcx.png", description: "Spike, serve, and block your way to victory." },
  { title: "Table Tennis Open", img: "/assets/event_tabletennis.jpg", description: "Fast-paced action at the table tennis open." },
  { title: "Chess Masters", img: "/assets/event_chess.jpg", description: "Think fast and play smart at our chess masters event." },
  { title: "Swimming Gala", img: "/assets/event_swimming.jpg", description: "Make a splash at the annual swimming gala." },
  { title: "Athletics Day", img: "/assets/event_athletics.jpg", description: "Run, jump, and throw at our athletics day." },
];

const ITEM_WIDTH = 340; // desktop target width

const EventsSection: React.FC = () => {
  const [vw, setVw] = useState<number>(() =>
    typeof window === "undefined" ? 390 : window.innerWidth
  );
  const isMobile = vw < 640;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const autoScrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [vw, emblaApi]);

  const layout = useMemo(() => {
    // Desktop/tablet: your original 87.5vw container.
    // Mobile: full viewport with small gutters, and slide width equals inner width.
    const mobileGutter = 16; // px each side
    const containerWidth = isMobile
      ? Math.max(0, vw - mobileGutter * 2)
      : Math.min(vw * 0.875, vw);

    const gap = isMobile ? 0 : (() => {
      const visible = Math.max(1, Math.floor(containerWidth / ITEM_WIDTH));
      const totalGap = containerWidth - visible * ITEM_WIDTH;
      return visible > 1 ? totalGap / (visible - 1) : 0;
    })();

    // On mobile force one card per view: slide width = containerWidth (minus 1px to avoid rounding)
    const slideW = isMobile ? containerWidth - 1 : ITEM_WIDTH;

    return { containerWidth, gap, slideW, mobileGutter };
  }, [vw, isMobile]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

// Listen to selection changes (enable/disable arrows)
useEffect(() => {
  if (!emblaApi) return;

  const onSelect = () => {
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  };

  emblaApi.on("select", onSelect);
  onSelect();

  // cleanup must return () => void
  return () => {
    // ensure the cleanup returns void, not EventHandlerType
    void emblaApi.off("select", onSelect);
  };
}, [emblaApi]);

// Autoscroll
useEffect(() => {
  if (!emblaApi) return;

  // clear any previous interval
  if (autoScrollInterval.current) {
    clearInterval(autoScrollInterval.current);
    autoScrollInterval.current = null;
  }

  autoScrollInterval.current = setInterval(() => {
    if (emblaApi.canScrollNext()) emblaApi.scrollNext();
    else emblaApi.scrollTo(0);
  }, 10000);

  // cleanup must always be () => void
  return () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };
}, [emblaApi]);


  return (
    <section
      className="w-full flex flex-col items-center py-12 z-10 mt-20"
      style={{
        backgroundImage: "url('/assets/events_background.jpg')",
        backgroundRepeat: "repeat",
        backgroundSize: "auto",
      }}
    >
      <h2
        className="text-4xl font-bold mb-8 text-gray-800 text-center"
        style={{ fontFamily: "'Permanent Marker', cursive" }}
      >
        Events
      </h2>

      <div className="flex justify-center w-full">
        <div
          className="relative flex items-center box-border"
          style={{
            width: isMobile ? "100vw" : `${layout.containerWidth}px`,
            maxWidth: "100vw",
            paddingInline: isMobile ? `${layout.mobileGutter}px` : 0,
          }}
        >
          {/* Left Arrow (hidden on mobile) */}
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            aria-label="Previous"
            className="hidden md:flex absolute left-0 z-30 bg-white border-2 border-black rounded-full shadow-md w-12 h-12 items-center justify-center transition hover:bg-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ transform: "translateX(-60%)" }}
          >
            <span style={{ fontWeight: "bold", color: "black" }}>‹</span>
          </button>

          {/* Embla viewport */}
          <div className="overflow-hidden mx-auto touch-pan-y" ref={emblaRef} style={{ width: "100%" }}>
            <div
              className="flex"
              style={{
                gap: `${layout.gap}px`,
                justifyContent: "flex-start",
              }}
            >
              {events.map((event, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl shadow-lg border-2 border-black flex flex-col"
                  style={{
                    flex: `0 0 ${layout.slideW}px`,
                    width: `${layout.slideW}px`,
                    minWidth: `${layout.slideW}px`,
                    aspectRatio: "1 / 1.414",
                  }}
                >
                  <div
                    className="w-full"
                    style={{
                      aspectRatio: "1 / 1.414",
                      overflow: "hidden",
                      borderTopLeftRadius: "1rem",
                      borderTopRightRadius: "1rem",
                    }}
                  >
                    <img
                      src={event.img}
                      alt={event.title}
                      className="w-full h-full object-cover select-none pointer-events-none"
                      style={{ aspectRatio: "1 / 1.414", display: "block" }}
                      draggable={false}
                    />
                  </div>
                  <div className="p-4 flex flex-col items-center">
                    <h3
                      className="text-2xl font-bold mb-2 text-orange-600 text-center"
                      style={{ fontFamily: "'Lato', sans-serif" }}
                    >
                      {event.title}
                    </h3>
                    <p className="text-gray-700 text-center">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Arrow (hidden on mobile) */}
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            aria-label="Next"
            className="hidden md:flex absolute right-0 z-30 bg-white border-2 border-black rounded-full shadow-md w-12 h-12 items-center justify-center transition hover:bg-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ transform: "translateX(60%)" }}
          >
            <span style={{ fontWeight: "bold", color: "black" }}>›</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
