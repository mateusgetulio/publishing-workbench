import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReducer } from "react";
import type { Api, SaveResult } from "./api";
import type { Document } from "./document";
import { initialState, reduce } from "./reducer";
import { useSaveController } from "./useSaveController";

const base: Document = {
  blocks: [{ id: "a", type: "rich_text", props: { body: "A" } }],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function fakeApi(saveDraft: Api["saveDraft"]): Api {
  const unused = () => Promise.reject(new Error("not used in this test"));
  return {
    loadPage: unused,
    saveDraft,
    publish: unused,
    listSnapshots: unused,
    getSnapshot: unused,
    restore: unused,
  };
}

function useHarness(api: Api) {
  const [state, dispatch] = useReducer(reduce, initialState(base, 14));
  const controller = useSaveController(state, dispatch, api, 1, 800);
  return { state, dispatch, controller };
}

function edit(body: string) {
  return {
    type: "command" as const,
    command: { kind: "update_block" as const, id: "a", props: { body } },
  };
}

describe("useSaveController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("INV-6 keeps one request in flight and sends exactly one follow-up with the returned revision", async () => {
    const calls: Array<{
      revision: number;
      body: string;
      result: ReturnType<typeof deferred<SaveResult>>;
    }> = [];
    const api = fakeApi((_page, revision, document) => {
      const result = deferred<SaveResult>();
      calls.push({ revision, body: document.blocks[0]?.props.body ?? "", result });
      return result.promise;
    });
    const { result } = renderHook(() => useHarness(api));

    act(() => result.current.dispatch(edit("A1")));
    expect(result.current.state.saveStatus).toBe("dirty");
    expect(calls).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.revision).toBe(14);
    expect(result.current.state.saveStatus).toBe("saving");

    act(() => result.current.dispatch(edit("A2")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(calls).toHaveLength(1);
    expect(result.current.state.saveStatus).toBe("saving");
    expect(result.current.state.pendingSave).toBe(true);

    await act(async () => {
      calls[0]?.result.resolve({ kind: "saved", revision: 15 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(calls).toHaveLength(2);
    expect(calls[1]?.revision).toBe(15);
    expect(calls[1]?.body).toBe("A2");
    expect(result.current.state.saveStatus).toBe("saving");

    await act(async () => {
      calls[1]?.result.resolve({ kind: "saved", revision: 16 });
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(calls).toHaveLength(2);
    expect(result.current.state.saveStatus).toBe("saved");
    expect(result.current.state.serverRevision).toBe(16);
    expect(result.current.state.pendingSave).toBe(false);
  });

  it("debounces edits so a burst produces one request", async () => {
    const saveDraft = vi.fn<Api["saveDraft"]>(async (_page, revision) => ({
      kind: "saved",
      revision: revision + 1,
    }));
    const { result } = renderHook(() => useHarness(fakeApi(saveDraft)));

    act(() => result.current.dispatch(edit("1")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    act(() => result.current.dispatch(edit("12")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(saveDraft).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(result.current.state.saveStatus).toBe("saved");
    expect(result.current.state.serverRevision).toBe(15);
  });

  it("a stale save becomes a conflict and stops autosaving until reload", async () => {
    const saveDraft = vi.fn<Api["saveDraft"]>(async () => ({ kind: "stale", revision: 20 }));
    const { result } = renderHook(() => useHarness(fakeApi(saveDraft)));

    act(() => result.current.dispatch(edit("x")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(result.current.state.saveStatus).toBe("conflict");
    expect(result.current.state.serverRevision).toBe(14);
    expect(result.current.state.conflictRevision).toBe(20);

    act(() => result.current.dispatch(edit("y")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(result.current.state.document.blocks[0]?.props.body).toBe("y");

    act(() =>
      result.current.dispatch({ type: "loaded", document: base, revision: 20, publishIssues: [] }),
    );
    expect(result.current.state.saveStatus).toBe("saved");
    expect(result.current.state.serverRevision).toBe(20);
  });

  it("a failed save keeps local work and retry sends it again", async () => {
    const results: SaveResult[] = [{ kind: "failed" }, { kind: "saved", revision: 15 }];
    const saveDraft = vi.fn<Api["saveDraft"]>(async () => results.shift() ?? { kind: "failed" });
    const { result } = renderHook(() => useHarness(fakeApi(saveDraft)));

    act(() => result.current.dispatch(edit("kept")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(result.current.state.saveStatus).toBe("save_failed");
    expect(result.current.state.document.blocks[0]?.props.body).toBe("kept");

    await act(async () => {
      result.current.controller.retry();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(result.current.state.saveStatus).toBe("saved");
    expect(result.current.state.serverRevision).toBe(15);
  });
});
