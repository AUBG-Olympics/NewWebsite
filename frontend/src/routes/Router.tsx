import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import SponsorsPage from "../pages/Sponsors";
import TeamPage from "../pages/Team";
import ChallengePage from "../pages/Challenge";
import DDayPage from "../pages/DDayPage";
import SignupFormPage from "../pages/SignupFormPage";
import RegistrationSuccessPage from "../pages/RegistrationSuccessPage";
import AdminPanel from "../pages/Admin/AdminPanel";
import ChallengingWednesday from "../pages/Admin/ChallengingWednesday";
import DDay from "../pages/Admin/DDay";
import SponsorsAdmin from "../pages/Admin/SponsorsAdmin";
import AdminRoute from "../components/AdminRoute";
import NotFound from "../pages/NotFound";
// import About from "../pages/About";
// import Contact from "../pages/Contact";

const Router: React.FC = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/sponsors" element={<SponsorsPage />} />
    <Route path="/team" element={<TeamPage />} />
    <Route path="/challenge" element={<ChallengePage />} />
    <Route path="/dday" element={<DDayPage />} />
    <Route path="/dday/signup/:eventId" element={<SignupFormPage />} />
    <Route
      path="/dday/signup/success/:eventId"
      element={<RegistrationSuccessPage />}
    />
    <Route
      path="/admin"
      element={
        <AdminRoute>
          <AdminPanel />
        </AdminRoute>
      }
    />
    <Route
      path="/admin/challenging-wednesday"
      element={
        <AdminRoute>
          <ChallengingWednesday />
        </AdminRoute>
      }
    />
    <Route
      path="/admin/dday"
      element={
        <AdminRoute>
          <DDay />
        </AdminRoute>
      }
    />
    <Route
      path="/admin/sponsors"
      element={
        <AdminRoute>
          <SponsorsAdmin />
        </AdminRoute>
      }
    />
    {/* 404 catch-all */}
    <Route path="*" element={<NotFound />} />
    {/* <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} /> */}
  </Routes>
);

export default Router;
