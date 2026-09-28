import type { BlockType, Document } from "../document";
import { BLOCK_SCHEMAS, BLOCK_TYPES } from "../document";

interface OutlineProps {
  document: Document;
  selectedBlockId: string | null;
  onSelect: (id: string) => void;
  onMove: (delta: number) => void;
  onRemove: (id: string) => void;
  onAdd: (type: BlockType) => void;
}

export function Outline(props: OutlineProps) {
  const { document, selectedBlockId } = props;
  return (
    <aside className="outline" aria-label="Block outline">
      <h2>Blocks</h2>
      <ol className="outline-list">
        {document.blocks.map((block, index) => {
          const selected = block.id === selectedBlockId;
          return (
            <li key={block.id} className={selected ? "outline-item selected" : "outline-item"}>
              <button
                type="button"
                className="outline-select"
                onClick={() => props.onSelect(block.id)}
              >
                {index + 1}. {BLOCK_SCHEMAS[block.type].label}
              </button>
              {selected && (
                <span className="outline-actions">
                  <button type="button" onClick={() => props.onMove(-1)} disabled={index === 0}>
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onMove(1)}
                    disabled={index === document.blocks.length - 1}
                  >
                    Move down
                  </button>
                  <button type="button" onClick={() => props.onRemove(block.id)}>
                    Remove
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <h3>Add block</h3>
      <div className="outline-add">
        {BLOCK_TYPES.map((type) => (
          <button key={type} type="button" onClick={() => props.onAdd(type)}>
            {BLOCK_SCHEMAS[type].label}
          </button>
        ))}
      </div>
    </aside>
  );
}
