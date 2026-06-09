import { useEffect, useRef, useState } from "react";

// The "Active Projects (next 2 weeks)" box: one free-text note you type into.
// It autosaves to the vault when you click away (on blur), so there's no save
// button to remember. While you're typing, we never yank the text out from
// under you — incoming reloads only sync in when the field isn't focused.
export function ProjectsNote({
  content,
  saving,
  onSave,
  className,
}: {
  content: string;
  saving: boolean;
  onSave: (text: string) => void;
  className?: string;
}) {
  const [text, setText] = useState(content);
  const [dirty, setDirty] = useState(false);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current && !dirty) setText(content);
  }, [content, dirty]);

  function commit() {
    focused.current = false;
    if (text !== content) onSave(text);
    setDirty(false);
  }

  return (
    <div className={`projects-note${className ? " " + className : ""}`}>
      <div className="projects-head">
        <span className="projects-title">Active Projects · next 2 weeks</span>
        <span className="projects-status">
          {saving ? "Saving…" : dirty ? "Unsaved — click away to save" : "Saved"}
        </span>
      </div>
      <textarea
        className="projects-textarea"
        value={text}
        spellCheck
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        onBlur={commit}
        placeholder="What's active right now? Type freely…"
      />
    </div>
  );
}
