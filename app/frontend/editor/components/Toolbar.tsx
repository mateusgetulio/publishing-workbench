import type { PagePayload } from "../api";
import type { EditorState, Issue } from "../reducer";

interface ToolbarProps {
  title: string;
  slug: string;
  pageId: number;
  state: EditorState;
  issues: Issue[];
  published: PagePayload["published"];
  busy: boolean;
  versionsOpen: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRetry: () => void;
  onReload: () => void;
  onPublish: () => void;
  onToggleVersions: () => void;
}

const STATUS_LABEL: Record<EditorState["saveStatus"], string> = {
  saved: "Saved",
  dirty: "Unsaved",
  saving: "Saving",
  save_failed: "Save failed",
  conflict: "Conflict",
};

export function Toolbar(props: ToolbarProps) {
  const { state, issues } = props;
  const canPublish = state.saveStatus === "saved" && issues.length === 0 && !props.busy;
  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <strong className="toolbar-title">{props.title}</strong>
        <a className="toolbar-link" href={`/p/${props.slug}`} target="_blank" rel="noreferrer">
          Public page
        </a>
        <a
          className="toolbar-link"
          href={`/pages/${props.pageId}/preview`}
          target="_blank"
          rel="noreferrer"
        >
          Preview draft
        </a>
      </div>
      <div className="toolbar-group">
        <button type="button" onClick={props.onUndo} disabled={state.undoStack.length === 0}>
          Undo
        </button>
        <button type="button" onClick={props.onRedo} disabled={state.redoStack.length === 0}>
          Redo
        </button>
        <span className={`status status-${state.saveStatus}`} role="status" aria-live="polite">
          {STATUS_LABEL[state.saveStatus]}
        </span>
        {state.saveStatus === "save_failed" && (
          <button type="button" onClick={props.onRetry}>
            Retry
          </button>
        )}
        {state.saveStatus === "conflict" && (
          <button type="button" onClick={props.onReload}>
            Reload latest
          </button>
        )}
      </div>
      <div className="toolbar-group">
        {issues.length > 0 && (
          <span className="issues" role="status">
            {issues.length === 1
              ? "1 issue before publishing"
              : `${issues.length} issues before publishing`}
          </span>
        )}
        {props.published && (
          <span className="published-info">Public: version {props.published.number}</span>
        )}
        <button type="button" onClick={props.onToggleVersions} aria-pressed={props.versionsOpen}>
          Versions
        </button>
        <button type="button" className="primary" onClick={props.onPublish} disabled={!canPublish}>
          Publish
        </button>
      </div>
    </header>
  );
}
