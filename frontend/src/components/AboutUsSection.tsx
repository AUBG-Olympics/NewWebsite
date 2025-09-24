import React from "react";

const AboutUsSection: React.FC = () => (
  <div
    className="rounded-3xl w-full flex justify-center items-center py-10 md:py-16"
    style={{
      minHeight: "80vh",
    }}
  >
    <div
      className="
        bg-orange-500 rounded-3xl flex flex-col md:flex-row items-center
        p-4 md:p-12 shadow-lg mx-auto border-2 border-black
      "
      style={{
        width: "95vw",
        maxWidth: "87.5vw",
        background: "white",
        backgroundBlendMode: "multiply",
      }}
    >
      {/* Left: Crew Photo */}
      <div className="w-full md:w-1/2 flex justify-center items-center mb-6 md:mb-0">
        <img
          src="/assets/crew_photo.jpg"
          alt="AUBG Olympics Crew"
          className="w-full aspect-[2/1] object-cover rounded-2xl shadow-md border-2 border-black max-w-[450px] md:max-w-full"
          style={{ fontFamily: "'Lato', sans-serif" }}
        />
      </div>
      {/* Right: Text Content */}
      <div className="w-full md:w-1/2 flex flex-col md:pl-12 relative">
        <span
          className="uppercase text-xs md:text-sm text-blue-800 tracking-widest mb-2 md:mb-3"
          style={{ fontFamily: "'Lato', sans-serif" }}
        >
          ABOUT US
        </span>
        <span
          className="text-3xl md:text-5xl text-blue-800 mb-4 md:mb-6"
          style={{ fontFamily: "'Permanent Marker', cursive" }}
        >
          AUBG Olympics
        </span>
        {/* Trophy fireguy only shows on desktop to preserve layout */}
        <img
          src="/assets/trophy_fireguy.png"
          alt="Trophy Fireguy"
          className="absolute hidden md:block"
          style={{
            height: "70%",
            right: 0,
            top: 10,
            transform: "translateY(-50%)",
          }}
        />
        <p
          className="text-blue-800 text-base md:text-lg mt-6 md:mt-8"
          style={{ fontFamily: "'Lato', sans-serif" }}
        >
          We are the biggest sports club at AUBG, dedicated to promoting athleticism,
          teamwork, and sportsmanship through a variety of exciting events and activities.
          <br />
          <br />
          Every year we organize the largest student sport Olympiad in the country where
          current and former students, professors, staff, and local residents compete
          in 18 different sports throughout the weekend.
        </p>
      </div>
    </div>
  </div>
);

export default AboutUsSection;
