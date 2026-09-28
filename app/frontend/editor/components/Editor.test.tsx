import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Api, PagePayload, SaveResult } from "../api";
import type { Document } from "../document";
import { Editor } from "./Editor";

const document: Document = {
  blocks: [
    {
      id: "h",
      type: "hero",
      props: { headline: "Hello", subheadline: "", button_text: "", button_url: "" },
    },
    { id: "r", type: "rich_text", props: { body: "Body" } },
  ],
};

function payload(overrides: Partial<PagePayload> = {}): PagePayload {
  return {
    page: { id: 1, slug: "launch", title: "Launch" },
    draft: { document, revision: 3 },
    published: { snapshot_id: 9, number: 1, published_at: "2026-09-28T12:00:00Z" },
    publish_issues: [],
    ...overrides,
  };
}

function api(
  saveDraft: Api["saveDraft"],
  loadPage: Api["loadPage"] = async () => payload(),
  extra: Partial<Api> = {},
): Api {
  const unused = () => Promise.reject(new Error("not used"));
  return {
    loadPage,
    saveDraft,
    publish: unused,
    listSnapshots: async () => [],
    getSnapshot: unused,
    restore: unused,
    ...extra,
  };
}

const savingApi: Api["saveDraft"] = async (_page, revision) => ({
  kind: "saved",
  revision: revision + 1,
});

