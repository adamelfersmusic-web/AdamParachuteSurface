import { useEffect, useRef, useState } from "react";

// Its own calm room: one big blank page. No structure, no widgets — just a place
// to think out loud. Saves to the scratchpad note, persists everywhere.
export function ScratchpadView({
  content,
  onSave,
}: {
  content: string;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(content);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) setText(content);
  }, [content]);

  return (
    <div className="scratch-room">
      <div className="scratch-head">
        <h2>Scratchpad</h2>
        <span className="scratch-hint">a blank page — think out loud, it saves itself</span>
      </div>
      <textarea
        className="scratch-page"
        value={text}
        onChange={(e) => { setText(e.target.value); dirty.current = true; }}
        onBlur={() => { dirty.current = false; if (text !== content) onSave(text); }}
        placeholder="Dump, sketch, think… nothing structured. Just a page."
      />
    </div>
  );
}
