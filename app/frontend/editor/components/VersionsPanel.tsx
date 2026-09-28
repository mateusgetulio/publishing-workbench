import type { SnapshotDetail, SnapshotSummary } from "../api";
import { diffDocuments, isEmptyDiff } from "../diff";
import type { Document } from "../document";
import { BLOCK_SCHEMAS } from "../document";

interface VersionsPanelProps {
  snapshots: SnapshotSummary[];
  selected: SnapshotDetail | null;
  workingDocument: Document;
  canRestore: boolean;
  onOpen: (snapshot: SnapshotSummary) => void;
  onRestore: (snapshot: SnapshotSummary) => void;
  onClose: () => void;
}

export function VersionsPanel(props: VersionsPanelProps) {
  const { snapshots, selected } = props;
  return (
    <aside className="versions" aria-label="Versions">
      <div className="versions-head">
        <h2>Published versions</h2>
        <button type="button" onClick={props.onClose}>
          Close
        </button>
      </div>
      {snapshots.length === 0 && <p className="muted">Nothing has been published yet.</p>}
      <ol className="versions-list">
        {snapshots.map((snapshot) => (
          <li
            key={snapshot.snapshot_id}
            className={snapshot.current ? "version current" : "version"}
          >
            <button type="button" className="version-open" onClick={() => props.onOpen(snapshot)}>
              Version {snapshot.number}
              {snapshot.current ? " (public)" : ""}
            </button>
            <time dateTime={snapshot.published_at}>
              {new Date(snapshot.published_at).toLocaleString()}
            </time>
          </li>
        ))}
      </ol>
      {selected && (
        <div className="version-detail">
          <h3>Version {selected.number} against the working draft</h3>
          <DiffView from={selected.document} to={props.workingDocument} />
          <button
            type="button"
            className="primary"
            disabled={!props.canRestore}
            onClick={() => props.onRestore(selected)}
          >
            Restore into the working draft
          </button>
          {!props.canRestore && (
            <p className="muted">Restore is available once the draft is saved.</p>
          )}
        </div>
      )}
    </aside>
  );
}

function orderLabel(order: string[], document: Document): string {
  const labels = new Map(
    document.blocks.map((block) => [block.id, BLOCK_SCHEMAS[block.type].label]),
  );
  return order.map((id, index) => `${index + 1}. ${labels.get(id) ?? "?"}`).join(", ");
}

function DiffView({ from, to }: { from: Document; to: Document }) {
  const diff = diffDocuments(from, to);
  if (isEmptyDiff(diff)) return <p className="muted">The working draft matches this version.</p>;
  return (
    <ul className="diff">
      {diff.added.map((block) => (
        <li key={`added-${block.id}`}>
          Added since this version: {BLOCK_SCHEMAS[block.type].label}
        </li>
      ))}
      {diff.removed.map((block) => (
        <li key={`removed-${block.id}`}>
          Removed since this version: {BLOCK_SCHEMAS[block.type].label}
        </li>
      ))}
      {diff.changed.map(({ block, fields }) => (
        <li key={`changed-${block.id}`}>
          {BLOCK_SCHEMAS[block.type].label}: {fields.join(", ")} changed
        </li>
      ))}
      {diff.orderChanged && <li>Block order changed: {orderLabel(diff.order, to)}</li>}
    </ul>
  );
}
