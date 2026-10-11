import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderAppAt } from "@/test/test-utils";

describe("Obligations review", () => {
  it("shows the not-applicable reason inline, not hidden in a tooltip", async () => {
    renderAppAt("/obligations?review=not_applicable");

    expect(
      await screen.findByText(/Para 68\(c\) is addressed to co-operative banks/, { selector: "p" }),
    ).toBeInTheDocument();
  });

  it("shows the verbatim source beside the structured fields, with 'Not specified' for blanks", async () => {
    renderAppAt("/obligations?select=n-07");

    const panel = await screen.findByRole("region", { name: "Source for N-07" });
    expect(within(panel).getByText("on or before June 30, 2027")).toBeInTheDocument();
    expect(within(panel).getByText("30 Jun 2027")).toBeInTheDocument();
    expect(within(panel).getAllByText("Not specified").length).toBeGreaterThan(0);
  });

  it("accepts a suggested obligation and updates its status", async () => {
    const user = userEvent.setup();
    renderAppAt("/obligations?select=n-01");

    const panel = await screen.findByRole("region", { name: "Source for N-01" });
    await user.click(within(panel).getByRole("button", { name: "Accept" }));

    expect(await screen.findByText("N-01 accepted")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Accept" })).toBeDisabled();
  });
});
