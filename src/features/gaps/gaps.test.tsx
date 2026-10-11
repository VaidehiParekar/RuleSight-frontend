import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderAppAt } from "@/test/test-utils";

describe("Gaps register", () => {
  it("lists gaps by risk score and filters by priority from the URL", async () => {
    renderAppAt("/gaps?priority=P1");

    const table = await screen.findByRole("table", { name: /Open compliance gaps/ });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("NG-03");
    expect(rows[0]).toHaveTextContent("From change");
    expect(screen.getByText("3 gaps")).toBeInTheDocument();
  });

  it("shows an empty state with a way back when filters match nothing", async () => {
    const user = userEvent.setup();
    renderAppAt("/gaps?priority=P3&origin=change");

    expect(await screen.findByText("No gaps match these filters.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(await screen.findByText("12 gaps")).toBeInTheDocument();
  });
});

describe("Gap trace", () => {
  it("shows the full chain from the verbatim RBI clause to the risk formula", async () => {
    renderAppAt("/gaps/g-07");

    expect(await screen.findByRole("heading", { level: 1, name: /G-07/ })).toBeInTheDocument();
    expect(
      screen.getByText("at least once in every two years for high-risk customers"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Verbatim").length).toBeGreaterThan(0);
    expect(screen.getByText("Periodic KYC updation")).toBeInTheDocument();
    expect(screen.getByText("2,105")).toBeInTheDocument();
    const verdict = screen.getByRole("complementary", { name: "Verdict and actions" });
    expect(within(verdict).getByText("= 6 → P1")).toBeInTheDocument();
  });

  it("records an approval in the audit history under the acting user", async () => {
    const user = userEvent.setup();
    renderAppAt("/gaps/g-07");

    await user.click(await screen.findByRole("button", { name: "Approve remediation" }));
    const dialog = screen.getByRole("dialog", { name: "Approve remediation for G-07" });
    expect(within(dialog).getByText("Priya Sharma, Compliance Officer")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Approve remediation" }));

    expect(await screen.findByText("Remediation for G-07 approved")).toBeInTheDocument();
    const audit = screen.getByRole("heading", { name: /Audit history/ }).closest("li");
    expect(audit).not.toBeNull();
    expect(
      await within(audit as HTMLElement).findByText("Approved remediation"),
    ).toBeInTheDocument();
    expect(within(audit as HTMLElement).getAllByText("Priya Sharma").length).toBeGreaterThan(0);
  });

  it("requires a reason before a gap can be dismissed", async () => {
    const user = userEvent.setup();
    renderAppAt("/gaps/g-01");

    await user.click(await screen.findByRole("button", { name: "Dismiss" }));
    const dialog = screen.getByRole("dialog", { name: "Dismiss G-01" });
    expect(within(dialog).getByRole("button", { name: "Dismiss gap" })).toBeDisabled();

    await user.type(
      within(dialog).getByRole("textbox", { name: /Reason/ }),
      "Threshold already lowered",
    );
    await user.click(within(dialog).getByRole("button", { name: "Dismiss gap" }));
    expect(await screen.findByText("“Threshold already lowered”")).toBeInTheDocument();
  });

  it("says plainly when no evidence was supplied", async () => {
    renderAppAt("/gaps/g-03");
    expect(await screen.findByText(/No evidence supplied for this control\./)).toBeInTheDocument();
  });
});
