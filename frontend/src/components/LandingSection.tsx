import React from "react";

const LandingSection: React.FC = () => (
  <div className="relative min-h-[100vh]">
    {/* Pattern background - sits behind */}
    <div
      className="absolute inset-0 pattern-triangles pattern-red-500 pattern-size-1 z-10 pattern-opacity-40"
      style={{
        height: "100%",
        width: "100%",
      }}
    ></div>

    {/* Main content - sits in front */}
    <div
      className="h-[100vh] shadow-lg flex flex-col items-center justify-center border-8 border-white relative z-10 rounded-b-3xl"
      style={{
        backgroundImage: "url('/assets/background6.png')",
        backgroundSize: "150%",
        [window.innerWidth >= 768 && "backgroundSize"]: "cover",
        backgroundPosition: "90% center",
        [window.innerWidth >= 768 && "backgroundPosition"]: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex flex-col items-start justify-center w-full h-full pl-10 md:pl-12">
        {/* Speech bubble background for the text */}
        <div
          className={`
            flex flex-col items-center justify-center text-center
            w-[320px] min-h-[90px] 
            md:w-[370px] md:min-h-[250px]
            mt-14
          `}
          style={{
            fontFamily: "'Lato', sans-serif",
            backgroundImage: "url('/assets/speech_bubble.png')",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            padding: "2rem 1rem 2.5rem 1rem", // Less padding on mobile
            [window.innerWidth >= 768 && "padding"]:
              "2.5rem 1.5rem 6.5rem 1.5rem", // Use original padding for md+
            boxSizing: "border-box",
          }}
        >
          <span className="text-black text-xl md:text-2xl lg:text-3xl xl:text-4xl">
            Welcome to
          </span>
          <span
            className="text-yellow-500 font-extrabold text-xl md:text-3xl lg:text-4xl xl:text-5xl drop-shadow-md mt-1 md:mt-2"
            style={{ fontFamily: "'Permanent Marker', cursive" }}
          >
            AUBG Olympics
          </span>
        </div>

        {/* Fireguy below, left-aligned */}
        <img
          src="/assets/waving_fireguy.png"
          alt="Waving Fireguy"
          className="w-[220px] md:w-[320px] lg:w-[350px] h-auto mt-[-5px] md:mt-[-60px]"
          style={{ maxWidth: 500 }}
        />
      </div>
    </div>
  </div>
);

export default LandingSection;
