import { describe, expect, it } from "vitest";
import { isHttpUrl, publishIssues } from "./publishIssues";

describe("publishIssues", () => {
  it("mirrors the server rules for required fields and URLs", () => {
    const issues = publishIssues({
      blocks: [
        { id: "h", type: "hero", props: { headline: " ", button_url: "javascript:alert(1)" } },
        {
          id: "c",
          type: "cta",
          props: { headline: "Go", button_text: "", button_url: "https://ok.test" },
        },
        { id: "r", type: "rich_text", props: { body: "fine" } },
      ],
    });
    expect(issues.map((issue) => [issue.block_id, issue.field])).toEqual([
      ["h", "headline"],
      ["h", "button_url"],
      ["c", "button_text"],
    ]);
  });

  it("accepts only http and https URLs with a host", () => {
    expect(isHttpUrl("https://example.com/a?b=1")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("ftp://example.com")).toBe(false);
    expect(isHttpUrl("not a url")).toBe(false);
  });
});
