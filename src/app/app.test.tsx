import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderAppAt } from "@/test/test-utils";

describe("application shell", () => {
  it("shows grouped primary navigation with the active page marked", async () => {
    renderAppAt("/");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Compliance overview" }),
    ).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: /Documents/ })).toHaveAttribute(
      "href",
      "/documents",
    );
    expect(within(nav).getByRole("link", { name: /Dashboard/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: /Audit log/ })).toHaveAttribute("href", "/audit");
  });

  it("computes the compliance KPIs from the demo data", async () => {
    renderAppAt("/");

    const kpis = await screen.findByRole("region", { name: "Key metrics" });
    expect(within(kpis).getByText("Open P1 gaps").closest(".kpi")).toHaveTextContent("3");
    expect(within(kpis).getByText("12 open gaps in total")).toBeInTheDocument();
    expect(within(kpis).getByText("Remediation").closest(".kpi")).toHaveTextContent("3 / 12");
  });

  it("switches the dashboard and the audit identity when acting as the analyst", async () => {
    const user = userEvent.setup();
    renderAppAt("/");
    await screen.findByRole("heading", { name: "Compliance overview" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Acting as" }), "rahul");

    expect(
      await screen.findByRole("heading", { name: "Analyst review queue" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Now acting as Rahul Mehta")).toBeInTheDocument();
    expect(window.localStorage.getItem("rulesight-actor")).toBe("rahul");
  });

  it("toggles the dark theme and remembers the choice", async () => {
    const user = userEvent.setup();
    renderAppAt("/");

    await user.click(await screen.findByRole("button", { name: "Switch to dark theme" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem("rulesight-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });

  it("labels mock data so it is never mistaken for live results", async () => {
    renderAppAt("/");
    expect(await screen.findByText("Mock data")).toBeInTheDocument();
  });

  it("renders a not-found page for unknown paths", async () => {
    renderAppAt("/regulations");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
