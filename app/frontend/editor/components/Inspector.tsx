import { useState } from "react";
import type { Block, FieldSchema, Props } from "../document";
import { BLOCK_SCHEMAS } from "../document";
import type { Issue } from "../reducer";

interface InspectorProps {
  block: Block | null;
  issues: Issue[];
  onChange: (props: Props) => void;
}

export function Inspector({ block, issues, onChange }: InspectorProps) {
  if (!block) {
    return (
      <aside className="inspector" aria-label="Inspector">
        <h2>Inspector</h2>
        <p className="muted">Select a block to edit its content.</p>
      </aside>
    );
  }
  const schema = BLOCK_SCHEMAS[block.type];
  return (
    <aside className="inspector" aria-label="Inspector">
      <h2>{schema.label}</h2>
      {schema.fields.map((field) => (
        <Field
          key={`${block.id}:${field.name}`}
          field={field}
          value={block.props[field.name] ?? ""}
          issue={
            issues.find((issue) => issue.block_id === block.id && issue.field === field.name) ??
            null
          }
          onCommit={(value) => onChange({ ...block.props, [field.name]: value })}
        />
      ))}
    </aside>
  );
}

interface FieldProps {
  field: FieldSchema;
  value: string;
  issue: Issue | null;
  onCommit: (value: string) => void;
}

function Field({ field, value, issue, onCommit }: FieldProps) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  const id = `field-${field.name}`;
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">
        {field.label}
        {field.required && <span className="required"> (required)</span>}
      </span>
      {field.kind === "textarea" ? (
        <textarea
          id={id}
          value={draft}
          rows={4}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <input
          id={id}
          type={field.kind === "url" ? "url" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
        />
      )}
      {issue && <span className="field-issue">{issue.message}</span>}
    </label>
  );
}
