import type { Note } from "./types";

// Time-blindness anchor: read dated items out of the vault so the deck can SHOW
// what's coming. Read-only — no blocking, no scheduling. We scan each note's
// title + the first slice of its body for the earliest UPCOMING date, so big
// master lists (whose dates are mostly in the past) naturally drop out.

export interface DatedItem {
  id: string;
  label: string;
  date: Date;
  approx: boolean; // "late July" style — show with a ~
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};
const MONTH_RE = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";

// Resolve a year so the date is the next upcoming occurrence (this year, or next
// year if it's already well past).
function resolveYear(month: number, day: number, now: Date, explicit?: number): number {
  if (explicit) return explicit;
  const y = now.getFullYear();
  const candidate = new Date(y, month, day);
  // 3-day grace so "today/yesterday" still count as current.
  if (candidate.getTime() < now.getTime() - 3 * 864e5) return y + 1;
  return y;
}

function findDate(text: string, now: Date): { date: Date; approx: boolean } | null {
  const lower = text.toLowerCase();

  // ISO: 2026-06-25
  let m = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!isNaN(d.getTime())) return { date: d, approx: false };
  }

  // Vague: "late/end of/last week of July", "early August", "mid June"
  m = lower.match(new RegExp(`\\b(late|end of|last week of|early|mid)\\s+${MONTH_RE}`, "i"));
  if (m) {
    const month = MONTHS[m[2].slice(0, 3)];
    if (month !== undefined) {
      const day = /early/.test(m[1]) ? 5 : /mid/.test(m[1]) ? 15 : 25;
      return { date: new Date(resolveYear(month, day, now), month, day), approx: true };
    }
  }

  // Month + day: "June 25", "Jun 25, 2026"
  m = lower.match(new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?`, "i"));
  if (m) {
    const month = MONTHS[m[1].slice(0, 3)];
    const day = Number(m[2]);
    if (month !== undefined && day >= 1 && day <= 31) {
      const year = resolveYear(month, day, now, m[3] ? Number(m[3]) : undefined);
      return { date: new Date(year, month, day), approx: false };
    }
  }

  return null;
}

function labelOf(note: Note): string {
  const h1 = (note.content ?? "").match(/^#[ \t]+(.+?)[ \t]*$/m);
  const base = h1 ? h1[1] : note.title;
  return base
    .replace(/^todo:?\s*/i, "")
    .replace(/\s*[—–-]\s*(june|july|.*\d{4}).*$/i, "")
    .replace(/\*\*/g, "")
    .trim();
}

export function parseUpcoming(notes: Note[], now = new Date(), limit = 6): DatedItem[] {
  const seen = new Set<string>();
  const out: DatedItem[] = [];
  for (const note of notes) {
    if (seen.has(note.id)) continue;
    const window = `${note.title}\n${(note.content ?? "").slice(0, 200)}`;
    const hit = findDate(window, now);
    if (!hit) continue;
    // Only things coming at me — not the deep future, not the past.
    const days = (hit.date.getTime() - now.getTime()) / 864e5;
    if (days < -1 || days > 200) continue;
    seen.add(note.id);
    out.push({ id: note.id, label: labelOf(note), date: hit.date, approx: hit.approx });
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, limit);
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function chipDate(item: DatedItem): string {
  return `${item.approx ? "~" : ""}${MONTH_ABBR[item.date.getMonth()]} ${item.date.getDate()}`;
}

export function todayLabel(now = new Date()): string {
  return `${DAY_ABBR[now.getDay()]}, ${MONTH_ABBR[now.getMonth()]} ${now.getDate()}`;
}

// Days-from-now, for a soft "in 5 days" hint.
export function daysAway(item: DatedItem, now = new Date()): number {
  return Math.round((item.date.getTime() - now.getTime()) / 864e5);
}