describe("Editor", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("shows Unsaved, Saving and Saved around an autosave", async () => {
    let resolveSave!: (value: SaveResult) => void;
    const saveDraft = vi.fn<Api["saveDraft"]>(
      () => new Promise((resolve) => (resolveSave = resolve)),
    );
    render(<Editor pageId={1} api={api(saveDraft)} debounceMs={50} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    expect(await screen.findByText("Saved")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /1\. Hero/ }));
    const headline = screen.getByLabelText(/Headline/);
    await user.clear(headline);
    await user.type(headline, "Changed");
    await user.tab();
    expect(screen.getByText("Unsaved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    expect(screen.getByText("Saving")).toBeInTheDocument();
    const hero = document.blocks[0];
    expect(saveDraft).toHaveBeenCalledWith(1, 3, {
      blocks: [{ ...hero, props: { ...hero?.props, headline: "Changed" } }, document.blocks[1]],
    });

    await act(async () => {
      resolveSave({ kind: "saved", revision: 4 });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  it("shows Conflict with a reload that replaces the document", async () => {
    const richText = document.blocks[1];
    const loads = [
      payload(),
      payload({ draft: { document: { blocks: richText ? [richText] : [] }, revision: 8 } }),
    ];
    const loadPage = vi.fn<Api["loadPage"]>(async () => loads.shift() ?? payload());
    const saveDraft = vi.fn<Api["saveDraft"]>(async () => ({ kind: "stale", revision: 8 }));
    render(<Editor pageId={1} api={api(saveDraft, loadPage)} debounceMs={50} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByText("Saved");

    await user.click(screen.getByRole("button", { name: /2\. Rich text/ }));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    expect(await screen.findByText("Conflict")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /2\. Rich text/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reload latest" }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1\. Rich text/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\d\. Hero/ })).not.toBeInTheDocument();
  });

  it("shows Save failed with a retry that keeps the local edit", async () => {
    const results: SaveResult[] = [{ kind: "failed" }, { kind: "saved", revision: 4 }];
    const saveDraft = vi.fn<Api["saveDraft"]>(async () => results.shift() ?? { kind: "failed" });
    render(<Editor pageId={1} api={api(saveDraft)} debounceMs={50} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByText("Saved");

    await user.click(screen.getByRole("button", { name: /1\. Hero/ }));
    await user.click(screen.getByRole("button", { name: "Move down" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    expect(await screen.findByText("Save failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2\. Hero/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(saveDraft).toHaveBeenCalledTimes(2);
  });

  it("counts publish issues while editing and disables Publish", async () => {
    render(
      <Editor
        pageId={1}
        api={api(async (_p, revision) => ({ kind: "saved", revision: revision + 1 }))}
        debounceMs={50}
      />,
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByText("Saved");

    await user.click(screen.getByRole("button", { name: /1\. Hero/ }));
    await user.clear(screen.getByLabelText(/Headline/));
    await user.tab();
    expect(screen.getByText("1 issue before publishing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("1 issue before publishing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("Enter in a field commits without dropping focus, so Backspace keeps editing text", async () => {
    render(<Editor pageId={1} api={api(savingApi)} debounceMs={50} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByText("Saved");

    await user.click(screen.getByRole("button", { name: /1\. Hero/ }));
    const headline = screen.getByLabelText(/Headline/);
    await user.clear(headline);
    await user.type(headline, "Typed{Enter}");
    expect(screen.getByLabelText(/Headline/)).toHaveFocus();

    await user.keyboard("{Backspace}");
    expect(screen.getByRole("button", { name: /1\. Hero/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /2\. Rich text/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Headline/)).toHaveValue("Type");
  });

  it("Backspace on a selected canvas block removes it and undo brings it back", async () => {
    render(<Editor pageId={1} api={api(savingApi)} debounceMs={50} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByText("Saved");

    const block = screen.getByText("Body").closest("[data-block-id]");
    expect(block).not.toBeNull();
    await user.click(block as HTMLElement);
    await user.keyboard("{Backspace}");
    expect(screen.queryByRole("button", { name: /\d\. Rich text/ })).not.toBeInTheDocument();

    await user.keyboard("{Meta>}z{/Meta}");
    expect(screen.getByRole("button", { name: /2\. Rich text/ })).toBeInTheDocument();
  });

  it("publishing keeps the working draft, its history and the selection", async () => {
    const publish = vi.fn<Api["publish"]>(async () => ({
      kind: "published",
      snapshot: {
        snapshot_id: 10,
        number: 2,
        published_at: "2026-09-28T13:00:00Z",
        source_revision: 4,
        current: true,
      },
    }));
    render(<Editor pageId={1} api={api(savingApi, undefined, { publish })} debounceMs={50} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByText("Saved");

    await user.click(screen.getByRole("button", { name: /1\. Hero/ }));
    await user.click(screen.getByRole("button", { name: "Move down" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    await screen.findByText("Saved");

    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(await screen.findByText("Published version 2.")).toBeInTheDocument();
    expect(publish).toHaveBeenCalledWith(1, 4);
    expect(screen.getByText("Public: version 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /2\. Hero/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move up" })).toBeInTheDocument();
  });

  it("restoring a version replaces the draft, clears history and reports the new revision", async () => {
    const restoredDocument: Document = {
      blocks: [{ id: "r", type: "rich_text", props: { body: "Old body" } }],
    };
    const summary = {
      snapshot_id: 9,
      number: 1,
      published_at: "2026-09-28T12:00:00Z",
      source_revision: 0,
      current: true,
    };
    const listSnapshots: Api["listSnapshots"] = async () => [summary];
    const getSnapshot: Api["getSnapshot"] = async () => ({
      ...summary,
      document: restoredDocument,
    });
    const restore = vi.fn<Api["restore"]>(async () => ({
      kind: "restored",
      revision: 5,
      document: restoredDocument,
    }));
    render(
      <Editor
        pageId={1}
        api={api(savingApi, undefined, { listSnapshots, getSnapshot, restore })}
        debounceMs={50}
      />,
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByText("Saved");

    await user.click(screen.getByRole("button", { name: /1\. Hero/ }));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    await screen.findByText("Saved");
    expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Versions" }));
    await user.click(await screen.findByRole("button", { name: /Version 1/ }));
    expect(await screen.findByText(/Rich text: body changed/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore into the working draft" }));

    expect(await screen.findByText(/Version 1 is now the working draft/)).toBeInTheDocument();
    expect(restore).toHaveBeenCalledWith(1, 9, 4);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /1\. Rich text/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\d\. Hero/ })).not.toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});
