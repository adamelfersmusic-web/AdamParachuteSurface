import { chipDate, daysAway, todayLabel, type DatedItem } from "../dates";

// Read-only time anchor. The leading chip is just today's date — for time
// blindness, knowing what day it is matters as much as what's coming. The rest
// are upcoming dated items the vault already knows about. It only shows.
export function TimeStrip({ events }: { events: DatedItem[] }) {
  return (
    <div className="time-strip" aria-label="What's coming">
      <span className="time-today">{todayLabel()}</span>
      {events.length === 0 ? (
        <span className="time-empty">nothing dated coming up</span>
      ) : (
        events.map((e) => {
          const d = daysAway(e);
          return (
            <span key={e.id} className="time-chip" title={e.label}>
              <span className="time-date">{chipDate(e)}</span>
              <span className="time-label">{e.label}</span>
              <span className="time-away">{d <= 0 ? "now" : d === 1 ? "1 day" : `${d} days`}</span>
            </span>
          );
        })
      )}
    </div>
  );
}
