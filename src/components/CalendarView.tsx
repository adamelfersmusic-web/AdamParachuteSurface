import { useState } from "react";
import type { DatedItem } from "../dates";

// A simple month grid to fight time-blindness. Each day holds a short sticky
// note you write yourself; your already-dated vault items are overlaid faintly.
// No sync, no time-blocking — just "what's coming," at a glance.
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function key(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CalendarView({
  days,
  events,
  onSetDay,
}: {
  days: Record<string, string>;
  events: DatedItem[];
  onSetDay: (date: string, text: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const eventsByDate: Record<string, string[]> = {};
  for (const e of events) {
    const k = key(e.date.getFullYear(), e.date.getMonth(), e.date.getDate());
    (eventsByDate[k] ||= []).push(e.label);
  }

  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  function step(delta: number) {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y); setSelected(null);
  }
  function openDay(d: number) {
    const k = key(year, month, d);
    setSelected(k);
    setDraft(days[k] ?? "");
  }

  const todayKey = key(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => step(-1)} aria-label="Previous month">‹</button>
        <h2>{MONTHS[month]} {year}</h2>
        <button className="cal-nav" onClick={() => step(1)} aria-label="Next month">›</button>
      </div>

      <div className="cal-grid">
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="cal-cell empty" />;
          const k = key(year, month, d);
          const sticky = days[k];
          const evs = eventsByDate[k] || [];
          return (
            <button
              key={i}
              className={`cal-cell${k === todayKey ? " today" : ""}${k === selected ? " sel" : ""}`}
              onClick={() => openDay(d)}
            >
              <span className="cal-num">{d}</span>
              {evs.map((e, j) => <span key={j} className="cal-ev" title={e}>{e}</span>)}
              {sticky && <span className="cal-sticky" title={sticky}>{sticky}</span>}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="cal-editor">
          <div className="cal-editor-label">{selected}</div>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onSetDay(selected, draft)}
            placeholder="e.g. Jonathan call · Amanda fundraiser closes · flight to Denver…"
          />
          <div className="cal-editor-hint">Saves when you click away. Clear it to remove the note.</div>
        </div>
      )}
    </div>
  );
}
