import { useEffect, useRef, useState } from "react";

export type CaptureMode = null | "dump" | "todo";

// Two distinct capture gestures, two destinations:
//   🧠 Brain Dump → a NEW note tagged `capture` (out of your head, into the vault)
//   ✅ Quick To-Do → one appended line on your running-list note
export function CaptureFab({
  mode,
  setMode,
  onDump,
  onTodo,
}: {
  mode: CaptureMode;
  setMode: (m: CaptureMode) => void;
  onDump: (text: string) => void;
  onTodo: (text: string) => void;
}) {
  const [val, setVal] = useState("");
  const [flash, setFlash] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode) ref.current?.focus();
  }, [mode]);

  function submit() {
    const t = val.trim();
    if (!t) return;
    if (mode === "dump") {
      onDump(t);
      setFlash("Dropped to vault");
    } else {
      onTodo(t);
      setFlash("Added to running list");
    }
    setVal("");
    setTimeout(() => setFlash(""), 1600);
  }

  return (
    <>
      {mode && <div className="fab-scrim" onClick={() => setMode(null)} />}
      <div className="fab-wrap">
        {mode && (
          <div className="fab-panel">
            <div className="fab-tabs">
              <button
                className={`fab-tab${mode === "dump" ? " active" : ""}`}
                onClick={() => setMode("dump")}
              >
                🧠 Brain Dump
              </button>
              <button
                className={`fab-tab${mode === "todo" ? " active" : ""}`}
                onClick={() => setMode("todo")}
              >
                ✅ Quick To-Do
              </button>
            </div>
            <textarea
              ref={ref}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || !e.shiftKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={mode === "dump" ? "Get it out of your head…" : "What do you have to do?"}
              rows={mode === "dump" ? 8 : 5}
            />
            <div className="fab-foot">
              <span className="fab-flash">{flash}</span>
              <button className="btn-accent" onClick={submit}>
                {mode === "dump" ? "Drop" : "Add"}
              </button>
            </div>
            <p className="fab-note">
              {mode === "dump"
                ? "Each drop = a new note tagged capture."
                : "Appends to your one running to-do note."}
            </p>
          </div>
        )}
        {!mode && (
          <div className="fab-buttons">
            <button className="fab dump" onClick={() => setMode("dump")} title="Brain Dump">🧠</button>
            <button className="fab todo" onClick={() => setMode("todo")} title="Quick To-Do">＋</button>
          </div>
        )}
      </div>
    </>
  );
}
