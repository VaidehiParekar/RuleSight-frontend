import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderAppAt } from "@/test/test-utils";

describe("application shell", () => {
  it("shows the scaffold banner and primary navigation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ready", database: "ok" }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderAppAt("/");

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/placeholder/i);

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Documents" })).toHaveAttribute(
      "href",
      "/documents",
    );
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    vi.restoreAllMocks();
  });

  it("renders a clearly labelled placeholder for planned features", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));

    renderAppAt("/regulations");

    expect(screen.getByRole("heading", { name: "Regulations" })).toBeInTheDocument();
    expect(screen.getByText(/planned and not implemented yet/i)).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
