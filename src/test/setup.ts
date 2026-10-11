import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { resetMockDb } from "@/mocks/mock-db";

// Vitest runs without globals, so RTL's automatic cleanup is not registered.
afterEach(() => {
  cleanup();
  resetMockDb();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});
