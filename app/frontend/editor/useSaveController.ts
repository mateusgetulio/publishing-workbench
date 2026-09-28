import { useCallback, useEffect, useRef } from "react";
import type { Dispatch } from "react";
import type { Api } from "./api";
import type { Document } from "./document";
import type { EditorAction, EditorState } from "./reducer";

export const SAVE_DEBOUNCE_MS = 800;

interface SaveController {
  retry: () => void;
}

export function useSaveController(
  state: EditorState,
  dispatch: Dispatch<EditorAction>,
  api: Api,
  pageId: number,
  debounceMs: number = SAVE_DEBOUNCE_MS,
): SaveController {
  const inFlight = useRef(false);

  const save = useCallback(
    async (document: Document, revision: number) => {
      if (inFlight.current) return;
      inFlight.current = true;
      dispatch({ type: "save_started" });
      const result = await api.saveDraft(pageId, revision, document);
      inFlight.current = false;
      switch (result.kind) {
        case "saved":
          dispatch({ type: "save_succeeded", revision: result.revision, savedDocument: document });
          break;
        case "stale":
          dispatch({ type: "conflict", revision: result.revision });
          break;
        case "invalid":
        case "failed":
          dispatch({ type: "save_failed" });
          break;
      }
    },
    [api, dispatch, pageId],
  );

  const { document, serverRevision, saveStatus, pendingSave } = state;

  useEffect(() => {
    if (saveStatus !== "dirty") return;
    if (pendingSave) {
      void save(document, serverRevision);
      return;
    }
    const timer = setTimeout(() => void save(document, serverRevision), debounceMs);
    return () => clearTimeout(timer);
  }, [saveStatus, pendingSave, document, serverRevision, save, debounceMs]);

  const retry = useCallback(() => {
    if (saveStatus === "save_failed") void save(document, serverRevision);
  }, [saveStatus, document, serverRevision, save]);

  return { retry };
}
