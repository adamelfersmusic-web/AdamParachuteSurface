import { Markdown } from "../markdown";
import type { ParsedStatus } from "../status";

// One project status card. Collapsed, it answers "what's my next move?" — a big
// NEXT ACTION (priority #1), the rest of this week's priorities, and the open
// loops. Click anywhere to expand the full status note as rendered markdown.
export function ProjectCard({
  status,
  expanded,
  onToggle,
}: {
  status: ParsedStatus;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { projectName, priorities, openLoops } = status;
  const nextAction = priorities[0];
  const rest = priorities.slice(1);

  return (
    <article className={`project-card${expanded ? " expanded" : ""}`}>
      <div
        className="card-head"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <h2 className="card-project">{projectName}</h2>
        <span className="card-chevron" aria-hidden>{expanded ? "Close" : "Open"}</span>
      </div>

      {expanded ? (
        <div className="card-full">
          <Markdown content={status.note.content ?? ""} onNavigate={() => {}} />
        </div>
      ) : (
        <div className="card-summary" onClick={onToggle}>
          <div className="next-action">
            <div className="next-label">Next action</div>
            <div className="next-text">{nextAction ?? "No priority set this week."}</div>
          </div>

          {rest.length > 0 && (
            <div className="then">
              <div className="section-label">Then</div>
              <ol className="then-list">
                {rest.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </div>
          )}

          {openLoops.length > 0 && (
            <div className="loops">
              <div className="section-label">Open loops</div>
              <ul className="loop-list">
                {openLoops.map((loop, i) => (
                  <li key={i} className={loop.done ? "done" : ""}>
                    <span className="loop-mark" aria-hidden>{loop.done ? "●" : "○"}</span>
                    <span className="loop-text">{loop.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
