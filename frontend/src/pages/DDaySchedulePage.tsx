import React from "react";
import { useNavigate } from "react-router-dom";

const DDaySchedulePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1
            className="text-5xl md:text-6xl text-blue-900 mb-4"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            SCHEDULE
          </h1>
          <button
            type="button"
            onClick={() => navigate("/dday")}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-900 bg-white px-5 py-2.5 text-blue-900 font-semibold hover:bg-blue-50 transition-colors"
          >
            ← Back to D-Day Events
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="overflow-hidden rounded-xl shadow-lg border-4 border-blue-500 bg-white">
            <img
              src="/assets/SCHEDULE D-DAY - 2.png"
              alt="D-Day schedule 2"
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
          <div className="overflow-hidden rounded-xl shadow-lg border-4 border-blue-500 bg-white">
            <img
              src="/assets/SCHEDULE D-DAY - 3.png"
              alt="D-Day schedule 3"
              className="w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DDaySchedulePage;
