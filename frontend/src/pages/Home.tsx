import React from "react";
import LandingSection from "../components/LandingSection";
import AboutUsSection from "../components/AboutUsSection";
//import BoardSection from "../components/BoardSection";
import EventsSection from "../components/EventsSection";

const Home: React.FC = () => (
  <section style={{ backgroundColor: "#e3772c" }}>
   <LandingSection/>
   <AboutUsSection/>
  
   <EventsSection/>
  </section>
);

export default Home;
