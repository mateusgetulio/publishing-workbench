import type { Document } from "./document";
import type { Issue } from "./reducer";

export interface PagePayload {
  page: { id: number; slug: string; title: string };
  draft: { document: Document; revision: number };
  published: { snapshot_id: number; number: number; published_at: string } | null;
  publish_issues: Issue[];
}

export interface SnapshotSummary {
  snapshot_id: number;
  number: number;
  published_at: string;
  source_revision: number;
  current: boolean;
}

export interface SnapshotDetail extends SnapshotSummary {
  document: Document;
}

export type SaveResult =
  | { kind: "saved"; revision: number }
  | { kind: "stale"; revision: number }
  | { kind: "invalid"; issues: Issue[] }
  | { kind: "failed" };

export type PublishResult =
  | { kind: "published"; snapshot: SnapshotSummary }
  | { kind: "stale"; revision: number }
  | { kind: "invalid"; issues: Issue[] }
  | { kind: "failed" };

export type RestoreResult =
  | { kind: "restored"; revision: number; document: Document }
  | { kind: "stale"; revision: number }
  | { kind: "failed" };

export interface Api {
  loadPage(pageId: number): Promise<PagePayload>;
  saveDraft(pageId: number, expectedRevision: number, document: Document): Promise<SaveResult>;
  publish(pageId: number, expectedRevision: number): Promise<PublishResult>;
  listSnapshots(pageId: number): Promise<SnapshotSummary[]>;
  getSnapshot(pageId: number, snapshotId: number): Promise<SnapshotDetail>;
  restore(pageId: number, snapshotId: number, expectedRevision: number): Promise<RestoreResult>;
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init?.body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(url, { ...init, headers });
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function httpApi(): Api {
  return {
    async loadPage(pageId) {
      const response = await request(`/api/pages/${pageId}`);
      if (!response.ok) throw new Error(`page ${pageId} failed to load (${response.status})`);
      return json<PagePayload>(response);
    },

    async saveDraft(pageId, expectedRevision, document) {
      try {
        const response = await request(`/api/pages/${pageId}/draft`, {
          method: "PUT",
          body: JSON.stringify({ expected_revision: expectedRevision, document }),
        });
        if (response.ok) return { kind: "saved", ...(await json<{ revision: number }>(response)) };
        if (response.status === 409)
          return { kind: "stale", ...(await json<{ revision: number }>(response)) };
        if (response.status === 422)
          return { kind: "invalid", ...(await json<{ issues: Issue[] }>(response)) };
        return { kind: "failed" };
      } catch {
        return { kind: "failed" };
      }
    },

    async publish(pageId, expectedRevision) {
      try {
        const response = await request(`/api/pages/${pageId}/publish`, {
          method: "POST",
          body: JSON.stringify({ expected_revision: expectedRevision }),
        });
        if (response.status === 201)
          return { kind: "published", ...(await json<{ snapshot: SnapshotSummary }>(response)) };
        if (response.status === 409)
          return { kind: "stale", ...(await json<{ revision: number }>(response)) };
        if (response.status === 422)
          return { kind: "invalid", ...(await json<{ issues: Issue[] }>(response)) };
        return { kind: "failed" };
      } catch {
        return { kind: "failed" };
      }
    },

    async listSnapshots(pageId) {
      const response = await request(`/api/pages/${pageId}/snapshots`);
      if (!response.ok) throw new Error(`snapshots failed to load (${response.status})`);
      return (await json<{ snapshots: SnapshotSummary[] }>(response)).snapshots;
    },

    async getSnapshot(pageId, snapshotId) {
      const response = await request(`/api/pages/${pageId}/snapshots/${snapshotId}`);
      if (!response.ok)
        throw new Error(`snapshot ${snapshotId} failed to load (${response.status})`);
      return (await json<{ snapshot: SnapshotDetail }>(response)).snapshot;
    },

    async restore(pageId, snapshotId, expectedRevision) {
      try {
        const response = await request(`/api/pages/${pageId}/restore/${snapshotId}`, {
          method: "POST",
          body: JSON.stringify({ expected_revision: expectedRevision }),
        });
        if (response.ok)
          return {
            kind: "restored",
            ...(await json<{ revision: number; document: Document }>(response)),
          };
        if (response.status === 409)
          return { kind: "stale", ...(await json<{ revision: number }>(response)) };
        return { kind: "failed" };
      } catch {
        return { kind: "failed" };
      }
    },
  };
}
