import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import SponsorsPage from "../pages/Sponsors";
import TeamPage from "../pages/Team";
import ChallengePage from "../pages/Challenge";
// import About from "../pages/About";
// import Contact from "../pages/Contact";

const Router: React.FC = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/sponsors" element={<SponsorsPage />} />
    <Route path="/team" element={<TeamPage />} />
    <Route path="/challenge" element={<ChallengePage />} />
    {/* <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} /> */}
  </Routes>
);

export default Router;
