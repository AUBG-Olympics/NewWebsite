import React, { useEffect, useMemo, useState } from "react";
import CloudinaryImg from "../../lib/CloudinaryImg";
import { API_BASE_URL } from "../util/auth";

type Sponsor = {
  id?: number;
  name: string;
  logo: string;
};

type Tier = {
  id: string;
  label: string;
  sponsors: Sponsor[];
};

const SponsorCarousel: React.FC = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/sponsor-tiers/with-sponsors`);
        if (!res.ok) return;
        const data = (await res.json()) as Tier[];
        setTiers(Array.isArray(data) ? data : []);
      } catch {
        // keep carousel hidden on load failure
      }
    };
    load();
  }, []);

  const logos = useMemo(() => {
    return tiers
      .filter((tier) => tier.label.trim().toLowerCase() !== "volume 1")
      .flatMap((tier) => tier.sponsors)
      .filter((sponsor) => Boolean(sponsor.logo))
      .map((sponsor, index) => ({
        id: sponsor.id ?? index,
        src: sponsor.logo,
        alt: sponsor.name,
      }));
  }, [tiers]);

  if (logos.length === 0) return null;

  // Duplicate list for seamless marquee loop.
  const marqueeItems = [...logos, ...logos];

  return (
    <div className="w-full rounded-2xl border-2 border-blue-900/40 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 shadow-[0_8px_24px_rgba(0,0,0,0.25)] overflow-hidden">
      <div className="sponsor-marquee-track flex items-center gap-10 py-4 px-4">
        {marqueeItems.map((logo, idx) => (
          <div
            key={`${logo.id}-${idx}`}
            className="h-12 w-28 shrink-0 rounded-lg bg-white/60 ring-1 ring-white/15 backdrop-blur-[1px] flex items-center justify-center"
          >
            <CloudinaryImg
              src={logo.src}
              alt={logo.alt}
              className="h-9 w-auto object-contain opacity-95"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SponsorCarousel;

