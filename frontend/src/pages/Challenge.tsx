import React from "react";
import CustomizableForm from "../components/CustomizableForm";

const ChallengePage: React.FC = () => {
  const genderRequirement: "both" | "single" = "both";

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#e3772c] via-orange-200 to-orange-100">
    {/* <div className="max-w-4xl mx-auto px-4 pt-24 pb-12 text-center text-blue-900">
      <p className="text-sm uppercase tracking-[0.4em] text-blue-700 mb-2">
        Challenging Wednesday
      </p>
      <h1
        className="text-4xl md:text-5xl mb-4"
        style={{ fontFamily: "'Permanent Marker', cursive" }}
      >
        Ready for the Challenge?
      </h1>
      <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ fontFamily: "'Lato', sans-serif" }}>
        Sign up below to confirm your participation. Customize the teammate slots and
        gender requirements to match your competition group, then hit submit to send us
        your info.
      </p>
    </div> */}
      <CustomizableForm teammates={3} gender={genderRequirement} />
    </section>
  );
};

export default ChallengePage;

