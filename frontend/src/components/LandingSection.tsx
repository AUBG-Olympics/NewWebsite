import React from "react";

const LandingSection: React.FC = () => (
  <div className="relative min-h-[100vh]">
    {/* Pattern background - sits behind */}
    <div
      className="absolute inset-0 pattern-triangles pattern-red-500 pattern-size-1 z-10 pattern-opacity-40"
      style={{ height: "100%", width: "100%" }}
    />

    {/* Main content - sits in front */}
    <div
      className="
        h-[100vh] shadow-lg flex flex-col items-center justify-center border-8 border-white relative z-10 rounded-b-3xl
        bg-[url('/assets/background6.png')] bg-no-repeat
        bg-[length:150%] md:bg-cover
        bg-[position:90%_center] md:bg-center
      "
    >
      <div className="flex flex-col items-start justify-center w-full h-full pl-10 md:pl-12">
        {/* Speech bubble background for the text */}
        <div
          className="
            flex flex-col items-center justify-center text-center mb-0
            w-[320px] min-h-[90px]
            md:w-[370px] md:min-h-[250px]
            box-border
            pt-[2rem] pr-[1rem] pb-[2.5rem] pl-[1rem]
            md:pt-[2.5rem] md:pr-[1.5rem] md:pb-[6.5rem] md:pl-[1.5rem]
            bg-no-repeat bg-center bg-contain
          "
          style={{
            fontFamily: "'Lato', sans-serif",
            backgroundImage: "url('/assets/speech_bubble.png')",
          }}
        >
          <span className="text-black text-xl md:text-2xl lg:text-3xl xl:text-4xl">
            Welcome to
          </span>
          <span
            className="text-yellow-500 font-extrabold text-xl md:text-3xl lg:text-4xl xl:text-5xl drop-shadow-md my-2 md:my-3"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            AUBG Olympics
          </span>
        </div>

        {/* Fireguy below, left-aligned */}
        <img
          src="/assets/waving_fireguy.png"
          alt="Waving Fireguy"
          className="w-[220px] md:w-[320px] lg:w-[300px] h-auto max-w-[500px]"
        />
      </div>
    </div>
  </div>
);

export default LandingSection;
