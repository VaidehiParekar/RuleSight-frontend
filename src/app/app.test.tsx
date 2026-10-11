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
    const nav = screen.getByRole("navigation", { name: "Main" });
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

    const kpis = await screen.findByRole("region", { name: "Key figures" });
    const open = within(kpis).getByText("Open gaps").closest(".kpi");
    expect(open).toHaveTextContent("12");
    expect(open).toHaveTextContent("P1 3");
    const remediation = within(kpis).getByText("Remediation").closest(".kpi");
    expect(remediation).toHaveTextContent("3 approved");
    expect(remediation).toHaveTextContent("of 12 drafted by agent");
  });

  it("shows the analyst review view to an analyst account", async () => {
    renderAppAt("/", { signedInAs: "usr-rahul" });

    expect(await screen.findByRole("heading", { name: "Review overview" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Compliance overview" })).not.toBeInTheDocument();
    expect(screen.getByText("Rahul Mehta")).toBeInTheDocument();
  });

  it("switches to the dark theme and remembers the choice", async () => {
    const user = userEvent.setup();
    renderAppAt("/");

    const theme = await screen.findByRole("radiogroup", { name: "Theme" });
    await user.click(within(theme).getByRole("radio", { name: "Dark" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem("rulesight-theme")).toBe("dark");
    expect(within(theme).getByRole("radio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("labels mock data so it is never mistaken for live results", async () => {
    renderAppAt("/");
    expect(await screen.findByText("Demo fixtures")).toBeInTheDocument();
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

    await user.type(screen.getByLabelText("Email"), "rahul@rulesight.bank");
    await user.type(screen.getByLabelText("Password"), "any-demo-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { level: 1, name: /gaps/i })).toBeInTheDocument();
    expect(screen.getByText("Rahul Mehta")).toBeInTheDocument();
  });

  it("shows the server's message when sign-in is refused", async () => {
    const user = userEvent.setup();
    renderAppAt("/", { signedInAs: null });

    await user.type(await screen.findByLabelText("Email"), "nobody@rulesight.bank");
    await user.type(screen.getByLabelText("Password"), "x");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
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
