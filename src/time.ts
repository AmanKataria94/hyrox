/** 3725 -> "1:02:05", 105 -> "1:45" */
export function fmt(sec: number | undefined, withHours = false): string {
  if (sec === undefined || !isFinite(sec)) return '–';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h || withHours ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

export function fmtDelta(sec: number): string {
  const sign = sec < 0 ? '−' : '+';
  return `${sign}${fmt(Math.abs(sec))}`;
}

/**
 * Accepts "1:45", "1.45", "145" (=1:45), "45", "1:02:05".
 * Bare digits: last two are seconds — easy to type on a phone number pad.
 */
export function parseTime(input: string): number | undefined {
  const t = input.trim();
  if (!t) return undefined;
  const parts = t.split(/[:.]/).map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return undefined;
  if (parts.length === 1) {
    const n = parts[0];
    if (n.length <= 2) return Number(n);
    return Number(n.slice(0, -2)) * 60 + Number(n.slice(-2));
  }
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
