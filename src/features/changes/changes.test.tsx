import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderAppAt } from "@/test/test-utils";

describe("Changes", () => {
  it("warns that withdrawn circulars are missing from the corpus instead of inventing them", async () => {
    renderAppAt("/changes");

    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent("Only 1 is in the corpus");
    expect(note).toHaveTextContent("24 Apr 2025");
    expect(note).toHaveTextContent("RuleSight has not inferred what these circulars say");
  });

  it("never labels consolidated requirements as new", async () => {
    const user = userEvent.setup();
    renderAppAt("/changes");

    await user.click(await screen.findByRole("button", { name: /Show the 6 requirements/ }));
    expect(screen.getAllByText(/carried over from DCM\(NPD\) No.S488/)).toHaveLength(6);
    expect(screen.getByText("Carried over", { selector: ".status" })).toBeInTheDocument();
    expect(screen.queryByText(/^New$/i, { selector: ".status" })).not.toBeInTheDocument();
  });

  it("links the modified requirement to the new P1 gap", async () => {
    renderAppAt("/changes");
    expect(await screen.findByRole("link", { name: "NG-03 · new gap" })).toHaveAttribute(
      "href",
      "/gaps/ng-03",
    );
  });
});
