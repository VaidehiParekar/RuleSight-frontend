import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/App";
// Importing env validates VITE_* configuration at startup and fails fast if it is invalid.
import "@/lib/env";
import "@/styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root was not found in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
