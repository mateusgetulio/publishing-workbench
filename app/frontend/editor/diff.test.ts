import { describe, expect, it } from "vitest";
import { diffDocuments, isEmptyDiff } from "./diff";
import type { Document } from "./document";

const a: Document = {
  blocks: [
    { id: "h", type: "hero", props: { headline: "One" } },
    { id: "t", type: "testimonial", props: { quote: "Q", author: "A" } },
    {
      id: "c",
      type: "cta",
      props: { headline: "Go", button_text: "Now", button_url: "https://x.test" },
    },
  ],
};

describe("diffDocuments", () => {
  it("reports an empty diff for equal documents", () => {
    expect(isEmptyDiff(diffDocuments(a, structuredClone(a)))).toBe(true);
  });

  it("reports added, removed and changed blocks and an order change, without inferring moves", () => {
    const b: Document = {
      blocks: [
        {
          id: "c",
          type: "cta",
          props: { headline: "Go", button_text: "Now", button_url: "https://x.test" },
        },
        { id: "h", type: "hero", props: { headline: "Two", subheadline: "sub" } },
        { id: "n", type: "rich_text", props: { body: "new" } },
      ],
    };
    const diff = diffDocuments(a, b);
    expect(diff.added.map((block) => block.id)).toEqual(["n"]);
    expect(diff.removed.map((block) => block.id)).toEqual(["t"]);
    expect(diff.changed).toEqual([{ block: b.blocks[1], fields: ["headline", "subheadline"] }]);
    expect(diff.orderChanged).toBe(true);
    expect(diff.order).toEqual(["c", "h", "n"]);
  });

  it("treats a missing property and an empty string as equal", () => {
    const b: Document = {
      blocks: [{ id: "h", type: "hero", props: { headline: "One", subheadline: "" } }],
    };
    const hero = a.blocks[0];
    const diff = diffDocuments({ blocks: hero ? [hero] : [] }, b);
    expect(isEmptyDiff(diff)).toBe(true);
  });
});
