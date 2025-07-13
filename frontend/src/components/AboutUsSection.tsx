import React from "react";

const AboutUsSection: React.FC = () => (
  <div
    className="rounded-3xl w-full flex justify-center items-center py-16"
    style={{
      minHeight: "80vh",
    }}
  >
    <div
      className="bg-orange-500 rounded-3xl flex flex-row items-center p-12 shadow-lg mx-auto border-2 border-black"
      style={{
        width: "87.5vw",
        maxWidth: "87.5vw",
        background: "white",
        backgroundBlendMode: "multiply",
      }}
    >
      {/* Left: Crew Photo */}
      <div className="w-1/2 flex justify-center items-center">
        <img
          src="/assets/crew_photo.jpg"
          alt="AUBG Olympics Crew"
          className="w-full aspect-[2/1] object-cover rounded-2xl shadow-md border-2 border-black"
          style={{ fontFamily: "'Lato', sans-serif", maxWidth: "100%" }}
        />
      </div>
      {/* Right: Text Content */}
      <div className="w-1/2 flex flex-col pl-12 relative ">
        <span
          className="uppercase text-sm text-blue-800 tracking-widest mb-3"
          style={{ fontFamily: "'Lato', sans-serif" }}
        >
          ABOUT US
        </span>
        <span
          className="text-5xl text-blue-800 mb-6"
          style={{ fontFamily: "'Permanent Marker', cursive" }}
        >
          AUBG Olympics
        </span>
        <img
          src="/assets/trophy_fireguy.png"
          alt="Trophy Fireguy"
          className="absolute"
          style={{
            height: "95%",
            right: 0,
            top: 0,
            transform: "translateY(-50%)",
          }}
        />
        <p
          className="text-blue-800 text-lg mt-8"
          style={{ fontFamily: "'Lato', sans-serif" }}
        >
          We are the biggest sports club at AUBG, dedicated to promoting athleticism,
          teamwork, and sportsmanship through a variety of exciting events and activities.
          <br />
           <br />
          Every year we organize the largest student sport Olympiad in the country where
          where current and former students, professors, staff, and local residents compete
          in 18 different sports throughout the weekend.
        </p>
      </div>
    </div>
  </div>
);

export default AboutUsSection;
