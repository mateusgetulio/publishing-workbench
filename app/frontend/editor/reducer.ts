import type { Command } from "./commands";
import { apply } from "./commands";
import type { Document } from "./document";
import { documentsEqual, findBlockIndex } from "./document";

export type SaveStatus = "saved" | "dirty" | "saving" | "save_failed" | "conflict";

export interface Issue {
  block_id: string | null;
  field: string | null;
  message: string;
}

export interface HistoryEntry {
  command: Command;
  inverse: Command;
}

export interface EditorState {
  document: Document;
  serverRevision: number;
  saveStatus: SaveStatus;
  pendingSave: boolean;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  publishIssues: Issue[];
  selectedBlockId: string | null;
  conflictRevision: number | null;
}

export type EditorAction =
  | { type: "loaded"; document: Document; revision: number; publishIssues: Issue[] }
  | { type: "command"; command: Command }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "select"; id: string | null }
  | { type: "save_started" }
  | { type: "save_succeeded"; revision: number; savedDocument: Document }
  | { type: "save_failed" }
  | { type: "conflict"; revision: number }
  | { type: "publish_issues"; issues: Issue[] };

export function initialState(
  document: Document,
  revision: number,
  publishIssues: Issue[] = [],
): EditorState {
  return {
    document,
    serverRevision: revision,
    saveStatus: "saved",
    pendingSave: false,
    undoStack: [],
    redoStack: [],
    publishIssues,
    selectedBlockId: null,
    conflictRevision: null,
  };
}

export function reduce(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "loaded":
      return initialState(action.document, action.revision, action.publishIssues);
    case "command": {
      const applied = apply(state.document, action.command);
      return edited(state, applied, {
        undoStack: [...state.undoStack, { command: action.command, inverse: applied.inverse }],
        redoStack: [],
      });
    }
    case "undo":
      return undo(state);
    case "redo":
      return redo(state);
    case "select":
      return { ...state, selectedBlockId: action.id };
    case "save_started":
      return canStartSave(state) ? { ...state, saveStatus: "saving", pendingSave: false } : state;
    case "save_succeeded":
      return saveSucceeded(state, action.revision, action.savedDocument);
    case "save_failed":
      return { ...state, saveStatus: "save_failed", pendingSave: false };
    case "publish_issues":
      return { ...state, publishIssues: action.issues };
    case "conflict":
      return {
        ...state,
        saveStatus: "conflict",
        pendingSave: false,
        conflictRevision: action.revision,
      };
  }
}

function undo(state: EditorState): EditorState {
  const entry = state.undoStack.at(-1);
  if (!entry) return state;
  return edited(state, apply(state.document, entry.inverse), {
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, entry],
  });
}

function redo(state: EditorState): EditorState {
  const entry = state.redoStack.at(-1);
  if (!entry) return state;
  const applied = apply(state.document, entry.command);
  return edited(state, applied, {
    undoStack: [...state.undoStack, { command: entry.command, inverse: applied.inverse }],
    redoStack: state.redoStack.slice(0, -1),
  });
}

function canStartSave(state: EditorState): boolean {
  return state.saveStatus === "dirty" || state.saveStatus === "save_failed";
}

function edited(
  state: EditorState,
  applied: { document: Document },
  stacks: Pick<EditorState, "undoStack" | "redoStack">,
): EditorState {
  const document = applied.document;
  const selectedBlockId =
    state.selectedBlockId && findBlockIndex(document, state.selectedBlockId) === -1
      ? null
      : state.selectedBlockId;
  return {
    ...state,
    ...stacks,
    document,
    selectedBlockId,
    publishIssues: [],
    saveStatus: nextStatusAfterEdit(state.saveStatus),
    pendingSave: state.saveStatus === "saving" ? true : state.pendingSave,
  };
}

function nextStatusAfterEdit(status: SaveStatus): SaveStatus {
  if (status === "saving" || status === "conflict") return status;
  return "dirty";
}

function saveSucceeded(state: EditorState, revision: number, savedDocument: Document): EditorState {
  const current = documentsEqual(state.document, savedDocument);
  return {
    ...state,
    serverRevision: revision,
    saveStatus: current ? "saved" : "dirty",
    pendingSave: !current,
  };
}
