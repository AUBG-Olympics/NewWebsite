export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000";
const TOKEN_COOKIE_NAME = "auth_token";

export const getAuthToken = (): string | null => {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === TOKEN_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

export const setAuthToken = (token: string): void => {
  // Set cookie with 7 days expiration
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
};

export const removeAuthToken = (): void => {
  document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export const loginWithGoogle = (): void => {
  window.location.href = `${API_BASE_URL}/api/auth/login`;
};

export const handleAuthCallback = async (): Promise<string | null> => {
  try {
    // The backend OAuth callback redirects here after Google auth
    // We need to extract the code and state from URL and exchange for token
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (!code || !state) {
      return null;
    }

    // Call backend callback endpoint to exchange code for token
    const response = await fetch(
      `${API_BASE_URL}/api/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Authentication failed");
    }

    const data = await response.json();
    if (data.access_token) {
      setAuthToken(data.access_token);
      return data.access_token;
    }
  } catch (error) {
    console.error("Auth callback error:", error);
  }

  return null;
};

export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const checkAuth = async (): Promise<boolean> => {
  const token = getAuthToken();
  if (!token) {
    return false;
  }

  try {
    // You might want to add an endpoint to verify token validity
    // For now, we'll just check if token exists
    return true;
  } catch {
    return false;
  }
};

