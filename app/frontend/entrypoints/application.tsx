import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { httpApi } from "../editor/api";
import { Editor } from "../editor/components/Editor";
import "../editor/editor.css";

const root = document.getElementById("app");
const pageId = Number(root?.dataset.pageId);

if (root && Number.isInteger(pageId)) {
  createRoot(root).render(
    <StrictMode>
      <Editor pageId={pageId} api={httpApi()} />
    </StrictMode>,
  );
}
