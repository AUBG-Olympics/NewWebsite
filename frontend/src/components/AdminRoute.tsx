import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getAuthToken, setAuthToken } from "../util/auth";
import AdminLogin from "../pages/Admin/AdminLogin";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      // First, check if token is in URL (from OAuth callback)
      const urlParams = new URLSearchParams(location.search);
      const tokenFromUrl = urlParams.get("token");
      
      if (tokenFromUrl) {
        // Token is in URL, set it in cookie
        setAuthToken(tokenFromUrl);
        // Remove token from URL
        window.history.replaceState({}, "", location.pathname);
        setIsAuthenticated(true);
        return;
      }

      // Check for token in cookie
      const token = getAuthToken();
      setIsAuthenticated(!!token);
    };

    checkAuth();
  }, [location]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-200 flex items-center justify-center">
        <p className="text-blue-900 text-lg">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return <>{children}</>;
};

export default AdminRoute;

