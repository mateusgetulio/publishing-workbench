import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { initialState, reduce } from "./reducer";
import type { EditorAction, EditorState } from "./reducer";
import type { Document } from "./document";
import { newBlock } from "./document";
import { commandSequenceArbitrary, documentArbitrary } from "./arbitraries";

const base: Document = {
  blocks: [
    {
      id: "a",
      type: "hero",
      props: { headline: "A", subheadline: "", button_text: "", button_url: "" },
    },
    { id: "b", type: "rich_text", props: { body: "B" } },
    {
      id: "c",
      type: "cta",
      props: { headline: "C", button_text: "Go", button_url: "https://x.test" },
    },
  ],
};

function run(state: EditorState, ...actions: EditorAction[]): EditorState {
  return actions.reduce(reduce, state);
}

function ids(state: EditorState): string[] {
  return state.document.blocks.map((block) => block.id);
}

describe("reduce", () => {
  it("removing, undoing and redoing a block keeps its identity", () => {
    const start = initialState(base, 4);
    const removed = run(start, { type: "command", command: { kind: "remove_block", id: "b" } });
    expect(ids(removed)).toEqual(["a", "c"]);
    const undone = run(removed, { type: "undo" });
    expect(undone.document).toEqual(base);
    const redone = run(undone, { type: "redo" });
    expect(ids(redone)).toEqual(["a", "c"]);
  });

  it("a new command after undo clears the redo stack", () => {
    const start = initialState(base, 0);
    const state = run(
      start,
      { type: "command", command: { kind: "remove_block", id: "b" } },
      { type: "undo" },
      { type: "command", command: { kind: "update_block", id: "a", props: { headline: "New" } } },
    );
    expect(state.redoStack).toEqual([]);
    expect(run(state, { type: "redo" })).toBe(state);
  });

  it("redo of an added block keeps the client-generated id", () => {
    const block = newBlock("testimonial", "fixed-id");
    const state = run(
      initialState(base, 0),
      { type: "command", command: { kind: "add_block", block, index: 1 } },
      { type: "undo" },
      { type: "redo" },
    );
    expect(ids(state)).toEqual(["a", "fixed-id", "b", "c"]);
  });

  it("undoing every command in a generated sequence restores the original document", () => {
    const sequenceCase = documentArbitrary.chain((document) =>
      fc
        .integer({ min: 1, max: 15 })
        .chain((length) =>
          commandSequenceArbitrary(document, length).map((commands) => ({ document, commands })),
        ),
    );
    fc.assert(
      fc.property(sequenceCase, ({ document, commands }) => {
        let state = initialState(document, 0);
        for (const command of commands) state = reduce(state, { type: "command", command });
        for (let i = 0; i < commands.length; i++) state = reduce(state, { type: "undo" });
        expect(state.document).toEqual(document);
        expect(state.undoStack).toEqual([]);
        expect(state.redoStack.length).toBe(commands.length);
      }),
    );
  });

  it("clears the selection when the selected block disappears", () => {
    const state = run(
      initialState(base, 0),
      { type: "select", id: "b" },
      { type: "command", command: { kind: "remove_block", id: "b" } },
    );
    expect(state.selectedBlockId).toBeNull();
    expect(run(state, { type: "undo" }).selectedBlockId).toBeNull();
  });

  it("selection is not part of history", () => {
    const state = run(initialState(base, 0), { type: "select", id: "c" });
    expect(state.undoStack).toEqual([]);
    expect(state.saveStatus).toBe("saved");
  });

  it("an edit marks the editor dirty and a matching save acknowledgement marks it saved", () => {
    const edited = run(initialState(base, 7), {
      type: "command",
      command: { kind: "update_block", id: "a", props: { headline: "Fresh" } },
    });
    expect(edited.saveStatus).toBe("dirty");
    const saving = run(edited, { type: "save_started" });
    expect(saving.saveStatus).toBe("saving");
    const saved = run(saving, {
      type: "save_succeeded",
      revision: 8,
      savedDocument: edited.document,
    });
    expect(saved.saveStatus).toBe("saved");
    expect(saved.serverRevision).toBe(8);
    expect(saved.pendingSave).toBe(false);
  });

  it("an edit during a save leaves the editor dirty with a pending save after the acknowledgement", () => {
    const start = initialState(base, 7);
    const first = run(start, {
      type: "command",
      command: { kind: "update_block", id: "a", props: { headline: "One" } },
    });
    const saving = run(first, { type: "save_started" });
    const second = run(saving, {
      type: "command",
      command: { kind: "update_block", id: "a", props: { headline: "Two" } },
    });
    expect(second.saveStatus).toBe("saving");
    expect(second.pendingSave).toBe(true);
    const acknowledged = run(second, {
      type: "save_succeeded",
      revision: 8,
      savedDocument: first.document,
    });
    expect(acknowledged.saveStatus).toBe("dirty");
    expect(acknowledged.pendingSave).toBe(true);
    expect(acknowledged.serverRevision).toBe(8);
  });

  it("a conflict stops the save cycle and later edits stay local", () => {
    const state = run(
      initialState(base, 7),
      { type: "command", command: { kind: "remove_block", id: "b" } },
      { type: "save_started" },
      { type: "conflict", revision: 9 },
      { type: "command", command: { kind: "remove_block", id: "c" } },
    );
    expect(state.saveStatus).toBe("conflict");
    expect(state.serverRevision).toBe(7);
    expect(state.conflictRevision).toBe(9);
    expect(ids(state)).toEqual(["a"]);
    expect(run(state, { type: "save_started" })).toBe(state);
  });

  it("a save can only start from dirty or save_failed", () => {
    const saved = initialState(base, 1);
    expect(run(saved, { type: "save_started" })).toBe(saved);
    const failed = run(
      saved,
      { type: "command", command: { kind: "remove_block", id: "b" } },
      { type: "save_started" },
      { type: "save_failed" },
    );
    expect(failed.saveStatus).toBe("save_failed");
    expect(run(failed, { type: "save_started" }).saveStatus).toBe("saving");
  });

  it("loading replaces the document and clears history", () => {
    const state = run(
      initialState(base, 0),
      { type: "command", command: { kind: "remove_block", id: "b" } },
      { type: "loaded", document: base, revision: 12, publishIssues: [] },
    );
    expect(state.document).toEqual(base);
    expect(state.undoStack).toEqual([]);
    expect(state.redoStack).toEqual([]);
    expect(state.serverRevision).toBe(12);
    expect(state.saveStatus).toBe("saved");
  });
});
