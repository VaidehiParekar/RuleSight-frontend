import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TEST_USERS } from "@/test/fake-api";
import { renderAppAt } from "@/test/test-utils";

describe("Gaps register", () => {
  it("lists gaps by risk score and filters by priority from the URL", async () => {
    renderAppAt("/gaps?priority=P1");

    const table = await screen.findByRole("table", { name: /Open compliance gaps/ });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("TG-03");
    expect(rows[0]).toHaveTextContent("From change");
    expect(screen.getByText("2 gaps")).toBeInTheDocument();
  });

  it("shows an empty state with a way back when filters match nothing", async () => {
    const user = userEvent.setup();
    renderAppAt("/gaps?priority=P3&origin=change");

    expect(await screen.findByText("No gaps match these filters.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(await screen.findByText("3 gaps")).toBeInTheDocument();
  });
});

describe("Gap trace", () => {
  it("shows the full chain from the verbatim clause to the risk formula", async () => {
    renderAppAt("/gaps/gap-1");

    expect(await screen.findByRole("heading", { level: 1, name: /TG-01/ })).toBeInTheDocument();
    expect(screen.getByText("at least once every year")).toBeInTheDocument();
    expect(screen.getAllByText("Verbatim").length).toBeGreaterThan(0);
    expect(screen.getByText("Test review control")).toBeInTheDocument();
    expect(screen.getByText("2,105")).toBeInTheDocument();
    const verdict = screen.getByRole("complementary", { name: "Verdict and actions" });
    expect(within(verdict).getByText("= 6 → P1")).toBeInTheDocument();
  });

  it("records an approval in the audit history under the acting user", async () => {
    const user = userEvent.setup();
    const { api } = renderAppAt("/gaps/gap-1");
    const name = TEST_USERS.officer.full_name;

    await user.click(await screen.findByRole("button", { name: "Approve remediation" }));
    const dialog = screen.getByRole("dialog", { name: "Approve remediation for TG-01" });
    expect(within(dialog).getByText(`${name}, Compliance Officer`)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Approve remediation" }));

    expect(await screen.findByText("Remediation for TG-01 approved")).toBeInTheDocument();
    expect(api.requests).toContain("PATCH /remediations/rem-1");
    const audit = screen.getByRole("heading", { name: /Audit history/ }).closest("li");
    expect(audit).not.toBeNull();
    expect(
      await within(audit as HTMLElement).findByText("Approved remediation"),
    ).toBeInTheDocument();
    expect(within(audit as HTMLElement).getAllByText(name).length).toBeGreaterThan(0);
  });

  it("requires a reason before a gap can be dismissed", async () => {
    const user = userEvent.setup();
    renderAppAt("/gaps/gap-2");

    await user.click(await screen.findByRole("button", { name: "Dismiss" }));
    const dialog = screen.getByRole("dialog", { name: "Dismiss TG-02" });
    expect(within(dialog).getByRole("button", { name: "Dismiss gap" })).toBeDisabled();

    await user.type(
      within(dialog).getByRole("textbox", { name: /Reason/ }),
      "Threshold already lowered",
    );
    await user.click(within(dialog).getByRole("button", { name: "Dismiss gap" }));
    expect(await screen.findByText("“Threshold already lowered”")).toBeInTheDocument();
  });

  it("says plainly when no evidence was supplied", async () => {
    renderAppAt("/gaps/gap-2");
    expect(await screen.findByText(/No evidence supplied for this control\./)).toBeInTheDocument();
  });
});

describe("Permissions", () => {
  it("lets the API refuse a write the signed-in role is not allowed to make", async () => {
    const user = userEvent.setup();
    const { api } = renderAppAt("/gaps/gap-1", { signedInAs: "auditor" });

    await user.click(await screen.findByRole("button", { name: "Approve remediation" }));
    const dialog = screen.getByRole("dialog", { name: "Approve remediation for TG-01" });
    await user.click(within(dialog).getByRole("button", { name: "Approve remediation" }));

    expect(await screen.findByText("Permission denied")).toBeInTheDocument();
    expect(api.db.remediations.find((item) => item.id === "rem-1")?.status).toBe("draft");
    expect(api.db.audit).toHaveLength(0);
  });

  it("hides mapping verification from an auditor but shows it to an analyst", async () => {
    const user = userEvent.setup();
    const auditor = renderAppAt("/controls", { signedInAs: "auditor" });
    await user.click(await screen.findByRole("button", { name: /Test review control/ }));
    expect(await screen.findByText(/Mapped obligations · 1/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    auditor.unmount();

    renderAppAt("/controls", { signedInAs: "analyst" });
    await user.click(await screen.findByRole("button", { name: /Test review control/ }));
    expect(await screen.findByRole("button", { name: "Accept" })).toBeInTheDocument();
  });
});
