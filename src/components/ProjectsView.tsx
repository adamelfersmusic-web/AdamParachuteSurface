import { projectSubtitle, projectTitle } from "../deck";
import type { Note } from "../types";

// Reference, not tasks. Each card is a status note; click to open the full note
// and pull individual lines onto the deck or into Right Now.
export function ProjectsView({
  projects,
  onOpen,
}: {
  projects: Note[];
  onOpen: (note: Note) => void;
}) {
  return (
    <div className="projects">
      <h2 className="projects-title">Current Projects</h2>
      <p className="projects-sub">Reference, not tasks. Click one to open where you're at.</p>
      {projects.length === 0 && <p className="muted">No status notes yet.</p>}
      {projects.map((p) => (
        <button key={p.id} className="project-card" onClick={() => onOpen(p)}>
          <h3>{projectTitle(p)}</h3>
          <p>{projectSubtitle(p)} &nbsp;·&nbsp; open →</p>
        </button>
      ))}
    </div>
  );
}
