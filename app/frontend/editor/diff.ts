import type { Block, Document } from "./document";

export interface BlockChange {
  block: Block;
  fields: string[];
}

export interface DocumentDiff {
  added: Block[];
  removed: Block[];
  changed: BlockChange[];
  orderChanged: boolean;
  order: string[];
}

export function diffDocuments(from: Document, to: Document): DocumentDiff {
  const fromById = new Map(from.blocks.map((block) => [block.id, block]));
  const toById = new Map(to.blocks.map((block) => [block.id, block]));
  const added = to.blocks.filter((block) => !fromById.has(block.id));
  const removed = from.blocks.filter((block) => !toById.has(block.id));
  const changed: BlockChange[] = [];
  for (const block of to.blocks) {
    const before = fromById.get(block.id);
    if (!before) continue;
    const fields = changedFields(before, block);
    if (fields.length > 0) changed.push({ block, fields });
  }
  const sharedFrom = from.blocks.filter((block) => toById.has(block.id)).map((block) => block.id);
  const sharedTo = to.blocks.filter((block) => fromById.has(block.id)).map((block) => block.id);
  const orderChanged = sharedFrom.some((id, index) => id !== sharedTo[index]);
  return { added, removed, changed, orderChanged, order: to.blocks.map((block) => block.id) };
}

export function isEmptyDiff(diff: DocumentDiff): boolean {
  return (
    diff.added.length === 0 &&
    diff.removed.length === 0 &&
    diff.changed.length === 0 &&
    !diff.orderChanged
  );
}

function changedFields(before: Block, after: Block): string[] {
  const keys = new Set([...Object.keys(before.props), ...Object.keys(after.props)]);
  const fields: string[] = [];
  for (const key of keys) {
    if ((before.props[key] ?? "") !== (after.props[key] ?? "")) fields.push(key);
  }
  if (before.type !== after.type) fields.push("type");
  return fields;
}
