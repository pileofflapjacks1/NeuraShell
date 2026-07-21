import {
  DEFAULT_PROFILE,
  isShellProfile,
  sanitizeProfile,
  type ShellProfile,
} from "./schema";

const STORAGE_KEY = "neurashell.profile.v1";

export function loadProfile(): ShellProfile {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as unknown;
    if (isShellProfile(parsed)) return sanitizeProfile(parsed);
    return { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: ShellProfile): void {
  if (typeof window === "undefined") return;
  const next = sanitizeProfile(profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function exportProfileJson(profile: ShellProfile): string {
  return JSON.stringify(sanitizeProfile(profile), null, 2);
}

export function importProfileJson(json: string): ShellProfile {
  const parsed = JSON.parse(json) as unknown;
  if (!isShellProfile(parsed) && typeof parsed === "object" && parsed) {
    return sanitizeProfile(parsed as Partial<ShellProfile>);
  }
  if (!isShellProfile(parsed)) {
    throw new Error("Invalid NeuraShell profile JSON");
  }
  return sanitizeProfile(parsed);
}

export function downloadProfile(profile: ShellProfile, filename = "neurashell-profile.json") {
  const blob = new Blob([exportProfileJson(profile)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
