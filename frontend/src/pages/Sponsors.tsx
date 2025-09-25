import React from "react";
import sponsors from "../data/sponsors.json";
import CloudinaryImg from "../../lib/CloudinaryImg"; // ensure .tsx component path

const SectionHeading: React.FC<{
  title: string;
  blurb?: string;
  color?: string;
}> = ({ title, blurb, color = "#ea580c" }) => (
  <div className="text-center mb-6">
    <h2
      className="text-2xl md:text-4xl font-extrabold tracking-tight"
      style={{ color }}
    >
      {title}
    </h2>
    {blurb ? (
      <p className="mt-2 text-yellow-300/90 text-sm md:text-base">{blurb}</p>
    ) : null}
  </div>
);

type Sponsor = {
  name: string;
  url: string;
  logo: string;
  invertOnDark?: boolean;
};
type Tier = {
  id: string;
  label: string;
  blurb?: string;
  columns?: number;
  logoMaxWidth?: number;
  sponsors: Sponsor[];
};

const gridCols = (n?: number) =>
  ({
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
    7: "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7",
  }[(n ?? 5) as 3 | 4 | 5 | 6 | 7] ||
  "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5");

const SponsorsPage: React.FC = () => {
  const tiers = sponsors as Tier[];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-500 via-orange-400 to-black overflow-hidden">
      {/* BACKGROUND IMAGES */}
      <div className="absolute inset-0 flex flex-col gap-12 opacity-60">
        {[
          "/assets/whiteImage.JPG",
          "/assets/orangeImage.JPG",
          "/assets/blackImage.jpg",
        ].map((src, i) => (
          <div key={i} className="relative flex-1">
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
              }}
            />
          </div>
        ))}
      </div>

      {/* DARK OVERLAY */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      {/* HERO */}
      <section className="relative z-10">
        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-12 md:pt-24 md:pb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-500 text-center drop-shadow">
            OUR SPONSORS
          </h1>
        </div>
      </section>

      {/* TIERS */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        {tiers.map((tier) => (
          <section key={tier.id} id={tier.id} className="mt-10 md:mt-14">
            {/* use SectionHeading */}
            <SectionHeading
              title={tier.label}
              blurb={tier.blurb}
              color="#ea580c"
            />

            {/* use gridCols(...) */}
            <div
              className={`grid ${gridCols(
                tier.columns
              )} gap-6 md:gap-8 place-items-center`}
            >
              {tier.sponsors.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block w-full"
                  aria-label={`Visit ${s.name}`}
                >
                  <div className="flex items-center justify-center bg-white/20 hover:bg-white/10 transition rounded-xl p-5 md:p-6 ring-1 ring-white/10 hover:ring-white/20">
                    <CloudinaryImg
                      src={s.logo}
                      alt={s.name}
                      width={tier.logoMaxWidth ?? 200}
                      className={`object-contain max-h-14 md:max-h-16 ${
                        s.invertOnDark ? "brightness-0 invert" : ""
                      }`}
                    />
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
        {/* CTA (kept as-is; uses react-router Link) */}
        {/* CTA */}{" "}
        <section className="mt-16 md:mt-24">
          {" "}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#121525] to-[#0c0f1d] p-6 md:p-10 text-white">
            {" "}
            <h3 className="text-xl md:text-2xl font-bold tracking-tight">
              {" "}
              Want to join the club?{" "}
            </h3>{" "}
            <p className="mt-3 text-sm md:text-base text-white/80 max-w-3xl">
              {" "}
              Thanks to our supporters, we can keep the energy high all season.
              In return, we’re proud to offer ongoing recognition and
              experiential benefits. Get in touch to learn more about becoming a
              supporter!{" "}
            </p>{" "}
            <div className="mt-6">
              {" "}
              <a
                href="mailto:aubgolympicscommittee@gmail.com"
                className="inline-flex items-center justify-center rounded-xl border border-red-400/60 bg-transparent px-5 py-3 text-red-300 hover:text-white hover:bg-red-500/20 hover:border-red-400 transition font-semibold tracking-wide"
              >
                {" "}
                Contact Us{" "}
              </a>{" "}
            </div>{" "}
          </div>{" "}
        </section>
      </main>
    </div>
  );
};

export default SponsorsPage;
