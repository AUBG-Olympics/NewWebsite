import React from "react";
import LandingSection from "../components/LandingSection";
import AboutUsSection from "../components/AboutUsSection";
//import BoardSection from "../components/BoardSection";
import EventsSection from "../components/EventsSection";
//import DDayLandingSection from "../components/DDayLandingSection";

const Home: React.FC = () => (
  <section style={{ backgroundColor: "#e3772c" }}>
    <LandingSection /> 
   {/* <DDayLandingSection /> */}
    <AboutUsSection />
    <EventsSection />
  </section>
);

export default Home;
