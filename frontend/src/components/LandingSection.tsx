import React from "react";
const LandingSection: React.FC = () => (
  <div>
    <div
      className="h-[calc(100vh)] bg-orange-500  shadow-lg flex flex-col items-center justify-center border-8  border-white 
      
      "
      style={{
        backgroundImage: "url('/assets/background4.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
 
      {/* <div className="flex flex-row justify-center items-start h-[40rem] bg mt-0 ">
        <img className="h-full relative top-10" src="/assets/waving_fireguy.png" alt="Waving Fireguy" />
        <div className="relative -ml-6 -mt-8" style={{ width: 430, height: 320 }}>
          <img
            src="/assets/speech_bubble.png"
            alt="Speech Bubble"
            className="absolute -top-2 left-0 w-full h-full"
            style={{ transform: "rotate(15deg)" }}
          />
          <p
            className="absolute -top-6 left-3 w-full h-full flex flex-col items-center justify-center text-xl px-8 py-6 text-gray-800 font-semibold text-center"
            style={{ fontFamily: "'Lato', sans-serif" }}
          >
            Hello, and welcome to{" "}
            <span
              className="text-yellow-500 font-extrabold text-4xl drop-shadow-md my-2"
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              AUBG Olympics
            </span>
            the biggest sports club at AUBG
          </p>
        </div>
      </div> */}
    </div>
         <div className="h-[calc(100vh)] absolute x-0 y-0 pattern-triangles pattern-red-500 
  pattern-size-1">

      </div>
      </div>
    
);

export default LandingSection;
