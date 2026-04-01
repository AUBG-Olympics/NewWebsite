import React from "react";

const DEMO_LOGO = "/assets/react.svg";

const SponsorCarousel: React.FC = () => {
  const logos = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    src: DEMO_LOGO,
    alt: `Sponsor ${i + 1}`,
  }));

  // Duplicate list for seamless marquee loop.
  const marqueeItems = [...logos, ...logos];

  return (
    <div className="w-full rounded-2xl border-2 border-blue-900/40 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 shadow-[0_8px_24px_rgba(0,0,0,0.25)] overflow-hidden">
      <div className="sponsor-marquee-track flex items-center gap-10 py-4 px-4">
        {marqueeItems.map((logo, idx) => (
          <div
            key={`${logo.id}-${idx}`}
            className="h-12 w-28 shrink-0 rounded-lg bg-white/10 ring-1 ring-white/15 backdrop-blur-[1px] flex items-center justify-center"
          >
            <img
              src={logo.src}
              alt={logo.alt}
              className="h-9 w-auto object-contain opacity-95"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SponsorCarousel;

