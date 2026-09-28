import type { Document } from "./document";
import { BLOCK_SCHEMAS } from "./document";
import type { Issue } from "./reducer";

export function publishIssues(document: Document): Issue[] {
  const issues: Issue[] = [];
  for (const block of document.blocks) {
    for (const field of BLOCK_SCHEMAS[block.type].fields) {
      const value = (block.props[field.name] ?? "").trim();
      if (field.required && value === "") {
        issues.push({
          block_id: block.id,
          field: field.name,
          message: `${field.label} is required`,
        });
      } else if (field.kind === "url" && value !== "" && !isHttpUrl(value)) {
        issues.push({
          block_id: block.id,
          field: field.name,
          message: `${field.label} must be an http or https URL`,
        });
      }
    }
  }
  return issues;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}
