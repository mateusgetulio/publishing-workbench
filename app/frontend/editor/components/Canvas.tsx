import type { Block, Document } from "../document";
import type { Issue } from "../reducer";

interface CanvasProps {
  document: Document;
  selectedBlockId: string | null;
  issues: Issue[];
  onSelect: (id: string) => void;
}

export function Canvas({ document, selectedBlockId, issues, onSelect }: CanvasProps) {
  return (
    <section className="canvas" aria-label="Page canvas">
      {document.blocks.length === 0 && (
        <p className="canvas-empty">Add a block to start the page.</p>
      )}
      {document.blocks.map((block) => {
        const hasIssue = issues.some((issue) => issue.block_id === block.id);
        const classes = ["canvas-block", `canvas-${block.type}`];
        if (block.id === selectedBlockId) classes.push("selected");
        if (hasIssue) classes.push("has-issue");
        return (
          <div
            key={block.id}
            className={classes.join(" ")}
            data-block-id={block.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(block.id)}
            onKeyDown={(event) => event.key === "Enter" && onSelect(block.id)}
          >
            <BlockPreview block={block} />
          </div>
        );
      })}
    </section>
  );
}

function BlockPreview({ block }: { block: Block }) {
  const p = block.props;
  switch (block.type) {
    case "hero":
      return (
        <>
          <h1>{p.headline || <Placeholder text="Headline" />}</h1>
          {p.subheadline && <p className="lead">{p.subheadline}</p>}
          {p.button_text && <span className="fake-button">{p.button_text}</span>}
        </>
      );
    case "rich_text":
      return <p>{p.body || <Placeholder text="Body text" />}</p>;
    case "testimonial":
      return (
        <blockquote>
          <p>{p.quote || <Placeholder text="Quote" />}</p>
          {p.author && <cite>{p.author}</cite>}
        </blockquote>
      );
    case "cta":
      return (
        <>
          <h2>{p.headline || <Placeholder text="Headline" />}</h2>
          <span className="fake-button">{p.button_text || <Placeholder text="Button" />}</span>
        </>
      );
  }
}

function Placeholder({ text }: { text: string }) {
  return <span className="placeholder">{text}</span>;
}
