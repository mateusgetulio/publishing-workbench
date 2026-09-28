export type EditorKey = "undo" | "redo" | "move_up" | "move_down" | "remove";

export function editorKey(event: KeyboardEvent): EditorKey | null {
  if (isEditableTarget(event.target)) return null;
  const primary = event.metaKey || event.ctrlKey;
  if (primary && event.key.toLowerCase() === "z") return event.shiftKey ? "redo" : "undo";
  if (event.altKey && event.key === "ArrowUp") return "move_up";
  if (event.altKey && event.key === "ArrowDown") return "move_down";
  if (event.key === "Delete" || event.key === "Backspace") return "remove";
  return null;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  return target.isContentEditable === true;
}
