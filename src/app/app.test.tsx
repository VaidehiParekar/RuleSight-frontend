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

describe("sign-in", () => {
  it("sends a signed-out visitor to sign-in, then back to the page they asked for", async () => {
    const user = userEvent.setup();
    renderAppAt("/gaps", { signedInAs: null });

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText(/there is no password/i)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Rahul Mehta/ }));
    await user.click(screen.getByRole("button", { name: "Continue as Rahul Mehta" }));

    expect(await screen.findByRole("heading", { level: 1, name: /gaps/i })).toBeInTheDocument();
    expect(window.localStorage.getItem("rulesight-session")).toBe("rahul");
  });

  it("signs out and returns to the sign-in page", async () => {
    const user = userEvent.setup();
    renderAppAt("/");
    await screen.findByRole("heading", { name: "Compliance overview" });

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(window.localStorage.getItem("rulesight-session")).toBeNull();
  });
});

describe("search", () => {
  it("opens with Ctrl+K and jumps to a page", async () => {
    const user = userEvent.setup();
    renderAppAt("/");
    await screen.findByRole("heading", { name: "Compliance overview" });

    await user.keyboard("{Control>}k{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Search RuleSight" });
    await user.type(within(dialog).getByRole("combobox"), "audit");
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { level: 1, name: /audit/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Search RuleSight" })).not.toBeInTheDocument();
  });
});
