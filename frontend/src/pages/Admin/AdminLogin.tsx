import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle, getAuthToken } from "../../util/auth";

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already authenticated - if token exists, redirect to admin panel
    const existingToken = getAuthToken();
    if (existingToken) {
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  const handleLogin = () => {
    loginWithGoogle();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-200 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/90 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.2)] p-8 md:p-12 text-center">
        <h1
          className="text-4xl md:text-5xl text-blue-900 mb-4"
          style={{ fontFamily: "'Permanent Marker', cursive" }}
        >
          Admin Login
        </h1>
        <p className="text-blue-700 mb-8" style={{ fontFamily: "'Lato', sans-serif" }}>
          Please sign in with your Google account to access the admin panel.
        </p>
        <button
          onClick={handleLogin}
          className="w-full px-6 py-4 bg-yellow-400 text-blue-900 font-bold uppercase tracking-[0.2em] rounded-2xl border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] hover:bg-yellow-300 transition"
          style={{ fontFamily: "'Lato', sans-serif" }}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;

