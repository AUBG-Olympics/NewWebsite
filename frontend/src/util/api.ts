/** One API origin for public forms, administration and authentication. */
export function resolveApiBaseUrl(configured: string | undefined, development: boolean): string {
  const explicit = configured?.trim().replace(/\/+$/, "");
  return explicit || (development ? "http://localhost:4000" : "https://api.aubgolympics.com");
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.DEV);
