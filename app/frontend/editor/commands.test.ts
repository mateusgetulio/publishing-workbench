import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { apply } from "./commands";
import type { Document } from "./document";
import { documentsEqual } from "./document";
import { commandArbitrary, documentArbitrary } from "./arbitraries";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as object)) deepFreeze(child);
  }
  return value;
}

const documentAndCommand = documentArbitrary.chain((document) =>
  commandArbitrary(document).map((command) => ({ document, command })),
);

describe("apply", () => {
  it("INV-1 applying the inverse restores the original document", () => {
    fc.assert(
      fc.property(documentAndCommand, ({ document, command }) => {
        const frozen = deepFreeze(structuredClone(document));
        const applied = apply(frozen, command);
        const restored = apply(applied.document, applied.inverse).document;
        expect(documentsEqual(restored, document)).toBe(true);
        expect(restored).toEqual(document);
      }),
    );
  });

  it("INV-2 undo then redo reproduces the post-command document, ids included", () => {
    fc.assert(
      fc.property(documentAndCommand, ({ document, command }) => {
        const applied = apply(document, command);
        const undone = apply(applied.document, applied.inverse).document;
        const redone = apply(undone, command).document;
        expect(redone).toEqual(applied.document);
      }),
    );
  });

  it("INV-3 moving a block keeps the same set of blocks", () => {
    const moveCase = documentArbitrary.chain((document) =>
      fc
        .record({
          from: fc.integer({ min: 0, max: document.blocks.length - 1 }),
          to: fc.integer({ min: 0, max: document.blocks.length - 1 }),
        })
        .map(({ from, to }) => ({ document, from, to })),
    );
    fc.assert(
      fc.property(moveCase, ({ document, from, to }) => {
        const id = document.blocks[from]?.id ?? "";
        const moved = apply(document, { kind: "move_block", id, from, to }).document;
        expect(moved.blocks.length).toBe(document.blocks.length);
        expect(new Set(moved.blocks.map((block) => block.id))).toEqual(
          new Set(document.blocks.map((block) => block.id)),
        );
        expect(moved.blocks[to]?.id).toBe(id);
      }),
    );
  });

  it("does not mutate the input document", () => {
    fc.assert(
      fc.property(documentAndCommand, ({ document, command }) => {
        const before = structuredClone(document);
        apply(deepFreeze(document), command);
        expect(document).toEqual(before);
      }),
    );
  });

  it("INV-1 restoring a sparse block does not invent empty properties", () => {
    const document: Document = { blocks: [{ id: "h", type: "hero", props: { headline: "A" } }] };
    const applied = apply(document, {
      kind: "update_block",
      id: "h",
      props: { headline: "A", subheadline: "S" },
    });
    expect(applied.document.blocks[0]?.props).toEqual({ headline: "A", subheadline: "S" });
    expect(apply(applied.document, applied.inverse).document).toEqual(document);
  });

  it("rejects a move whose from index does not hold the block", () => {
    const document: Document = { blocks: [{ id: "a", type: "rich_text", props: { body: "x" } }] };
    expect(() => apply(document, { kind: "move_block", id: "a", from: 3, to: 0 })).toThrow(
      /not at 3/,
    );
  });

  it("rejects commands that reference a missing block", () => {
    const document: Document = { blocks: [] };
    expect(() => apply(document, { kind: "remove_block", id: "missing" })).toThrow(/not found/);
  });

  it("rejects adding a block whose id already exists", () => {
    const block = { id: "same", type: "rich_text" as const, props: { body: "x" } };
    const document: Document = { blocks: [block] };
    expect(() => apply(document, { kind: "add_block", block, index: 1 })).toThrow(/already exists/);
  });
});
