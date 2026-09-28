import { useCallback, useEffect, useReducer, useState } from "react";
import type { Api, PagePayload, SnapshotDetail, SnapshotSummary } from "../api";
import type { Command } from "../commands";
import type { BlockType } from "../document";
import { newBlock } from "../document";
import { editorKey } from "../keyboard";
import { publishIssues } from "../publishIssues";
import { initialState, reduce } from "../reducer";
import type { Issue } from "../reducer";
import { useSaveController } from "../useSaveController";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import { Outline } from "./Outline";
import { Toolbar } from "./Toolbar";
import { VersionsPanel } from "./VersionsPanel";

interface EditorProps {
  pageId: number;
  api: Api;
  debounceMs?: number;
}

type Panel = "inspector" | "versions";

export function Editor({ pageId, api, debounceMs }: EditorProps) {
  const [state, dispatch] = useReducer(reduce, initialState({ blocks: [] }, 0));
  const [page, setPage] = useState<PagePayload["page"] | null>(null);
  const [published, setPublished] = useState<PagePayload["published"]>(null);
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotDetail | null>(null);
  const [panel, setPanel] = useState<Panel>("inspector");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { retry } = useSaveController(state, dispatch, api, pageId, debounceMs);

  const applyPayload = useCallback((payload: PagePayload) => {
    setPage(payload.page);
    setPublished(payload.published);
    dispatch({
      type: "loaded",
      document: payload.draft.document,
      revision: payload.draft.revision,
      publishIssues: payload.publish_issues,
    });
  }, []);

  const load = useCallback(
    () =>
      api
        .loadPage(pageId)
        .then(applyPayload)
        .catch(() => setNotice("The page could not be loaded. Reload to try again.")),
    [api, pageId, applyPayload],
  );
  const refreshSnapshots = useCallback(
    () =>
      api
        .listSnapshots(pageId)
        .then(setSnapshots)
        .catch(() => setNotice("The version list could not be loaded.")),
    [api, pageId],
  );

  useEffect(() => {
    void load();
    void refreshSnapshots();
  }, [load, refreshSnapshots]);

  const issues: Issue[] =
    state.publishIssues.length > 0 ? state.publishIssues : publishIssues(state.document);
  const run = useCallback(
    (command: Command) => {
      if (!busy) dispatch({ type: "command", command });
    },
    [busy],
  );
  const selected =
    state.document.blocks.find((block) => block.id === state.selectedBlockId) ?? null;
  const selectedIndex = selected ? state.document.blocks.indexOf(selected) : -1;

  const move = useCallback(
    (delta: number) => {
      if (!selected || selectedIndex === -1) return;
      const to = selectedIndex + delta;
      if (to < 0 || to >= state.document.blocks.length) return;
      run({ kind: "move_block", id: selected.id, from: selectedIndex, to });
    },
    [run, selected, selectedIndex, state.document.blocks.length],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = editorKey(event);
      if (!key) return;
      event.preventDefault();
      if (busy) return;
      if (key === "undo") dispatch({ type: "undo" });
      if (key === "redo") dispatch({ type: "redo" });
      if (key === "move_up") move(-1);
      if (key === "move_down") move(1);
      if (key === "remove" && selected) run({ kind: "remove_block", id: selected.id });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, move, run, selected]);

  const addBlock = (type: BlockType) => {
    if (busy) return;
    const block = newBlock(type);
    const index = selectedIndex === -1 ? state.document.blocks.length : selectedIndex + 1;
    run({ kind: "add_block", block, index });
    dispatch({ type: "select", id: block.id });
  };

  const publish = async () => {
    setBusy(true);
    setNotice(null);
    const result = await api.publish(pageId, state.serverRevision);
    setBusy(false);
    if (result.kind === "published") {
      setNotice(`Published version ${result.snapshot.number}.`);
      setPublished({
        snapshot_id: result.snapshot.snapshot_id,
        number: result.snapshot.number,
        published_at: result.snapshot.published_at,
      });
      dispatch({ type: "publish_issues", issues: [] });
      await refreshSnapshots();
    } else if (result.kind === "stale") {
      dispatch({ type: "conflict", revision: result.revision });
    } else if (result.kind === "invalid") {
      dispatch({ type: "publish_issues", issues: result.issues });
      setNotice("The draft cannot be published until its issues are fixed.");
    } else {
      setNotice("Publishing failed. The public page is unchanged.");
    }
  };

  const restore = async (snapshot: SnapshotSummary) => {
    setBusy(true);
    setNotice(null);
    const result = await api.restore(pageId, snapshot.snapshot_id, state.serverRevision);
    setBusy(false);
    if (result.kind === "restored") {
      dispatch({
        type: "loaded",
        document: result.document,
        revision: result.revision,
        publishIssues: publishIssues(result.document),
      });
      setSelectedSnapshot(null);
      setNotice(
        `Version ${snapshot.number} is now the working draft. Publish it to make it public.`,
      );
    } else if (result.kind === "stale") {
      dispatch({ type: "conflict", revision: result.revision });
    } else {
      setNotice("Restore failed. The working draft is unchanged.");
    }
  };

  const openSnapshot = async (snapshot: SnapshotSummary) => {
    setSelectedSnapshot(await api.getSnapshot(pageId, snapshot.snapshot_id));
  };

  if (!page) {
    return (
      <p className="editor-loading" role="status">
        {notice ?? "Loading the working draft"}
      </p>
    );
  }

  return (
    <div className="editor">
      <Toolbar
        title={page.title}
        slug={page.slug}
        pageId={pageId}
        state={state}
        issues={issues}
        published={published}
        busy={busy}
        onUndo={() => !busy && dispatch({ type: "undo" })}
        onRedo={() => !busy && dispatch({ type: "redo" })}
        onRetry={retry}
        onReload={() => void load()}
        onPublish={() => void publish()}
        onToggleVersions={() => setPanel(panel === "versions" ? "inspector" : "versions")}
        versionsOpen={panel === "versions"}
      />
      {notice && (
        <p className="editor-notice" role="status">
          {notice}
        </p>
      )}
      <fieldset className="editor-body" disabled={busy} aria-busy={busy}>
        <Outline
          document={state.document}
          selectedBlockId={state.selectedBlockId}
          onSelect={(id) => dispatch({ type: "select", id })}
          onMove={move}
          onRemove={(id) => run({ kind: "remove_block", id })}
          onAdd={addBlock}
        />
        <Canvas
          document={state.document}
          selectedBlockId={state.selectedBlockId}
          issues={issues}
          onSelect={(id) => dispatch({ type: "select", id })}
        />
        {panel === "versions" ? (
          <VersionsPanel
            snapshots={snapshots}
            selected={selectedSnapshot}
            workingDocument={state.document}
            canRestore={state.saveStatus === "saved" && !busy}
            onOpen={(snapshot) => void openSnapshot(snapshot)}
            onRestore={(snapshot) => void restore(snapshot)}
            onClose={() => setPanel("inspector")}
          />
        ) : (
          <Inspector
            block={selected}
            issues={issues}
            onChange={(props) => selected && run({ kind: "update_block", id: selected.id, props })}
          />
        )}
      </fieldset>
    </div>
  );
}
