import { useState } from "react";
import { projectTitle } from "../deck";
import type { Note } from "../types";

// The projects list — names only, calm. Plus a one-field "+ add project".
export function ProjectsView({
  projects,
  onOpen,
  onAdd,
}: {
  projects: Note[];
  onOpen: (note: Note) => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="projects">
      <h2 className="projects-title">Current Projects</h2>
      <p className="projects-sub">Where each one's at + what's next. Click to open the wall.</p>
      {projects.map((p) => (
        <button key={p.id} className="project-card" onClick={() => onOpen(p)}>
          <h3>{projectTitle(p)}</h3>
          <p>open →</p>
        </button>
      ))}
      <form
        className="add-project"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onAdd(name.trim());
            setName("");
          }
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="+ add a project (just a name)"
        />
      </form>
    </div>
  );
}
