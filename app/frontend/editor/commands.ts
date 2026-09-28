import type { Block, Document, Props } from "./document";
import { findBlockIndex } from "./document";

export type Command =
  | { kind: "add_block"; block: Block; index: number }
  | { kind: "remove_block"; id: string }
  | { kind: "update_block"; id: string; props: Props }
  | { kind: "move_block"; id: string; from: number; to: number };

export interface Applied {
  document: Document;
  inverse: Command;
}

export function apply(document: Document, command: Command): Applied {
  switch (command.kind) {
    case "add_block":
      return addBlock(document, command.block, command.index);
    case "remove_block":
      return removeBlock(document, command.id);
    case "update_block":
      return updateBlock(document, command.id, command.props);
    case "move_block":
      return moveBlock(document, command.id, command.from, command.to);
  }
}

function addBlock(document: Document, block: Block, index: number): Applied {
  if (document.blocks.some((candidate) => candidate.id === block.id)) {
    throw new Error(`block ${block.id} already exists`);
  }
  const at = clamp(index, 0, document.blocks.length);
  const blocks = [...document.blocks.slice(0, at), block, ...document.blocks.slice(at)];
  return { document: { blocks }, inverse: { kind: "remove_block", id: block.id } };
}

function removeBlock(document: Document, id: string): Applied {
  const { block, index } = requireBlock(document, id);
  const blocks = document.blocks.filter((candidate) => candidate.id !== id);
  return { document: { blocks }, inverse: { kind: "add_block", block, index } };
}

function updateBlock(document: Document, id: string, props: Props): Applied {
  const { block } = requireBlock(document, id);
  const blocks = document.blocks.map((candidate) =>
    candidate.id === id ? { ...candidate, props: { ...props } } : candidate,
  );
  return { document: { blocks }, inverse: { kind: "update_block", id, props: { ...block.props } } };
}

function moveBlock(document: Document, id: string, from: number, to: number): Applied {
  const block = document.blocks[from];
  if (block === undefined || block.id !== id) {
    throw new Error(`block ${id} is not at ${from}`);
  }
  const target = clamp(to, 0, document.blocks.length - 1);
  const blocks = document.blocks.filter((candidate) => candidate.id !== id);
  blocks.splice(target, 0, block);
  return { document: { blocks }, inverse: { kind: "move_block", id, from: target, to: from } };
}

function requireBlock(document: Document, id: string): { block: Block; index: number } {
  const index = findBlockIndex(document, id);
  const block = document.blocks[index];
  if (block === undefined) {
    throw new Error(`block ${id} not found`);
  }
  return { block, index };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
