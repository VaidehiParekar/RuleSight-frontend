import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderAppAt } from "@/test/test-utils";

describe("Obligations review", () => {
  it("shows the not-applicable reason inline, not hidden in a tooltip", async () => {
    renderAppAt("/obligations?review=not_applicable");

    const table = await screen.findByRole("table", { name: "Extracted obligations" });
    expect(
      within(table).getByText(/applies only to a different kind of entity/, { selector: "p" }),
    ).toBeInTheDocument();
  });

  it("shows the verbatim source beside the structured fields, with 'Not specified' for blanks", async () => {
    renderAppAt("/obligations?select=obl-1");

    const panel = await screen.findByRole("region", { name: "Source for TO-01" });
    expect(within(panel).getByText("at least once every year")).toBeInTheDocument();
    expect(within(panel).getByText("on or before the test deadline")).toBeInTheDocument();
    expect(within(panel).getAllByText("Not specified").length).toBeGreaterThan(0);
  });

  it("offers one source filter per document, named from the data", async () => {
    renderAppAt("/obligations");

    const sources = await screen.findByRole("group", { name: "Source" });
    expect(
      within(sources)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["All sources", "Test Regulation v2"]);
  });

  it("accepts a suggested obligation and updates its status", async () => {
    const user = userEvent.setup();
    const { api } = renderAppAt("/obligations?select=obl-1");

    const panel = await screen.findByRole("region", { name: "Source for TO-01" });
    await user.click(within(panel).getByRole("button", { name: "Accept" }));

    expect(await screen.findByText("TO-01 accepted")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Accept" })).toBeDisabled();
    expect(api.db.audit[0]?.entity_code).toBe("TO-01");
  });
});
