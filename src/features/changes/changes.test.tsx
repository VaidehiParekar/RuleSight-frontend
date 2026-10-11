import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderAppAt } from "@/test/test-utils";

describe("Changes", () => {
  it("lets the API pick the versions to compare instead of naming documents", async () => {
    const { api } = renderAppAt("/changes");

    expect(await screen.findByText("Test Regulation v2 · v2")).toBeInTheDocument();
    const compare = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => typeof url === "string" && url.endsWith("/changes/compare"));
    expect(compare?.[1]?.body).toBe("{}");
    expect(api.requests).toContain("POST /changes/compare");
  });

  it("warns that withdrawn circulars are missing from the corpus instead of inventing them", async () => {
    renderAppAt("/changes");

    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent("Only 1 is in the corpus");
    expect(note).toHaveTextContent("1 Jan 2029");
    expect(note).toHaveTextContent("RuleSight has not inferred what these circulars say");
  });

  it("never labels consolidated requirements as new", async () => {
    const user = userEvent.setup();
    renderAppAt("/changes");

    const toggle = await screen.findByRole("button", { name: /Show the 2 requirements/ });
    expect(toggle).toHaveTextContent("TCH-02");
    await user.click(toggle);
    const list = toggle.parentElement?.querySelector(".carried-list") as HTMLElement;
    expect(within(list).getAllByText("Carried over")).toHaveLength(2);
    expect(screen.getByText("Consolidated", { selector: ".status" })).toBeInTheDocument();
    expect(screen.queryByText(/^New$/i, { selector: ".status" })).not.toBeInTheDocument();
  });

  it("links the modified requirement to the new P1 gap by its id", async () => {
    renderAppAt("/changes");
    expect(await screen.findByRole("link", { name: "TG-03 · P1" })).toHaveAttribute(
      "href",
      "/gaps/gap-3",
    );
  });
});
