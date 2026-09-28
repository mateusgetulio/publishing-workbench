import fc from "fast-check";
import type { Command } from "./commands";
import { apply } from "./commands";
import type { Block, BlockType, Document, Props } from "./document";
import { BLOCK_SCHEMAS, BLOCK_TYPES } from "./document";

const text = fc.string({ minLength: 0, maxLength: 12 });

export function propsArbitrary(type: BlockType): fc.Arbitrary<Props> {
  const names = BLOCK_SCHEMAS[type].fields.map((field) => field.name);
  return fc.subarray(names).chain((present) => {
    const entries = present.map((name) => fc.tuple(fc.constant(name), text));
    return fc.tuple(...entries).map((pairs) => Object.fromEntries(pairs));
  });
}

export const blockArbitrary: fc.Arbitrary<Block> = fc
  .constantFrom(...BLOCK_TYPES)
  .chain((type) =>
    fc.record({ id: fc.uuid(), type: fc.constant(type), props: propsArbitrary(type) }),
  );

export const documentArbitrary: fc.Arbitrary<Document> = fc
  .uniqueArray(blockArbitrary, { minLength: 1, maxLength: 20, selector: (block) => block.id })
  .map((blocks) => ({ blocks }));

export function commandArbitrary(document: Document): fc.Arbitrary<Command> {
  const size = document.blocks.length;
  const add: fc.Arbitrary<Command> = fc
    .record({ block: blockArbitrary, index: fc.integer({ min: 0, max: size }) })
    .filter(({ block }) => document.blocks.every((candidate) => candidate.id !== block.id))
    .map(({ block, index }) => ({ kind: "add_block", block, index }));
  if (size === 0) return add;

  const existing = fc.constantFrom(...document.blocks.entries());
  const remove: fc.Arbitrary<Command> = existing.map(([, block]) => ({
    kind: "remove_block",
    id: block.id,
  }));
  const update: fc.Arbitrary<Command> = existing.chain(([, block]) =>
    propsArbitrary(block.type).map((props) => ({ kind: "update_block", id: block.id, props })),
  );
  const move: fc.Arbitrary<Command> = existing.chain(([from, block]) =>
    fc
      .integer({ min: 0, max: size - 1 })
      .map((to) => ({ kind: "move_block", id: block.id, from, to })),
  );
  return fc.oneof(add, remove, update, move);
}

export function commandSequenceArbitrary(
  document: Document,
  length: number,
): fc.Arbitrary<Command[]> {
  return sequence(document, length);
}

function sequence(document: Document, remaining: number): fc.Arbitrary<Command[]> {
  if (remaining === 0) return fc.constant([]);
  return commandArbitrary(document).chain((command) => {
    const next = apply(document, command).document;
    return sequence(next, remaining - 1).map((rest) => [command, ...rest]);
  });
}
