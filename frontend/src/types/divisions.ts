export interface Division {
  id: number;
  name: string;
  min_teammates: number;
  max_teammates: number;
  max_participants: number | null;
  waitlist_max_participants: number;
}

export interface DivisionCapacity {
  id: number;
  name: string;
  current_participants: number;
  full: boolean;
  waitlist: boolean;
  closed: boolean;
}

export type DivisionDraft = Omit<Division, "id"> & { id?: number; clientKey: string };

export const newDivision = (): DivisionDraft => ({
  clientKey: crypto.randomUUID(), name: "", min_teammates: 0, max_teammates: 0,
  max_participants: null, waitlist_max_participants: 0,
});

export function eventDivisionDrafts(data: { divisions?: Division[] } | null): DivisionDraft[] {
  if (!Array.isArray(data?.divisions)) {
    throw new Error("The connected backend does not support divisions. Restart the updated backend and reload this page.");
  }
  return data.divisions.length
    ? data.divisions.map((division) => ({ ...division, clientKey: String(division.id) }))
    : [{ ...newDivision(), name: "Open" }];
}

export function apiError(data: { detail?: unknown }, fallback: string): string {
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((error: { msg?: string }) => error.msg || fallback).join("; ");
  }
  return fallback;
}
