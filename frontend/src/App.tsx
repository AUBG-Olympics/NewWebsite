import React from "react";
import { BrowserRouter } from "react-router-dom";
import Router from "./routes/Router";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const App: React.FC = () => (
  <BrowserRouter>
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 w-full">
        <Router />
      </main>
      <Footer />
    </div>
  </BrowserRouter>
);

export default App;
