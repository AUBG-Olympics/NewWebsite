import React from "react";
import { Link } from "react-router-dom";

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-orange-50 to-orange-100">
      <div className="max-w-xl text-center space-y-4 pb-8">
        <h1 className="text-5xl md:text-6xl font-extrabold text-blue-900">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-semibold text-blue-800">
          Page not found
        </h2>
        <p className="text-blue-700">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-yellow-400 text-blue-900 font-bold uppercase tracking-[0.2em] rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:bg-yellow-300 transition"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

