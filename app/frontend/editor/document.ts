export const BLOCK_TYPES = ["hero", "rich_text", "testimonial", "cta"] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export type Props = Record<string, string>;

export interface Block {
  id: string;
  type: BlockType;
  props: Props;
}

export interface Document {
  blocks: Block[];
}

export type FieldKind = "text" | "textarea" | "url";

export interface FieldSchema {
  name: string;
  label: string;
  kind: FieldKind;
  required: boolean;
}

export interface BlockSchema {
  label: string;
  fields: readonly FieldSchema[];
}

export const BLOCK_SCHEMAS: Record<BlockType, BlockSchema> = {
  hero: {
    label: "Hero",
    fields: [
      { name: "headline", label: "Headline", kind: "text", required: true },
      { name: "subheadline", label: "Subheadline", kind: "text", required: false },
      { name: "button_text", label: "Button text", kind: "text", required: false },
      { name: "button_url", label: "Button URL", kind: "url", required: false },
    ],
  },
  rich_text: {
    label: "Rich text",
    fields: [{ name: "body", label: "Body", kind: "textarea", required: true }],
  },
  testimonial: {
    label: "Testimonial",
    fields: [
      { name: "quote", label: "Quote", kind: "textarea", required: true },
      { name: "author", label: "Author", kind: "text", required: false },
    ],
  },
  cta: {
    label: "Call to action",
    fields: [
      { name: "headline", label: "Headline", kind: "text", required: true },
      { name: "button_text", label: "Button text", kind: "text", required: true },
      { name: "button_url", label: "Button URL", kind: "url", required: true },
    ],
  },
};

export function newBlock(type: BlockType, id: string = crypto.randomUUID()): Block {
  const props: Props = {};
  for (const field of BLOCK_SCHEMAS[type].fields) {
    props[field.name] = "";
  }
  return { id, type, props };
}

export function findBlockIndex(document: Document, id: string): number {
  return document.blocks.findIndex((block) => block.id === id);
}

export function documentsEqual(a: Document, b: Document): boolean {
  if (a.blocks.length !== b.blocks.length) return false;
  return a.blocks.every((block, index) => blocksEqual(block, b.blocks[index]));
}

function blocksEqual(a: Block, b: Block | undefined): boolean {
  if (!b || a.id !== b.id || a.type !== b.type) return false;
  const keys = new Set([...Object.keys(a.props), ...Object.keys(b.props)]);
  for (const key of keys) {
    if (a.props[key] !== b.props[key]) return false;
  }
  return true;
}
