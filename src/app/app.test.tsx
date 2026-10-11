import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createEmptyFakeDb, TEST_PASSWORD, TEST_USERS } from "@/test/fake-api";
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

  it("shows the compliance KPIs the API reports", async () => {
    renderAppAt("/");

    const kpis = await screen.findByRole("region", { name: "Key figures" });
    const open = within(kpis).getByText("Open gaps").closest(".kpi");
    expect(open).toHaveTextContent("3");
    expect(open).toHaveTextContent("P1 2");
    const remediation = within(kpis).getByText("Remediation").closest(".kpi");
    expect(remediation).toHaveTextContent("1 approved");
    expect(remediation).toHaveTextContent("of 2 drafted by agent");
  });

  it("shows the analyst review view to an analyst account", async () => {
    renderAppAt("/", { signedInAs: "analyst" });

    expect(await screen.findByRole("heading", { name: "Review overview" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Compliance overview" })).not.toBeInTheDocument();
    expect(screen.getByText(TEST_USERS.analyst.full_name)).toBeInTheDocument();
  });

  it("says accuracy is not measured instead of showing made-up numbers", async () => {
    renderAppAt("/", { signedInAs: "analyst" });

    expect(await screen.findByText("Accuracy not measured yet")).toBeInTheDocument();
    expect(screen.getByText(/scripts\/evaluate\.py/)).toBeInTheDocument();
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

  it("derives the sidebar corpus summary from the documents the API returns", async () => {
    renderAppAt("/");
    expect(await screen.findByText("TESTREG · 2 regulations")).toBeInTheDocument();
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

    await user.type(screen.getByLabelText("Email"), TEST_USERS.analyst.email);
    await user.type(screen.getByLabelText("Password"), TEST_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { level: 1, name: /gaps/i })).toBeInTheDocument();
    expect(screen.getByText(TEST_USERS.analyst.full_name)).toBeInTheDocument();
    expect(window.sessionStorage.getItem("rulesight-token")).toBe("test-token-analyst");
  });

  it("shows the server's message when sign-in is refused", async () => {
    const user = userEvent.setup();
    renderAppAt("/", { signedInAs: null });

    await user.type(await screen.findByLabelText("Email"), TEST_USERS.officer.email);
    await user.type(screen.getByLabelText("Password"), "wrong-password");
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
    expect(window.sessionStorage.getItem("rulesight-token")).toBeNull();
  });

  it("restores a saved token by asking the API who it belongs to", async () => {
    const { api } = renderAppAt("/", { signedInAs: "analyst", restoreFromToken: true });

    expect(await screen.findByRole("heading", { name: "Review overview" })).toBeInTheDocument();
    expect(api.requests).toContain("GET /auth/me");
  });
});

describe("empty database", () => {
  it("explains how to get started instead of showing zeros", async () => {
    renderAppAt("/", { db: createEmptyFakeDb() });

    expect(
      await screen.findByText("Nothing to report yet. Upload documents to start."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Key figures" })).not.toBeInTheDocument();
  });

  it.each([
    ["/documents", "No documents yet. Upload an RBI regulation to start."],
    ["/changes", "No regulatory changes to compare yet"],
    ["/obligations", "No obligations extracted yet"],
    ["/controls", "No controls yet"],
    ["/gaps", "No gaps found yet"],
    ["/remediation", "No remediation actions yet"],
    ["/graph", "The knowledge graph is empty"],
    ["/runs", "No pipeline runs yet"],
    ["/audit", "No audit entries yet"],
  ])("shows a helpful empty state on %s", async (path, message) => {
    renderAppAt(path, { db: createEmptyFakeDb() });
    expect(await screen.findByText(message)).toBeInTheDocument();
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
