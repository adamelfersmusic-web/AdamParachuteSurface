import type { Note } from "./types";

// The two status notes share a markdown skeleton (## Where We're At, ##
// What's Promised, ## This Week's Priorities, ## Open Loops, a plan section, ##
// Key Links). This module pulls the few pieces the project card needs out of the
// raw markdown so the card can render without re-parsing in the component.

export interface OpenLoop {
  text: string;
  done: boolean;
}

export interface ParsedStatus {
  note: Note;
  /** From the # H1, trimmed before an em/en dash — e.g. "Amanda Bridges". */
  projectName: string;
  /** "This Week's Priorities", numbered list, in order, cleaned to plain text. */
  priorities: string[];
  /** "Open Loops" checkbox list. */
  openLoops: OpenLoop[];
}

// Pull the first level-1 heading ("# ...", not "## ...").
function firstH1(content: string): string | null {
  const m = content.match(/^#[ \t]+(.+?)[ \t]*$/m);
  return m ? m[1].trim() : null;
}

// Project name = H1 trimmed before the first dash separator. The notes use an
// em dash ("Amanda Bridges — Status"); en dash and " - " are tolerated too.
export function projectNameFromTitle(h1: string): string {
  const head = h1.split(/\s+[—–]\s+|\s+-\s+/)[0];
  return head.trim();
}

// Slice out the body of a "## <heading>" section: everything until the next
// "## " heading or end of note. Heading match is case-insensitive and tolerant
// of a trailing colon. Returns "" if the section isn't present.
function section(content: string, heading: string): string {
  const lines = content.split(/\r?\n/);
  const target = heading.toLowerCase();
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##[ \t]+(.+?)[ \t]*:?[ \t]*$/);
    if (m && m[1].trim().toLowerCase() === target) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return "";
  const out: string[] = [];
  for (let i = start; i < lines.length; i++) {
    if (/^##[ \t]+/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join("\n");
}

// Strip the light inline markdown / status glyphs we don't want shouting from a
// card: bold/italic/code markers, leading list checkmarks, and "← note" asides.
function cleanInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // code
    .replace(/^[\s✅✔️☑️✓🔴🟡🟢⚠️•]+/, "") // leading glyphs/checkmarks
    .replace(/\s+←.*$/, "") // trailing "← most urgent" asides
    .replace(/\s+/g, " ")
    .trim();
}

// Numbered list ("1. ...") under This Week's Priorities, in order.
function priorities(content: string): string[] {
  const body = section(content, "This Week's Priorities");
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^[ \t]*\d+[.)][ \t]+(.+)$/);
    if (m) {
      const text = cleanInline(m[1]);
      if (text) out.push(text);
    }
  }
  return out;
}

// Checkbox list ("- [ ] ..." / "- [x] ...") under Open Loops.
function openLoops(content: string): OpenLoop[] {
  const body = section(content, "Open Loops");
  const out: OpenLoop[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^[ \t]*[-*][ \t]+\[([ xX])\][ \t]+(.+)$/);
    if (m) {
      const text = cleanInline(m[2]);
      if (text) out.push({ text, done: m[1].toLowerCase() === "x" });
    }
  }
  return out;
}

export function parseStatus(note: Note): ParsedStatus {
  const content = note.content ?? "";
  const h1 = firstH1(content);
  const projectName = h1 ? projectNameFromTitle(h1) : note.title;
  return {
    note,
    projectName,
    priorities: priorities(content),
    openLoops: openLoops(content),
  };
}
