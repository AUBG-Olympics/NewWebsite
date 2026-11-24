import React from "react";
import { useNavigate } from "react-router-dom";
import FlameButton from "./DDayButton";
import { useDDayEnabled } from "../hooks/useDDayEnabled";

// Put your uploaded image in frontend/public/assets and keep this path.
const HERO_IMAGE = "/assets/dday-landing.png";

const DDayLandingSection: React.FC = () => {
  const navigate = useNavigate();
  const { isEnabled: isDDayEnabled } = useDDayEnabled();

  return (
    <section className="relative min-h-[90vh] overflow-hidden shadow-lg">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${HERO_IMAGE}")` }}
      />

      {/* subtle overlay for readability while keeping artwork visible */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

      <div className="relative z-10 min-h-[85vh] px-6 md:px-12">
        {/* Mobile layout: D-DAY, 26', BUTTON, 18-19, APRIL */}
        <div className="absolute inset-0 z-10 flex md:hidden flex-col items-center justify-center text-center gap-6">
          <div
            className="text-5xl text-orange-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] leading-none"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            D-DAY
          </div>
          <div
            className="text-4xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] leading-none"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            26'
          </div>

          {isDDayEnabled && (
            <FlameButton
              type="button"
              animationPath="/assets/fire.json"
              onClick={() => navigate("/dday")}
              className="text-base px-8 py-3 mt-2 mb-2"
              flameScale={5}
              flameTranslateY={-200}
              hoverOnly={false}
              label="SIGN UP"
            />
          )}

          <div
            className="text-5xl text-orange-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] leading-none"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            18 - 19
          </div>
          <div
            className="text-4xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] leading-none"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            APRIL
          </div>
        </div>

        {/* Desktop left / right headline blocks */}
        <div className="hidden md:flex absolute mx-14 left-6 right-6 top-1/2 -translate-y-1/2 items-center justify-between">
          <div className="text-center leading-none">
            <div
              className="text-5xl md:text-7xl text-orange-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              D-DAY
            </div>
            <div
              className="mt-2 text-4xl md:text-6xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              26'
            </div>
          </div>

          <div className="text-center leading-none">
            <div
              className="text-5xl md:text-7xl text-orange-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              18 - 19
            </div>
            <div
              className="mt-2 text-4xl md:text-6xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              APRIL
            </div>
          </div>
        </div>

        {/* Desktop center button */}
        <div className="hidden md:flex absolute inset-0 items-center justify-center">
          {isDDayEnabled && (
            <FlameButton
              type="button"
              animationPath="/assets/fire.json"
              onClick={() => navigate("/dday")}
              className="text-base md:text-lg px-8 py-3"
              flameScale={5}
              flameTranslateY={-200}
              label="SIGN UP"
              hoverOnly={false}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default DDayLandingSection;

