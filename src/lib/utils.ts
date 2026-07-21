export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatConfidence(n: number): string {
  return `${Math.round(Math.max(0, Math.min(1, n)) * 100)}%`;
}
