import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const root = document.getElementById("app");

if (root) {
  createRoot(root).render(<StrictMode>{null}</StrictMode>);
}
